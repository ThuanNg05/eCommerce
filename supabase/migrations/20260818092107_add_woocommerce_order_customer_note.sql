alter table public.woocommerce_order
  add column if not exists customer_note text;

insert into public.app_schema_version (id, version, applied_at)
values (1, '20260818092107', now())
on conflict (id) do update
set version = excluded.version,
    applied_at = excluded.applied_at;
