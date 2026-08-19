# Production Operations Runbook

## Phạm vi

Runbook này dành cho người vận hành pilot Warehouse & Invoicing App. Không đưa
connection string, password, JWT key hoặc token vào log, issue, commit hay ảnh chụp màn hình.

## Không kết nối được database

1. Kiểm tra process có đang chạy và gọi `/health/live`.
2. Gọi `/health/ready`; chỉ tiếp tục khi response `200` và `status=ready`.
3. Kiểm tra biến `ConnectionStrings__Default` trên máy chạy ứng dụng.
4. Xác nhận connection string dùng `SSL Mode=VerifyFull`, không dùng
   `Trust Server Certificate=true`.
5. Không sửa schema trực tiếp. Nếu readiness báo lệch schema, dừng rollout và đối chiếu
   migration history với commit release.

## Migration lệch

1. Dừng phát hành thêm máy.
2. Lưu `correlationId`, app version và schema version hiện tại.
3. Chạy `./scripts/Test-Migrations.ps1` trên commit release.
4. Kiểm tra migration bằng staging trước; production migration phải chạy qua pipeline có
   manual approval.
5. Không tự động rollback migration phá huỷ dữ liệu; dùng forward-fix hoặc restore theo
   biên bản đã được phê duyệt.

## Certificate hết hạn hoặc không được tin cậy

1. Dừng rollout.
2. Kiểm tra certificate chain và hostname của database/API.
3. Không bật `Trust Server Certificate=true` để bypass lỗi.
4. Cập nhật certificate theo quy trình của nhà cung cấp, sau đó chạy readiness và smoke test.

## Admin bị khóa

1. Không sửa trực tiếp password hash trong production.
2. Xác nhận danh tính chủ hệ thống ngoài kênh log.
3. Dùng quy trình account recovery được phê duyệt và thu hồi session cũ.
4. Kiểm tra audit log sau khi khôi phục.

## Tồn kho hoặc hóa đơn sai lệch

1. Dừng thao tác ghi và chụp lại mã hóa đơn/correlation ID.
2. Đối chiếu `invoice`, `invoice_detail`, inventory transaction và audit log.
3. Không chỉnh sửa trực tiếp số tồn kho nếu chưa có biên bản nghiệp vụ.
4. Nếu giao dịch không atomic hoặc có nguy cơ xuất âm kho, dừng rollout và chuyển sang
   rollback/restore decision.

## Rollback release

1. Kích hoạt rollback owner và ghi nhận thời điểm bắt đầu.
2. Rollback application về artifact/tag trước đó.
3. Không rollback migration phá huỷ dữ liệu bằng lệnh ngược tự động.
4. Chạy readiness, login, đổi mật khẩu, nhập/xuất kho, hóa đơn và báo cáo.
5. Ghi release note, known issue và nguyên nhân gốc sau khi hệ thống ổn định.

## Chỉ số và ngưỡng theo dõi

Endpoint `/metrics` chỉ dành cho Admin và hiện cung cấp request count, error count,
p50/p95 duration trong process. Khi triển khai tập trung, collector phải lấy các giá trị này
và cảnh báo khi error rate vượt 1% trong 5 phút, readiness fail liên tục hoặc p95 vượt baseline.
