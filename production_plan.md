# Kế hoạch đưa Warehouse & Invoicing App lên Production

> Cập nhật: 09/08/2026
> Phạm vi: WPF + WebView2, React/Vite, ASP.NET Core, PostgreSQL trên Supabase
> Trạng thái: nghiệp vụ gần hoàn thiện, **chưa đủ điều kiện phát hành production**

## 1. Mục tiêu production

Ứng dụng được xem là production-ready khi đáp ứng đồng thời:

- Các luồng nhập/xuất kho, rập ván, hóa đơn, giá, báo cáo và quản trị tài khoản hoạt động đúng trong môi trường staging.
- Không còn lỗi bảo mật mức `ERROR`/`WARN` chưa được xử lý hoặc chấp nhận rủi ro bằng văn bản.
- Có CI tự động build, test, audit dependency và kiểm tra migration cho mỗi thay đổi.
- Có bản cài Windows có chữ ký, cấu hình an toàn, cơ chế nâng cấp và rollback.
- Có log, health check, cảnh báo, backup và quy trình phục hồi đã được diễn tập.
- Có người chịu trách nhiệm vận hành và quy trình xử lý sự cố.

### Nhận định đúng và điểm cần điều chỉnh

| Nhận định | Đánh giá | Giải thích |
|---|---|---|
| Dự án đã gần đạt tối đa về nghiệp vụ | Đúng | Các workflow chính đã có và Authentication vừa được harden. |
| Hoàn thiện nghiệp vụ đồng nghĩa sẵn sàng production | Chưa đúng | Production còn yêu cầu security, reliability, deployment, observability và disaster recovery. |
| Ứng dụng chạy offline hoàn toàn | Chưa đúng | React bundle chạy local trong WebView2, nhưng nghiệp vụ vẫn cần mạng để kết nối PostgreSQL trên Supabase. Muốn offline thật sự phải có local database/cache và cơ chế đồng bộ xung đột. |

## 2. Baseline đã xác minh

| Hạng mục | Trạng thái ngày 09/08/2026 | Bằng chứng |
|---|---|---|
| Git | Đạt | `main` đồng bộ `origin/main`, Authentication ở commit `ce222a0`. |
| Backend build | Đạt | Release build: 0 warning, 0 error. |
| Security unit tests | Đạt bước đầu | 9/9 test pass. |
| Frontend build | Đạt có cảnh báo | Vite build thành công; main chunk khoảng 3.24 MB, cần code splitting. |
| NuGet vulnerability audit | Đạt | Không phát hiện package dễ tổn thương từ nguồn hiện tại. |
| npm production audit | Đạt | 0 vulnerability ở mọi mức. |
| Authentication | Đạt baseline | JWT ngắn hạn, DB session, một thiết bị/tài khoản, lockout, rate limit, bắt buộc đổi mật khẩu. |
| Supabase migrations | Đạt | 10 migration local/remote khớp nhau. |
| Supabase performance advisor | Đạt | Không có issue tại thời điểm kiểm tra. |
| Supabase security advisor | Chưa đạt | Còn 7 cảnh báo `function_search_path_mutable`. |
| CI/CD | Chưa có | Repository chưa có `.github/workflows`. |
| Observability | Chưa đủ | Chưa có structured logging, metrics, tracing hoặc error monitoring tập trung. |
| Test coverage nghiệp vụ | Chưa đủ | Chưa có integration/E2E tests cho kho, hóa đơn, pricing và concurrency. |
| Đóng gói Windows | Chưa đủ | Chưa có installer, code signing, auto-update và production certificate lifecycle. |

## 3. Quyết định kiến trúc phải chốt trước pilot (P0)

Đã chốt [ADR-001](docs/adr/ADR-001-in-process-api-for-three-device-pilot.md): dùng API in-process cho pilot tối đa ba thiết bị do doanh nghiệp quản lý; đánh giá lại khi vượt năm thiết bị, triển khai nhiều địa điểm hoặc cần SLA/observability tập trung.

| Mô hình | Ưu điểm | Rủi ro/chi phí | Khuyến nghị |
|---|---|---|---|
| A. API in-process trên từng máy | Giữ nguyên kiến trúc, triển khai nhanh | Database credential tồn tại trên máy trạm; khó rotate, giám sát và giới hạn network; JWT signing key khác nhau theo máy | Chỉ dùng cho pilot trên máy do doanh nghiệp quản lý chặt. |
| B. API trung tâm, desktop chỉ gọi HTTPS API | Không phát credential DB xuống client; logging, rate limit, key rotation và deployment tập trung | Cần host API, domain/TLS, CI/CD và giám sát server | **Khuyến nghị cho production nhiều thiết bị.** |

ADR đã xác định trust boundary, giới hạn pilot, cách ly Data API, least-privilege database role, startup fail-closed và điều kiện chuyển sang API trung tâm.

## 4. Roadmap ưu tiên

### P0 — Điều kiện bắt buộc trước pilot production

#### 4.1. Database và Supabase security

- [x] Kiểm tra và xóa bằng migration 7 function của schema dự án cũ; các function này không có caller/dependency và tham chiếu các bảng plural đã loại bỏ:
  - `calculate_product_base_price`
  - `delete_invoice_and_revert`
  - `process_frame_to_planks`
  - `increment_inventory`
  - `update_all_products_on_price_change`
  - `create_full_invoice`
  - `get_annual_report`
- [x] Đối chiếu source, live catalog, trigger/dependency và chạy thử `DROP ... RESTRICT` trong transaction có `ROLLBACK` trước khi tạo migration.
- [x] Kiểm tra `SECURITY DEFINER` và quyền `EXECUTE`: 7 function cũ là `SECURITY INVOKER` nhưng từng mở cho `PUBLIC`, `anon`, `authenticated`; việc xóa loại bỏ luôn RPC dư thừa. Giữ `fn_audit_log` vì 4 trigger đang sử dụng; function này là `SECURITY DEFINER`, có search path cố định và đã thu hồi quyền gọi công khai.
- [x] Lập inventory live cho toàn bộ table/view/function trong exposed schema: 20/20 table bật RLS và có backend policy; không có view; chỉ giữ `fn_audit_log`; owner và `GRANT` được ghi tại `docs/security/DATABASE_ACCESS_INVENTORY.md`.
- [x] Chốt mô hình backend-only và revoke toàn bộ table/sequence/function grant của `anon`/`authenticated`, gồm default privileges tương lai của role `postgres`.
- [x] Tạo group role `warehouse_app` dạng `NOLOGIN`, không có quyền elevated, với CRUD theo nhu cầu backend và không có quyền tạo object.
- [ ] Tạo login/password riêng cho từng thiết bị, grant membership `warehouse_app`, chuyển connection string khỏi role `postgres` và diễn tập revoke một thiết bị.
- [ ] Dùng TLS validation đầy đủ cho kết nối production; loại bỏ cấu hình tin cậy chứng thư một cách mù quáng.
- [x] Chạy lại `supabase db advisors --linked --type security`; Security Advisor và Performance Advisor không còn issue.

Lưu ý: từ 30/10/2026, bảng mới không còn tự động được expose qua Data/GraphQL API; migration phải khai báo `GRANT` có chủ đích nếu ứng dụng thực sự dùng Data API. Tham khảo [Supabase breaking change](https://supabase.com/changelog/45329-breaking-change-tables-not-exposed-to-data-and-graphql-api-automatically) và [RLS guide](https://supabase.com/docs/guides/database/postgres/row-level-security).

#### 4.2. Secret, certificate và startup safety

- [x] Không hard-code connection string, JWT key, Supabase secret hoặc password vào Git/bundle React.
- [ ] Chọn cơ chế phân phối và rotate secret:
  - Mô hình API trung tâm: secret manager/environment của server.
  - Mô hình in-process: Windows Credential Manager/DPAPI và giới hạn ACL theo user/machine.
- [ ] Lập quy trình rotate DB password/JWT signing key có thời gian chuyển tiếp và thu hồi session.
- [ ] Cấp certificate localhost tin cậy cho bản đóng gói hoặc chuyển sang API trung tâm với certificate công khai; không phụ thuộc development certificate.
- [x] Sửa startup theo hướng fail-closed: chỉ mở UI sau khi database kết nối được và schema version khớp application build.
- [x] Hiển thị màn hình lỗi có `correlationId`, lựa chọn thử lại/thoát và hướng dẫn hỗ trợ; không hiển thị stack trace/secret.
- [x] Tách health checks:
  - Liveness: process còn sống.
  - Readiness: database kết nối được, migration/schema đúng, dịch vụ bắt buộc sẵn sàng.

#### 4.3. Staging, backup và disaster recovery

- [ ] Tạo Supabase project staging riêng, không dùng dữ liệu production thật nếu chưa masking.
- [ ] Mọi migration phải chạy ở staging trước production và có bước manual approval.
- [ ] Chọn mục tiêu ban đầu để chủ dự án phê duyệt:
  - RPO: tối đa 24 giờ; giảm xuống 15 phút nếu bật PITR.
  - RTO: tối đa 4 giờ.
- [ ] Xác nhận gói Supabase và chính sách backup; Free Plan cần logical dump ngoài hệ thống định kỳ.
- [ ] Thực hiện ít nhất một lần restore vào môi trường tách biệt và lưu biên bản: thời gian, checksum, số bản ghi, lỗi gặp phải.
- [ ] Với file trong Supabase Storage sau này, backup riêng vì database backup chỉ chứa metadata, không khôi phục nội dung object.

Tham khảo [Supabase Production Checklist](https://supabase.com/docs/guides/deployment/going-into-prod) và [Database Backups](https://supabase.com/docs/guides/platform/backups).

### P1 — Quality gate và CI/CD

#### 4.4. Test pyramid theo rủi ro nghiệp vụ

- [ ] Unit tests:
  - Quy đổi rập ván hậu MDF/HP sang số lượng ván hậu nhỏ.
  - Validation không cho xuất lớn hơn tồn kho.
  - Tính giá, làm tròn tiền và cấu hình giá.
  - Password policy, lockout và session revocation.
- [ ] Integration tests với PostgreSQL tách biệt:
  - Tạo/hủy hóa đơn và hoàn tồn kho phải atomic.
  - Hai giao dịch cạnh tranh không làm âm kho hoặc ghi đè `xmin`.
  - Nhập/xuất/chuyển đổi rập tạo đúng transaction và audit log.
  - Migration chạy được từ database trắng và từ phiên bản production gần nhất.
- [ ] Authorization tests cho mọi endpoint: anonymous, Staff, Admin, tài khoản bị khóa và `must_change_password`.
- [ ] Frontend component tests cho form transaction, đổi loại phiếu reset quantity về `1`, cảnh báo tồn thấp và xử lý lỗi API.
- [ ] E2E smoke tests cho login → đổi mật khẩu → nhập kho → xuất kho → hóa đơn → báo cáo → logout.
- [ ] Không đặt mục tiêu coverage hình thức; trước hết yêu cầu 100% luồng tài chính/tồn kho quan trọng có test happy path và failure path.

#### 4.5. GitHub Actions

- [ ] Tạo workflow cho pull request và `main`:
  1. `dotnet restore` + Release build.
  2. `dotnet test` và xuất test report/coverage.
  3. `npm ci` + TypeScript/Vite build.
  4. NuGet/npm vulnerability audit.
  5. Kiểm tra migration naming/history và SQL lint.
  6. Secret scanning và dependency review.
- [ ] Bật branch protection cho `main`: CI bắt buộc pass, không force-push, ít nhất một approval khi có nhiều thành viên.
- [ ] Build artifact phải tái lập từ commit/tag; không đóng gói trực tiếp từ working tree cá nhân.
- [ ] Database deployment tách khỏi application deployment, có staging check và manual approval cho production.

### P2 — Observability, performance và UX chịu lỗi

#### 4.6. Logging và monitoring

- [ ] Structured JSON logging với timestamp UTC, level, route, duration, account ID đã hạn chế, device/app version và `correlationId`.
- [ ] Redact password, JWT, refresh token, connection string, customer phone/address và nội dung nhạy cảm.
- [ ] Có rolling local log để hỗ trợ offline và một kênh tập trung cho lỗi production khi có mạng.
- [ ] Ghi metrics tối thiểu: request count, error rate, p50/p95 latency, login failure/lockout, DB connection failure, transaction rollback.
- [ ] Cảnh báo khi error rate vượt 1% trong 5 phút, readiness fail liên tục hoặc database gần chạm giới hạn tài nguyên. Các ngưỡng phải hiệu chỉnh sau pilot.
- [ ] Viết runbook cho: không kết nối DB, migration lệch, certificate hết hạn, tài khoản admin bị khóa, tồn kho sai lệch và rollback release.

#### 4.7. Performance và resilience

- [ ] Đo baseline trên staging bằng dữ liệu gần kích thước thực tế; không tối ưu dựa trên cảm giác.
- [ ] Mục tiêu ban đầu: CRUD p95 < 500 ms, báo cáo p95 < 3 giây trong điều kiện mạng doanh nghiệp bình thường.
- [ ] Load/concurrency test các điểm nóng: lập hóa đơn, điều chỉnh tồn kho, xuất rập ván và báo cáo năm.
- [ ] Kiểm tra index bằng query plan và `pg_stat_statements`; giữ Supabase Performance Advisor không có issue nghiêm trọng.
- [ ] Chỉ bật retry transient sau khi thao tác ghi đã idempotent; không retry mù transaction tạo hóa đơn/xuất kho.
- [ ] Giới hạn page size, timeout, request body và report date range để tránh truy vấn quá lớn.
- [ ] Chia nhỏ frontend bundle bằng route-level dynamic import/manual chunks; đặt budget cho initial JS thay vì chỉ tắt cảnh báo Vite.
- [ ] Có Error Boundary, trạng thái mất mạng, retry có kiểm soát và chống double-submit trên các form ghi dữ liệu.

### P3 — Packaging, vận hành và vòng đời nền tảng

#### 4.8. Windows release

- [ ] Chọn MSIX hoặc signed installer; đóng gói WebView2 Runtime strategy, React bundle và production config.
- [ ] Ký số executable/installer và kiểm tra SmartScreen trên máy sạch.
- [ ] Thiết lập version theo SemVer, release notes, stable/pilot channel và cơ chế auto-update có rollback.
- [ ] Test clean install, upgrade giữ dữ liệu/cấu hình, uninstall và cài lại trên các Windows version được hỗ trợ.
- [ ] Xác minh user tiêu chuẩn không cần quyền Administrator để vận hành hằng ngày.

#### 4.9. Nâng cấp .NET và dependency lifecycle

- [ ] Nâng từ .NET 8 lên .NET 10 LTS trước 10/11/2026; .NET 8 đang ở maintenance và hết hỗ trợ vào ngày này.
- [ ] Nâng đồng bộ ASP.NET Core, EF Core/Npgsql và test trên staging trước khi phát hành.
- [ ] Thiết lập cập nhật dependency định kỳ, lockfile bắt buộc, SBOM và kiểm tra license package.
- [ ] Không dùng version range thiếu kiểm soát trong release build; chỉ cập nhật sau khi CI và regression tests pass.

Tham khảo [Microsoft .NET Support Policy](https://dotnet.microsoft.com/en-us/platform/support/policy).

## 5. Phân công đề xuất

| Phạm vi | Người/agent chịu trách nhiệm chính | Bằng chứng bàn giao |
|---|---|---|
| `src/**`, backend security, tests | Backend owner/Codex | Commit, test report, API contract, migration impact. |
| `supabase/**`, advisors, backup/restore | Backend owner + Thuan phê duyệt | Migration, advisor output, restore report. |
| `web/**`, resilient UX, code splitting, E2E selectors | Antigravity | Production build, screenshots/video, E2E result. |
| Hạ tầng, secret, certificate, Supabase plan | Thuan/production owner | ADR, access list, rotation và recovery runbook. |
| UAT nghiệp vụ | Người dùng kho/kế toán | Biên bản UAT và danh sách case đã ký xác nhận. |

Giữ đúng `COLLABORATION.md`: không để thay đổi hoàn tất nằm ở branch rời; chỉ xem là hoàn thành khi đã merge, kiểm tra trên `main` và có bằng chứng build/test.

## 6. Production Go/No-Go checklist

### Trước deploy

- [ ] Tất cả P0 hoàn thành; P1 không còn mục critical bị bỏ ngỏ.
- [ ] Release commit/tag cố định; CI xanh; vulnerability audit không có High/Critical.
- [ ] UAT trên staging được ký xác nhận cho các luồng kho, hóa đơn, pricing, report và Authentication.
- [ ] Migration đã test trên bản sao schema/data gần production.
- [ ] Security Advisor không còn warning chưa được chấp nhận; Performance Advisor đã review.
- [ ] Backup mới tồn tại và restore drill còn hiệu lực.
- [ ] Secret/certificate production đã cấu hình, không nằm trong artifact hoặc repository.
- [ ] Rollback owner, on-call contact và cửa sổ deploy đã xác định.

### Trong deploy

- [ ] Backup/checkpoint trước migration.
- [ ] Chạy migration một lần qua pipeline được phê duyệt; lưu output và migration version.
- [ ] Phát hành pilot cho 1–2 máy trước, sau đó chạy smoke test.
- [ ] Xác minh readiness, login, đổi mật khẩu, nhập/xuất kho, hóa đơn, báo cáo và single-device logout.
- [ ] Theo dõi error rate, latency và DB resources tối thiểu 30 phút trước khi rollout rộng.

### Sau deploy

- [ ] Đối soát tồn kho/hóa đơn mẫu với kết quả trước deploy.
- [ ] Xác minh audit log và log ứng dụng không chứa secret/PII ngoài dự kiến.
- [ ] Theo dõi pilot ít nhất 5 ngày làm việc trước khi chuyển toàn bộ máy.
- [ ] Ghi release notes, known issues và cập nhật runbook.

### Rollback trigger

Rollback hoặc dừng rollout khi có một trong các điều kiện:

- Dữ liệu tồn kho/hóa đơn sai, giao dịch không atomic hoặc có thể xuất âm kho.
- Login/session lỗi diện rộng hoặc phân quyền Admin/Staff bị bypass.
- Readiness fail liên tục 5 phút, error rate > 5% trong 5 phút hoặc latency tăng > 2 lần baseline.
- Migration thất bại, schema lệch hoặc không thể xác nhận tính toàn vẹn dữ liệu.
- Phát hiện credential bị lộ hoặc security issue mức High/Critical.

Rollback application bằng artifact/tag trước. Không tự động rollback migration phá hủy dữ liệu; ưu tiên forward-fix hoặc restore theo runbook đã diễn tập.

## 7. Bộ lệnh kiểm tra chuẩn trước mỗi release

```powershell
dotnet build eCommerce.sln -c Release --nologo
dotnet test eCommerce.sln -c Release --no-build --nologo
dotnet list eCommerce.sln package --vulnerable --include-transitive

Set-Location web
npm ci
npm run build
npm audit --omit=dev
Set-Location ..

supabase migration list --linked
supabase db advisors --linked --type security
supabase db advisors --linked --type performance

git status --short --branch
git rev-list --left-right --count origin/main...HEAD
```

Không chạy `supabase db push` trực tiếp vào production từ máy cá nhân. Migration production phải đi qua quy trình đã phê duyệt, có staging verification và backup/rollback plan.

## 8. Thứ tự triển khai khuyến nghị

1. [x] Chốt ADR dùng API in-process cho pilot ba thiết bị.
2. [ ] Hoàn tất database security: function/RLS/grants/group role đã xong; còn login riêng từng thiết bị, TLS validation và tắt Data API trong Dashboard.
3. [x] Thêm correlation ID, liveness/readiness và startup fail-closed.
4. [ ] Thiết lập GitHub Actions cơ bản cho build, test, audit và migration consistency.
5. [ ] Tạo staging, backup/restore runbook và production secret/certificate strategy.
6. [ ] Bổ sung integration/E2E tests cho các giao dịch tồn kho và hóa đơn.
7. [ ] Nâng .NET 10 LTS và chạy regression trên staging.
8. [ ] Load test đúng quy mô 3–5 thiết bị, tối ưu query/bundle và chạy UAT.
9. [ ] Đóng gói signed installer, pilot 1–2 máy, theo dõi 5 ngày rồi mới rollout rộng.

Khi tất cả P0 và quality gate P1 đã đạt, dự án mới nên chuyển trạng thái từ “feature complete” sang “production candidate”.
