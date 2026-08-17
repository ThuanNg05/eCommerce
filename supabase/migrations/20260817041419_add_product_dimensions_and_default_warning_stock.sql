-- Product dimensions are optional as a pair. When supplied, both values must
-- be positive so the warehouse and WooCommerce catalog cannot diverge.
alter table public.product
  add column if not exists width numeric(10,2),
  add column if not exists height numeric(10,2);

alter table public.product
  alter column warning_stock set default 10;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'ck_product_dimensions_pair'
      and conrelid = 'public.product'::regclass
  ) then
    alter table public.product
      add constraint ck_product_dimensions_pair
      check (
        (width is null and height is null)
        or (width is not null and height is not null and width > 0 and height > 0)
      );
  end if;
end $$;
