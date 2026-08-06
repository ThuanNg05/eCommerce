-- Seed a pricing-component row for every imported product (SKU P####) so the Pricing page
-- has data to edit. Per request, uniform placeholder values: wage = 1000, every val_* = 0.5.
--
-- RUN AFTER 0006_seed_products.sql (needs the products to already exist).
-- Idempotent: product_component is 1:1 with product, so ON CONFLICT (product_id) DO NOTHING
-- skips any product that already has a component row.
--
-- ⚠️ WARNING about base_price: these placeholder components (wage 1000, val 0.5) combined with
-- the current all-zero rate card (sub_price) compute a base price of 1000. The seed itself does
-- NOT touch product.base_price (your imported values stay). BUT the app recomputes base_price
-- from the rate card whenever a component or the rate card is saved on the Pricing page — that
-- would overwrite every product's imported base_price with the formula result. Set real rate-card
-- / component values before using the Pricing page's save, or these prices will be recomputed.

insert into product_component (
  product_id, wage,
  val_kieng, val_nh_l, val_nh_n, val_gl, val_gn, val_dl, val_back,
  val_lua, val_kt, val_oc, val_nhom, val_7f, val_2d, val_decal
)
select
  p.id, 1000,
  0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5,
  0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5
from product p
where p.sku ~ '^P[0-9]+$'
on conflict (product_id) do nothing;
