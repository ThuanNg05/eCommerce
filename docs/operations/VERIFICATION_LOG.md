# Verification log

## 2026-08-19

| Parse | Evidence | Result |
|---|---|---|
| Unit/security/authorization/redaction/pricing | `dotnet test tests/WarehouseApp.Security.Tests/WarehouseApp.Security.Tests.csproj -c Release` | 113/113 passed |
| Migration consistency | `scripts/Test-Migrations.ps1` | 19 migrations passed |
| Frontend production build | `npm.cmd run build` | Passed; existing Vite large-chunk warning remains |
| E2E discovery | `npm.cmd run test:e2e -- --list` | 1/1 test discovered |
| Linked Security Advisor | `supabase db advisors --linked --type security` | No issues found |
| Linked Performance Advisor | `supabase db advisors --linked --type performance` | No issues found |
| Linked migration history | `supabase migration list --linked` | Local/remote versions matched in the successful read-only check |
| PostgreSQL integration tests (local Supabase) | `scripts/Test-PostgresIntegration.ps1` with explicit local insecure mode | 2/2 passed; migrations through `20260818093833` applied |
| PostgreSQL integration tests (staging) | `scripts/Test-PostgresIntegration.ps1` with dedicated `warehouse_integration` role, `VerifyFull` and Supabase CA | 2/2 passed |
| Backup and restore drill | `docs/operations/RESTORE_DRILL_2026-08-19.md` | Logical dump created, SHA-256 recorded, restored to isolated local database, row-count probe passed |
| E2E staging smoke | `npm.cmd run test:e2e` against `https://e-commerce-staging-eta.vercel.app/` | 1/1 passed; repeated 3/3 passed after waiting for authenticated route readiness |
| Staging readiness and login | `GET /health/ready` and `POST /api/auth/login` on `warehouse-api-24by.onrender.com` | 200/200; E2E account authenticated successfully |
| Staging HTTP baseline | 5 parallel requests per endpoint for `/api/auth/me`, inventory, invoices and low-stock report | All responses 200; observed p95: 1724 ms, 1924 ms, 891 ms and 1169 ms respectively; not yet within the CRUD <500 ms target |
| Staging query-plan review | Read-only `EXPLAIN (ANALYZE, BUFFERS)` on inventory page/count/category queries | `product_sku_key` and `product_category_pkey` used; execution times 0.144 ms, 0.521 ms and 0.222 ms; latency gap is outside PostgreSQL execution, not a missing index |
| Staging sequential latency retest | 10 sequential requests after warm-up for inventory, invoices and low-stock | All responses 200; p95 1308 ms, 610 ms and 752 ms respectively; compression change is built locally but not yet deployed to staging |
| Desktop publish smoke | `dotnet publish src/WarehouseApp.Desktop/WarehouseApp.Desktop.csproj -c Release --no-restore --no-self-contained --output artifacts/desktop-smoke` | Passed; executable and 11 React bundle files including `wwwroot/index.html` present. Fixed publish target so `--no-build` CI publish copies `web/dist`. |
| GitHub branch/environment protection | GitHub API for `main` protection and `staging` environment | `main` requires CI checks and blocks force-push/delete; staging secrets are restricted to protected branches. |
| Release PR readiness | GitHub PR #36 and #37 | Both PRs are mergeable, marked ready for review, and all required CI checks pass; Render deployment remains pending merge to protected `main`. |
| Staging session revocation | Two staging logins, `/api/auth/me`, logout and `/api/auth/me` | Passed: login 200/200; first token after second login 401; second token 200; logout 204; second token after logout 401. |
| Staging response compression | 10 sequential and 5 concurrent authenticated requests per endpoint after Render deploy `2ba5999ea1434d4b6ba00b4ad3f4dfe58199e0ef` | All responses 200 and `Content-Encoding: br`; sequential p95 inventory 1088 ms, invoices 666 ms, low-stock 936 ms; CRUD target `<500 ms` remains unmet. |
| Staging frontend API configuration | `POST /api/auth/login` against `https://e-commerce-staging-eta.vercel.app/` | Still returns 405; Vercel deployment has not exposed `VITE_API_BASE=https://warehouse-api-24by.onrender.com`, so frontend E2E cannot be revalidated. |
| Vercel staging environment | Production deployment `dpl_4dHxdtg3KLySwv4n4tTMkbkB7o4V`, deployed bundle inspection | `VITE_API_BASE` is effective; bundle contains `https://warehouse-api-24by.onrender.com`. The Vercel-origin `/api` route returning 405 is expected because the frontend now calls Render directly. |
| Staging E2E smoke retest | `npm.cmd run test:e2e -- --workers=1 --repeat-each=3` | 3/3 passed (100%). A parallel 3-worker run is intentionally not a valid gate for the shared single-device E2E account and produced session-race 500 responses. |
| Full solution test gate | `dotnet test eCommerce.sln -c Release --no-restore --nologo` | 113/113 passed; build and test gate passed. |
| Migration consistency retest | `scripts/Test-Migrations.ps1` | 19 migration files passed. |
| GitHub staging verification workflow | Run `32256339456` after PR #38 merge | PostgreSQL staging integration passed; staging Playwright smoke passed; both CI jobs completed successfully. |
| GitHub staging verification repeat | Run `32256901003` | PostgreSQL staging integration and Playwright smoke both passed again; 2/2 jobs successful. |

## Not yet verified

- Supabase staging migration approval workflow.
- Backup policy, retention, RPO/RTO and owner approval.
- Load/concurrency target attainment and alert delivery.
