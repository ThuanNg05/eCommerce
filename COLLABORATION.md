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
   Optional branches: `feat/api-*` (backend), `feat/ui-*` (UI); merge on `main`.
3. **No concurrent edits to the same file.** With the boundary above this only happens if
   someone crosses it.
4. **CORS** already allows the Vite dev server (`http://localhost:5173`) and the packaged
   host origin (`https://app.local`) — see `ApiBootstrap.AllowedOrigins`. The UI can
   develop live against the running API with no backend change.
5. **Build hand-off:** the UI is built with `npm run build` → `web/dist`, which the WPF
   host packages/serves. UI produces it; the host consumes it.

## Design

The admin UI must follow **`DESIGN.md`** (repo root) strictly — a minimalist light theme
(backgrounds `#f9f9f9` / `#ffffff`, single accent `#7299ED`, VND currency). That document
is binding for everything under `web/**`.

## Current contract (as of this writing)

- `GET  /api/inventory?page&pageSize&search` → `PagedResult<ProductDto>`
- `GET  /api/inventory/{id:long}` → `ProductDto`
- `POST /api/inventory` (`CreateProductRequest`) → `ProductDto`
- `PUT  /api/inventory/{id:long}` (`UpdateProductRequest`) → `ProductDto`
- `POST /api/inventory/{id:long}/adjust` (`StockAdjustmentRequest`) → `ProductDto`
- `GET  /api/invoices?page&pageSize` → `InvoiceSummaryDto[]`
- `GET  /api/invoices/{id}` → `InvoiceDto`   (id is a string business code, e.g. `INV-20260805-0001`)
- `POST /api/invoices` (`CreateInvoiceRequest`) → `InvoiceDto`
- `GET  /api/reports/low-stock` → `LowStockItemDto[]`
- `GET  /api/reports/sales-summary?from&to` → `SalesSummaryRowDto[]`

DTO definitions live in `src/WarehouseApp.Core/Dtos/**`. Consider exposing OpenAPI
(`/swagger/v1/swagger.json`) so the UI can generate its client instead of hand-mirroring.
