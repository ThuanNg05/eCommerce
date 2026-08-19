# Warehouse & Invoicing App

Ứng dụng quản lý kho và hóa đơn cho cơ sở kinh doanh nhỏ và vừa.

## Dự án làm được gì?

- Quản lý sản phẩm, vật tư, danh mục, khách hàng và tồn kho.
- Ghi nhận điều chỉnh kho, giao dịch nhập/xuất và chuyển đổi nguyên vật liệu.
- Tạo, cập nhật và theo dõi hóa đơn bán hàng.
- Quản lý bảng giá, cấu phần sản phẩm và báo cáo kinh doanh.
- Phân quyền tài khoản, quản lý phiên đăng nhập và nhật ký kiểm toán.
- Quản lý ảnh sản phẩm, SMTP và đồng bộ đơn hàng WooCommerce.
- Chạy dưới dạng web app hoặc ứng dụng desktop Windows.

## Stack công nghệ

| Thành phần | Công nghệ |
|---|---|
| Frontend | React, TypeScript, Vite, Material UI, AG Grid, TanStack Query |
| Backend | ASP.NET Core Minimal API, .NET 10 |
| Desktop | WPF, WebView2 |
| Data access | Entity Framework Core, Dapper |
| Database | PostgreSQL, Supabase |
| Authentication | JWT, server-side session, role-based authorization |
| Testing/CI | xUnit, Playwright, GitHub Actions, Gitleaks, npm/NuGet audit |

## Cấu trúc chính

```text
src/                    .NET Core, Infrastructure, API và Desktop host
web/                    React frontend
supabase/migrations/    SQL schema migrations
tests/                  Automated tests
scripts/                Các script kiểm tra và vận hành
```
