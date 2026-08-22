# Đồng bộ danh mục Warehouse và WooCommerce

## Mục tiêu

Warehouse giữ liên kết tường minh giữa `category.id` và WooCommerce category ID trong
`woocommerce_category_link`. Không suy diễn liên kết bằng tên.

## Tạm ngưng danh mục

`PATCH /api/categories/{id}/status` với `{ "isActive": false }` tạm ngưng category tại
Warehouse. Category tạm ngưng không thể được gán cho sản phẩm mới/cập nhật và không thể
liên kết mới lên WooCommerce. Mapping đang có và category trên trang web được giữ nguyên;
không xóa category từ xa vì có thể đang được gán cho sản phẩm. Đặt `isActive: true` để
kích hoạt lại.

## Điều kiện trước khi cấu hình

1. Deploy backend có schema version `20260821093036` và apply migration cùng tên.
2. Cấu hình `WooCommerce__BaseUrl`, `WooCommerce__ConsumerKey`,
   `WooCommerce__ConsumerSecret` và `WooCommerce__WebhookSecret` ở backend.
3. Không đưa Consumer Secret hoặc Webhook Secret vào frontend.

## Warehouse → WooCommerce

### Liên kết khi tạo mới

Gọi `POST /api/categories` với JWT hợp lệ:

```json
{
  "name": "Khung gỗ",
  "syncToWooCommerce": true
}
```

Backend lưu category Warehouse trước, tìm hoặc tạo category WooCommerce, rồi lưu link.
Nếu WooCommerce từ chối request, category Warehouse vẫn được giữ để retry qua endpoint
liên kết tường minh.

### Liên kết category đã có

Gọi `POST /api/woocommerce/categories/publish-link`:

```json
{
  "categoryId": 12
}
```

`GET /api/woocommerce/categories/12/link` trả về mapping hiện có. Đổi tên category ở
Warehouse sẽ đồng bộ tên mới lên WooCommerce khi category đã liên kết.

## WooCommerce → Warehouse qua Action webhook

`created_product_cat` và `edited_product_cat` là WordPress action nhưng **không thể**
được dùng trực tiếp trong ô **Action Event**. WooCommerce chỉ chấp nhận custom action có
tiền tố `woocommerce_` hoặc `wc_`; nhập trực tiếp hai tên trên sẽ báo
`Webhook topic unknown. Please select a valid topic.`

Trước hết, cài plugin [Code Snippets](https://wordpress.org/plugins/code-snippets/) hoặc
tạo một must-use plugin, rồi thêm snippet PHP sau và bật cho toàn trang web:

```php
<?php
/**
 * Chuyển WordPress taxonomy hooks sang tên action WooCommerce webhook hợp lệ.
 */
add_action( 'created_product_cat', function ( $term_id ) {
    do_action( 'woocommerce_warehouse_category_created', (int) $term_id );
} );

add_action( 'edited_product_cat', function ( $term_id ) {
    do_action( 'woocommerce_warehouse_category_updated', (int) $term_id );
} );
```

Sau đó tạo **hai** webhook tại `WooCommerce > Settings > Advanced > Webhooks`.

| Name | Topic | Action Event | Delivery URL |
|---|---|---|---|
| Warehouse category created | Action | `woocommerce_warehouse_category_created` | `https://warehouse-api-dpx7.onrender.com/api/webhooks/woocommerce` |
| Warehouse category updated | Action | `woocommerce_warehouse_category_updated` | `https://warehouse-api-dpx7.onrender.com/api/webhooks/woocommerce` |

Với cả hai webhook:

- Status: `Active`.
- Secret: đúng bằng giá trị backend `WooCommerce__WebhookSecret`.
- Không dùng Product Created/Updated cho category taxonomy.

Snippet phát action với `term_id`. Backend xác minh HMAC từ
`X-WC-Webhook-Signature`, dùng `X-WC-Webhook-Topic` để phân loại action, sau đó gọi REST
API WooCommerce lấy đầy đủ category trước khi upsert xuống Warehouse. Ping khi vừa Active
được chấp nhận sau khi xác minh signature.

Không cấu hình action delete ở giai đoạn này. Xóa category WooCommerce tự động có thể làm
Warehouse mất mapping trong khi category vẫn đang được gán cho product.

## Kiểm tra sau cấu hình

1. Tạo category trên WooCommerce.
2. Kiểm tra category mới và link tại Warehouse.
3. Đổi tên category trên WooCommerce; kiểm tra Warehouse đổi tên tương ứng.
4. Tạo category Warehouse với `syncToWooCommerce: true`; kiểm tra category và mapping ở
   WooCommerce.
5. Kiểm tra Render logs: request webhook phải trả HTTP `200`.

WooCommerce có thể disabled webhook sau hơn năm lần delivery thất bại liên tiếp; sửa secret
hoặc endpoint trước khi bật lại webhook.
