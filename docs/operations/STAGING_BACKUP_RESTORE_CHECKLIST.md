# Staging, backup và restore checklist

## Staging

- [x] Tạo Supabase project staging riêng: `avcshobfquwgpesbqgrs`.
- [ ] Không copy dữ liệu production thật nếu chưa masking.
- [x] Cấu hình connection secret ngoài repository trong GitHub Actions Environment `staging`.
- [ ] Chạy migration trên staging qua pipeline có manual approval.
- [x] Chạy `scripts/Test-PostgresIntegration.ps1` trên staging: 2/2 passed.

## Backup

- [ ] Ghi rõ Supabase plan và backup retention.
- [ ] Chọn RPO/RTO và được chủ dự án phê duyệt.
- [x] Tạo logical dump ngoài hệ thống: evidence tại `docs/operations/RESTORE_DRILL_2026-08-19.md`.
- [ ] Backup Supabase Storage objects riêng với database metadata.

## Restore drill

- [x] Restore vào môi trường tách biệt local tạm thời.
- [x] Lưu thời điểm, checksum, migration version và số bản ghi chính tại `RESTORE_DRILL_2026-08-19.md`.
- [x] Chạy integration verification sau restore; row-count probe passed.
- [x] Ghi thời gian restore thực tế và lỗi gặp phải tại `RESTORE_DRILL_2026-08-19.md`.
- [ ] Chủ dự án ký biên bản restore trước khi đánh dấu hoàn thành.

Không đánh dấu hoàn thành chỉ vì migration lint hoặc unit test pass; restore drill phải
được thực thi trên môi trường tách biệt và có bằng chứng.
