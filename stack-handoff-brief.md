# Session Handoff Brief — Warehouse & Invoicing App (Stack Migration)

> Purpose: carry full context into a new session. Paste this at the start of the next chat.

## Project
Warehouse (inventory) management + invoice issuing app. **Migrating away from WinUI 3** (uncertain future, shrinking 3rd-party control ecosystem → poor UI/UX). Windows desktop, offline-capable, multi-station warehouse floor. Team is experienced (no "avoid learning new tech" constraint).

## Final Stack (decided)

| Layer | Choice | Notes |
|---|---|---|
| **Front-end** | React + TypeScript in **WebView2** | Best UI/UX ceiling; web ecosystem wins on data grids/forms |
| **UI libs** | **AG Grid** (data grid) + MUI or Ant Design (forms/dashboard) + TanStack Query (state/cache) + Tailwind | AG Grid handles 100k+ inventory rows, inline edit, export |
| **Desktop shell** | **WPF + WebView2** (primary) or **Photino.NET** (lightweight alt) | WPF chosen for smoother Win32 device integration (thermal printer, barcode scanner, scale) |
| **Back-end** | **ASP.NET Core, .NET 8 (LTS)**, Minimal API, **in-process** | Top managed throughput, async multi-core; no Rust needed |
| **Data** | **EF Core 10** (compiled queries, CRUD) + **Dapper** (report hot-paths) | Bulk/report aggregation via Dapper |
| **DB** | PostgreSQL / SQL Server (multi-station) or SQLite (single machine) | Row-lock on stock quantity for concurrency |
| **Perf** | **ReadyToRun** (NOT Native AOT — EF Core AOT still limited on .NET 8), `System.Threading.Channels` for print/invoice queue, full-core, tuned ThreadPool min-threads | |

## Key Architecture Decisions

1. **React needs NO runtime server.** Build to static (`npm run build` → `dist/`), embed in app, load via WebView2 `SetVirtualHostNameToFolderMapping` (e.g. `https://app.local/`). Vite dev server (`:5173`) is dev-only (hot reload), discarded at ship.
2. **Two distinct "servers" — don't conflate:**
   - Vite dev server = dev-time HMR only.
   - ASP.NET Core = business/DB API, **in-process**. React calls it via `fetch`. With Photino, can skip HTTP entirely (direct C# bridge).
3. **Production flow:** `WPF/Photino shell → WebView2 loads React static from app.local/ → fetch() → ASP.NET Core in-process → DB/printer`. Ships as single installer, runs offline.
4. **In-process API** removes HTTP overhead; localhost API kept as an option only if scaling to multi-machine client-server later.

## Why NOT the alternatives
- **Stay WinUI 3 / WPF-only / Avalonia:** XAML data-grid maturity can't match AG Grid for this workload. (Avalonia was the fallback if team wanted to avoid JS — not applicable here.)
- **Tauri (Rust):** faster raw throughput but forces a Rust stack, discards the team's C# investment for no meaningful gain at this scale.
- **Blazor Hybrid:** all-C# but MudBlazor grid weaker than React/AG Grid.

## Open Items / Constraints
- The solution targets **.NET 10 LTS**. Update ASP.NET Core, EF Core and Npgsql patch versions together after regression testing.
- `vite.config.ts` `base` must match the WebView2 virtual host path.
- Use `https` scheme in `SetVirtualHostNameToFolderMapping` to satisfy browser APIs requiring a secure origin.
- Confirm hardware integration path: thermal printer / barcode scanner / scale → via WPF Win32 host, exposed to React through the back-end.

## Next-Session Starting Point (requested but not yet built)
- Back-end **.NET 10 skeleton**: layered DI, Minimal API endpoints (inventory + invoicing), EF Core + Dapper wiring.
- **WebView2 config** mapping React static bundle + matching `vite.config.ts`.
- Directory skeleton + WebView2 ↔ ASP.NET Core in-process wiring + DI layering.
