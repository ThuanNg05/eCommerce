# Agent Collaboration Boundary

This repo is worked on by **two agents in parallel**. To avoid collisions, ownership is
split by directory, and the two sides meet at exactly one seam: the HTTP API contract.

## Ownership

| Owner | Paths | Responsibility |
|-------|-------|----------------|
| **Claude Code — backend** | `src/WarehouseApp.Core/**`, `src/WarehouseApp.Infrastructure/**`, `src/WarehouseApp.Api/**`, `src/WarehouseApp.Desktop/**`, `supabase/migrations/**` | All C#/.NET, EF Core model, services, HTTP endpoints, database schema, WPF host |
| **Antigravity — UI** | `web/**` | React app, components, styling, client state, the TypeScript API-client types |

Rule of thumb: **C# / SQL → Claude Code. `web/` → Antigravity.**

## The seam: the HTTP API contract

The only shared surface is the request/response JSON of the API under `/api/**`.

- Backend source of truth: endpoints in `src/WarehouseApp.Api/Endpoints/**` and DTOs in
  `src/WarehouseApp.Core/Dtos/**`.
- UI mirror: `web/src/api/**` (TypeScript interfaces that match the DTOs).

**Golden rule — the contract flows backend → UI.** The shape is defined on the backend
first; the UI updates `web/src/api/*` to match. The UI never expects the backend to
conform to hand-written TypeScript.

If the UI needs a new field, endpoint, or behavior, that is a **request to the backend**,
not a UI-side C# edit. If the backend changes a shape, it is announced in the commit
message and the UI updates its types.

## Rules

1. **Never edit across the boundary.** Backend agent does not touch `web/**`; UI agent
   does not touch `src/**` or `supabase/**`.
2. **Commit before hand-off; pull before starting.** Git is the communication channel.
   Use short-lived branches `feat/api-*` (backend) / `feat/ui-*` (UI) and **merge them
   back into `main` as soon as the task is done** — see **Branch workflow** below.
3. **No concurrent edits to the same file.** With the boundary above this only happens if
   someone crosses it.
4. **CORS** already allows the Vite dev server (`http://localhost:5173`) and the packaged
   host origin (`https://app.local`) — see `ApiBootstrap.AllowedOrigins`. The UI can
   develop live against the running API with no backend change.
5. **Build hand-off:** the UI is built with `npm run build` → `web/dist`, which the WPF
   host packages/serves. UI produces it; the host consumes it.

## Branch workflow (mandatory)

`main` is the **single integration branch** and the only branch anyone runs, demos, or
reviews from. Feature branches are short-lived and **must be merged back into `main` the
moment the task is done** — a finished branch left unmerged is treated as **not delivered**:
the other agent and the running app never see it, and it silently "reverts" features
whenever a different branch is checked out.

1. **Branch from the latest `main`** — never from another feature branch:
   `git checkout main && git pull --ff-only && git checkout -b feat/ui-<task>`
2. **Finish = merge back immediately**, then delete the branch:
   ```
   git checkout main
   git merge --no-ff feat/ui-<task>
   git branch -d feat/ui-<task>
   ```
3. **One unmerged branch per agent at a time.** Do not stack several open `feat/*`
   branches — each becomes invisible work. Merge (or discard) the current one before
   starting the next.
4. **Run / demo / screenshot only from `main`.** If a feature seems to "disappear" in the
   UI, suspect an unmerged branch first: check `git branch` and `git log --oneline --all`.
5. **Heads-up on gitignored local files.** `src/WarehouseApp.Api/appsettings.Development.json`
   (the dev DB connection string) is gitignored and lives only in your working tree; a
   merge that removes it from tracking can delete it on checkout. Keep that connection
   string backed up outside the repo and re-add it if it goes missing.

## Design

The admin UI must follow **`DESIGN.md`** (repo root) strictly — a minimalist light theme
(backgrounds `#f9f9f9` / `#ffffff`, single accent `#7299ED`, VND currency). That document
is binding for everything under `web/**`.

## Current contract (as of this writing)

- `POST /api/auth/login` (`LoginRequest`) → `LoginResponse`
  - rate limited to 10 requests/minute/IP; account locks for 15 minutes after 5 failed attempts
  - response adds `mustChangePassword`
- `POST /api/auth/change-password` (`ChangePasswordRequest`) → `LoginResponse`
  - body: `{ currentPassword, newPassword }`
  - revokes the old session and returns a replacement access/refresh token pair
- `GET /api/auth/me` → `CurrentUserResponse` (adds `mustChangePassword`)
- All business endpoints reject a JWT whose `must_change_password` claim is `true`.
- `AccountDto` adds `mustChangePassword` and `lockedUntil`; admin-created/reset passwords are temporary.
- `GET  /api/inventory?page&pageSize&search` → `PagedResult<ProductDto>`
- `GET  /api/inventory/{id:long}` → `ProductDto`
- `POST /api/inventory` (`CreateProductRequest`) → `ProductDto`
- `PUT  /api/inventory/{id:long}` (`UpdateProductRequest`) → `ProductDto`
- `POST /api/inventory/{id:long}/adjust` (`StockAdjustmentRequest`) → `ProductDto`
- `POST /api/inventory-transactions/backboard-conversions` (`CreateBackboardConversionRequest`) → `InventoryTransactionDto`
  - body: `{ backboardId, frameId, quantity, note? }`
  - effect: issue `quantity` full backboards and receive each configured frame-detail quantity multiplied by `quantity`
- `GET  /api/invoices?page&pageSize` → `InvoiceSummaryDto[]`
- `GET  /api/invoices/{id}` → `InvoiceDto`   (id is a string business code, e.g. `INV-20260805-0001`)
- `POST /api/invoices` (`CreateInvoiceRequest`) → `InvoiceDto`
- `GET  /api/reports/low-stock` → `LowStockItemDto[]`
- `GET  /api/reports/sales-summary?from&to` → `SalesSummaryRowDto[]`

DTO definitions live in `src/WarehouseApp.Core/Dtos/**`. Consider exposing OpenAPI
(`/swagger/v1/swagger.json`) so the UI can generate its client instead of hand-mirroring.
