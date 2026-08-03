# Warehouse & Invoicing App

Inventory management + invoice issuing for a multi-station warehouse floor.
Offline-capable Windows desktop app built on the migrated stack (away from WinUI 3).

## Stack

| Layer | Choice |
|---|---|
| Desktop shell | **WPF + WebView2** (`net8.0-windows`) — hosts everything in one process |
| Front-end | **React + TypeScript** (Vite) in WebView2 — AG Grid + MUI + TanStack Query + Tailwind |
| Back-end | **ASP.NET Core (.NET 8, LTS) Minimal API**, hosted **in-process** by the WPF shell |
| Data | **EF Core 8** (Npgsql, snake_case) for CRUD + **Dapper** for report hot-paths |
| DB | **PostgreSQL (Supabase)** |

## Solution layout

```
eCommerce.sln
├─ src/
│  ├─ WarehouseApp.Core            # entities, DTOs, enums, service interfaces (no deps)
│  ├─ WarehouseApp.Infrastructure  # EF Core DbContext + configs, EF services, Dapper reports, DI
│  ├─ WarehouseApp.Api             # Minimal API endpoints + ApiBootstrap (shared composition root)
│  └─ WarehouseApp.Desktop         # WPF + WebView2 shell; boots the API in-process
├─ web/                            # React + TS + Vite front-end (builds to web/dist)
└─ supabase/migrations/            # portable SQL scripts generated from EF migrations
```

Dependency direction: `Desktop → Api → Infrastructure → Core`.

## Architecture: the two "servers" (don't conflate them)

- **Vite dev server (`:5173`)** — dev-time only, hot reload. Discarded at ship.
- **ASP.NET Core API** — the real business/DB API. In production it runs **in-process**
  inside the WPF shell (no separate `.exe`, no external port to manage). In dev it also
  runs standalone (`:5080`) so the Vite proxy has something to talk to.

### Production flow (packaged app)

```
WPF shell (App.xaml.cs)
  ├─ starts ASP.NET Core in-process on https://localhost:5443   (ApiBootstrap)
  └─ MainWindow → WebView2
        ├─ SetVirtualHostNameToFolderMapping("app.local", wwwroot)   ← React static bundle, offline
        ├─ navigates to https://app.local/index.html
        └─ React fetch() → https://localhost:5443/api/...  (CORS-allowed)  → EF/Dapper → Postgres
```

Both origins are **https** so the SPA stays on a secure origin (required by several browser
APIs) and matches the CORS allow-list. Ships as a single app, runs offline against its DB.

### Base-path alignment (important)

Three values must stay consistent:

| Setting | Value | Where |
|---|---|---|
| Vite `base` | `/` | `web/vite.config.ts` |
| WebView2 virtual host | `https://app.local/` | `WarehouseApp.Desktop/MainWindow.xaml.cs` |
| API base (prod) | `https://localhost:5443` | `web/.env.production` **and** `App.ApiBaseUrl` |

## Prerequisites

- .NET SDK **8.0** (`global.json` pins it)
- Node.js 18+ / npm
- WebView2 Runtime (ships with modern Windows; otherwise install the Evergreen runtime)
- Trust the ASP.NET Core dev cert (once): `dotnet dev-certs https --trust`

## Configure the database connection

The connection string is read from `ConnectionStrings:Default` and is **never committed**.
Prefer an environment variable or user-secrets.

Get the string from the Supabase dashboard → **Connect**. For an app, use the **pooler**
(Supavisor, session mode):

```
Host=aws-0-<region>.pooler.supabase.com;Port=5432;Database=postgres;Username=postgres.<project-ref>;Password=<db-password>;SSL Mode=Require;Trust Server Certificate=true
```

Set it (PowerShell, current session):

```bash
$env:ConnectionStrings__Default = "Host=aws-0-<region>.pooler.supabase.com;Port=5432;Database=postgres;Username=postgres.<project-ref>;Password=<db-password>;SSL Mode=Require;Trust Server Certificate=true"
```

Or via user-secrets (persistent, per-user, for the API project):

```bash
dotnet user-secrets --project src/WarehouseApp.Api set "ConnectionStrings:Default" "<connection-string>"
```

> The desktop app reads the same `ConnectionStrings__Default` environment variable.

## Apply the database schema

The schema is code-first (EF Core migrations). A portable, idempotent SQL script is
generated at [`supabase/migrations/0001_initial_create.sql`](supabase/migrations/0001_initial_create.sql).

**Option A — Supabase SQL editor (no local DB password needed):**
paste the contents of `0001_initial_create.sql` into the project's SQL editor and run it.

**Option B — EF applies it directly** (needs the connection string set):

```bash
dotnet ef database update -p src/WarehouseApp.Infrastructure -s src/WarehouseApp.Api
```

**Regenerate the SQL script after model changes:**

```bash
dotnet ef migrations add <Name> -p src/WarehouseApp.Infrastructure -s src/WarehouseApp.Api -o Data/Migrations
dotnet ef migrations script -p src/WarehouseApp.Infrastructure -s src/WarehouseApp.Api -o supabase/migrations/<n>_<name>.sql --idempotent
```

## Run

### Dev (hot reload)

Two terminals:

```bash
# 1) standalone API on http://localhost:5080
dotnet run --project src/WarehouseApp.Api

# 2) Vite dev server on http://localhost:5173 (proxies /api → :5080)
cd web && npm install && npm run dev
```

Open http://localhost:5173.

### Packaged desktop app

```bash
cd web && npm run build          # produces web/dist
dotnet build src/WarehouseApp.Desktop   # copies web/dist → bin/.../wwwroot
dotnet run --project src/WarehouseApp.Desktop
```

The WPF window opens, starts the API in-process, and loads the React bundle from `app.local`.

## API surface

| Method | Route | Purpose |
|---|---|---|
| GET | `/health` | liveness |
| GET | `/api/inventory?page&pageSize&search` | list products (paged, ILIKE search) |
| GET | `/api/inventory/{id}` | get product |
| POST | `/api/inventory` | create product |
| PUT | `/api/inventory/{id}` | update product |
| POST | `/api/inventory/{id}/adjust` | stock adjustment (concurrency-safe) |
| GET | `/api/invoices?page&pageSize` | list invoices |
| GET | `/api/invoices/{id}` | get invoice + lines |
| POST | `/api/invoices` | create draft invoice (decrements stock in a transaction) |
| POST | `/api/invoices/{id}/issue` | issue a draft |
| GET | `/api/reports/low-stock` | Dapper: items at/under reorder level |
| GET | `/api/reports/sales-summary?from&to` | Dapper: issued-invoice totals by day |

Domain errors map to ProblemDetails: 400 (validation), 404 (not found), 409 (concurrency).

## Concurrency

Stock is guarded by optimistic concurrency via the Postgres `xmin` system column
(mapped through a `uint Version` row-version property — no extra column). Competing
edits from another station surface as HTTP 409.

## Notes / open items

- **Retry-on-failure is off** on the DbContext. If you enable `EnableRetryOnFailure`,
  wrap the invoice-creation transaction in `CreateExecutionStrategy().ExecuteAsync(...)`
  and keep it idempotent (see the comment in `InvoiceService.CreateAsync`).
- **.NET 8 LTS ends ~Nov 2026.** Plan a low-cost bump to **.NET 10 (LTS)** — mostly
  `TargetFramework` + package version updates (the .NET 10 SDK is already installed here).
- **Hardware integration** (thermal printer / barcode scanner / scale): implement in the
  WPF Win32 host and expose to React through the back-end. Not yet scaffolded.
- **Production HTTPS cert:** dev uses the ASP.NET Core dev cert; a packaged installer
  should provision a trusted localhost cert for the in-process host.
