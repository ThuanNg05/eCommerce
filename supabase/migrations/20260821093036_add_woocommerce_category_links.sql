create table if not exists public.woocommerce_category_link (
  category_id              bigint not null primary key references public.category(id) on delete cascade,
  woocommerce_category_id  bigint not null unique,
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now()
);

alter table public.woocommerce_category_link enable row level security;
revoke all on table public.woocommerce_category_link from anon, authenticated;
grant select, insert, update, delete on table public.woocommerce_category_link to warehouse_app;

drop policy if exists warehouse_app_backend_all on public.woocommerce_category_link;
create policy warehouse_app_backend_all on public.woocommerce_category_link
  for all to warehouse_app using (true) with check (true);

insert into public.app_schema_version (id, version, applied_at)
values (1, '20260821093036', now())
on conflict (id) do update
set version = excluded.version,
    applied_at = excluded.applied_at;
