# Database access inventory — 2026-08-10

## Mô hình truy cập

```text
React/WebView2 -> HTTPS localhost -> ASP.NET Core in-process
                                      -> PostgreSQL/Supabase
```

UI không dùng `supabase-js`, REST `/rest/v1` hoặc GraphQL. Database access thuộc
backend .NET thông qua EF Core/Npgsql/Dapper.

## Kết quả kiểm kê trước hardening

| Hạng mục | Kết quả live |
|---|---:|
| Public tables | 19 |
| Tables đã bật RLS | 19/19 |
| Tables có RLS policy | 0 |
| Tables còn grant cho `anon`/`authenticated` | 17 |
| Public sequences | 13 |
| Sequences còn grant cho `anon`/`authenticated` | 13 |
| Public views/materialized views | 0 |
| Public functions | 1 (`fn_audit_log`) |

`account` và `auth_session` đã được revoke trước đó. Các table còn lại vẫn mang
legacy default grants dù RLS đang chặn row access. Default privileges của role
`postgres` cũng tự động cấp table/sequence/function mới cho Data API roles.

## Trạng thái mục tiêu

| Principal | Quyền |
|---|---|
| `anon`, `authenticated` | Không có quyền table/sequence/function nghiệp vụ |
| `warehouse_app` | Group role `NOLOGIN`, không có elevated attribute; chỉ quyền CRUD cần cho backend |
| Login từng thiết bị | Tạo ngoài migration, mật khẩu riêng, là member của `warehouse_app` |
| `postgres` | Chỉ dùng migration/administration; không dùng trong ứng dụng production |
| `fn_audit_log` | `SECURITY DEFINER`, fixed `search_path`, không public execute |

## Kết quả xác minh sau hardening

| Hạng mục | Kết quả live |
|---|---:|
| Public tables | 20, gồm `app_schema_version` |
| Tables bật RLS và có `warehouse_app_backend_all` policy | 20/20 |
| Relation còn grant cho `anon`/`authenticated` | 0 |
| `warehouse_app` có LOGIN/elevated attribute | Không |
| `warehouse_app` có quyền tạo object trong `public` | Không |
| Schema version | `20260810020113` |

Quyền đã được kiểm tra theo negative case: `warehouse_app` đọc được `audit_log`
nhưng không update; insert được `invoice` nhưng không delete.

## Kiểm soát còn cần thao tác vận hành

1. Tắt Data API trong Supabase Dashboard sau khi xác nhận không còn consumer khác.
2. Tạo login riêng cho từng thiết bị và lưu password bằng DPAPI/Credential Manager.
3. Thay connection string đang dùng role `postgres`; bật TLS validation đầy đủ và bỏ
   `Trust Server Certificate=true` trước pilot.
4. Revoke login ngay khi một thiết bị bị mất hoặc ngừng sử dụng.
