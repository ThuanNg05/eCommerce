begin;

alter table public.product
  add column if not exists image_url varchar(512);

commit;
