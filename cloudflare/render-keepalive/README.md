# Render keep-alive bằng Cloudflare Workers

Worker này gửi một request ngoài hệ thống đến Render mỗi 10 phút để Free Web
Service không bị idle quá 15 phút.

Phạm vi cố ý không bao gồm:

- WooCommerce webhook
- Supabase Database
- API localhost của WPF

## Triển khai miễn phí

Yêu cầu: Cloudflare account có Workers Free và URL public của Render API.

```powershell
cd D:\Project\eCommerce\cloudflare\render-keepalive
npx wrangler login
npx wrangler secret put RENDER_API_URL
# Nhập: https://<render-service>.onrender.com
npx wrangler deploy
```

Cron `*/10 * * * *` dùng UTC. Sau khi deploy, kiểm tra trong Cloudflare
Dashboard > Workers & Pages > ecommerce-render-keepalive > Triggers và Logs.

## Kiểm tra cục bộ

```powershell
$env:RENDER_API_URL = "https://<render-service>.onrender.com"
npx wrangler dev --test-scheduled
```

Không đặt database connection string, Supabase key hoặc WooCommerce secret vào
Worker. Worker chỉ gọi endpoint public `/health/live`.
