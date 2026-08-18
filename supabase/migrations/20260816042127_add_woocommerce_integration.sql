-- WooCommerce is an external order channel. The warehouse stays the catalog and
-- inventory source of truth; these tables retain imported order snapshots and the
-- explicit mapping required before a warehouse employee confirms fulfilment.

create table if not exists woocommerce_product_link (
  product_id          bigint not null primary key references product(id) on delete cascade,
  woocommerce_product_id bigint not null,
  woocommerce_variation_id bigint,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create unique index if not exists ux_woocommerce_product_link_remote
  on woocommerce_product_link (woocommerce_product_id, coalesce(woocommerce_variation_id, 0));

create table if not exists woocommerce_order (
  woocommerce_order_id bigint not null primary key,
  order_number         varchar(64) not null,
  status               varchar(32) not null,
  currency             varchar(8),
  total                numeric(18,3) not null default 0,
  customer_name        varchar(255),
  customer_email       varchar(255),
  customer_phone       varchar(50),
  shipping_address     varchar(1000),
  source_created_at    timestamptz,
  source_updated_at    timestamptz,
  received_at          timestamptz not null default now(),
  updated_at           timestamptz not null default now(),
  confirmed_invoice_id varchar(20) unique references invoice(id) on delete restrict,
  confirmed_at         timestamptz
);

create index if not exists ix_woocommerce_order_status_updated
  on woocommerce_order (status, source_updated_at desc);

create table if not exists woocommerce_order_item (
  woocommerce_order_item_id bigint not null primary key,
  woocommerce_order_id      bigint not null references woocommerce_order(woocommerce_order_id) on delete cascade,
  woocommerce_product_id    bigint,
  woocommerce_variation_id  bigint,
  product_id                bigint references product(id) on delete restrict,
  product_name              varchar(255) not null,
  quantity                  integer not null check (quantity > 0),
  unit_price                numeric(18,3) not null default 0,
  subtotal                  numeric(18,3) not null default 0
);

create index if not exists ix_woocommerce_order_item_order
  on woocommerce_order_item (woocommerce_order_id);
create index if not exists ix_woocommerce_order_item_product
  on woocommerce_order_item (product_id);

-- Make the new schema version visible to the application's readiness probe.
insert into public.app_schema_version (id, version, applied_at)
values (1, '20260816042127', now())
on conflict (id) do update
set version = excluded.version,
    applied_at = excluded.applied_at;
