# ADR-001: API in-process cho pilot ba thiết bị

**Status:** Accepted  
**Date:** 2026-08-10  
**Deciders:** Thuan

## Context

Ứng dụng Windows hiện dùng WPF + WebView2, khởi chạy ASP.NET Core API trong cùng
process và kết nối trực tiếp đến PostgreSQL trên Supabase. Pilot dự kiến tối đa ba
thiết bị đồng thời, do doanh nghiệp quản lý. Dữ liệu nghiệp vụ vẫn dùng chung và
ứng dụng không có yêu cầu offline hoàn toàn.

Các ràng buộc chính:

- Giữ thời gian triển khai và chi phí vận hành thấp cho pilot.
- Không đưa database credential hoặc JWT key vào Git hay React bundle.
- Mỗi thiết bị phải dừng an toàn nếu API hoặc database chưa sẵn sàng.
- Database chỉ được truy cập qua .NET backend; không dùng Supabase Data API từ UI.
- Phải có đường nâng cấp lên API trung tâm nếu phạm vi sử dụng tăng.

## Decision

Chọn **API in-process trên từng thiết bị** cho pilot ba thiết bị.

- WPF khởi chạy Kestrel cục bộ; WebView2 gọi API qua HTTPS localhost.
- Mỗi thiết bị kết nối trực tiếp Supabase bằng một login riêng thuộc group role
  `warehouse_app`; group role không được owner, `SUPERUSER`, `CREATEDB`,
  `CREATEROLE` hoặc `BYPASSRLS`.
- Database credential phải được lưu bằng Windows Credential Manager hoặc DPAPI và
  giới hạn ACL theo Windows user/machine. Việc tạo login/password và phân phối
  credential là bước vận hành riêng, không nằm trong migration hay Git.
- Supabase Data API không thuộc trust boundary của ứng dụng: thu hồi quyền
  `anon`/`authenticated` trên schema nghiệp vụ và tắt Data API trong Dashboard khi
  đã xác minh không còn consumer khác.
- Startup là fail-closed: chỉ mở UI sau khi API và database readiness đạt.

## Options Considered

### Option A: API in-process

| Dimension | Assessment |
|---|---|
| Complexity | Thấp |
| Cost | Không cần server API riêng |
| Scalability | Phù hợp pilot ba thiết bị |
| Security | Credential DB tồn tại trên từng máy; cần DPAPI và least privilege |
| Operations | Cập nhật, rotate secret và log phải xử lý trên từng thiết bị |

**Pros:** giữ kiến trúc hiện tại, ít hạ tầng, triển khai pilot nhanh.  
**Cons:** tăng số bản sao API/JWT key/credential và khó quan sát tập trung.

### Option B: API trung tâm

| Dimension | Assessment |
|---|---|
| Complexity | Trung bình–cao |
| Cost | Cần hosting, domain, TLS và monitoring |
| Scalability | Tốt hơn khi tăng thiết bị/địa điểm |
| Security | Không phát database credential xuống desktop |
| Operations | Deploy, logging và secret rotation tập trung |

**Pros:** trust boundary rõ, vận hành và kiểm soát truy cập tập trung.  
**Cons:** tăng chi phí và dependency hạ tầng trước khi pilot chứng minh nhu cầu.

## Trade-off Analysis

Với ba thiết bị được quản lý, chi phí và độ phức tạp của API trung tâm chưa tương
xứng lợi ích. Rủi ro lớn nhất của API in-process là database credential trên máy
trạm; rủi ro này được giảm bằng login riêng từng máy, group role quyền tối thiểu,
DPAPI/Credential Manager, TLS validation và quy trình revoke khi mất thiết bị.

## Consequences

- Pilot không cần host API trung tâm.
- Mỗi máy cần certificate localhost và credential lifecycle riêng.
- JWT do từng máy ký chỉ có giá trị với API instance trên máy đó.
- Logging tập trung và rotate secret không gián đoạn khó hơn.
- Phải đánh giá lại ADR khi vượt quá năm thiết bị, triển khai nhiều địa điểm,
  cần truy cập ngoài mạng quản lý, hoặc cần SLA/observability tập trung.

## Action Items

1. [x] Harden public schema theo mô hình backend-only và tạo group role `warehouse_app`.
2. [ ] Thuan tạo một login/password riêng cho mỗi thiết bị và grant membership vào `warehouse_app`.
3. [ ] Lưu credential bằng Windows Credential Manager/DPAPI; không dùng connection string file/env lâu dài.
4. [ ] Tắt Data API trong Supabase Dashboard sau khi xác minh không còn consumer khác.
5. [x] Bổ sung fail-closed startup, liveness, readiness và correlation ID.
6. [ ] Cấp certificate localhost tin cậy cho installer production.
7. [ ] Review ADR sau pilot năm ngày hoặc khi chạm điều kiện mở rộng nêu trên.
