alter table public.invoice
  add column if not exists public_lookup_code varchar(8);

create unique index if not exists ux_invoice_public_lookup_code
  on public.invoice(public_lookup_code)
  where public_lookup_code is not null;

insert into public.app_schema_version (id, version, applied_at)
values (1, '20260822023000', now())
on conflict (id) do update
set version = excluded.version,
    applied_at = excluded.applied_at;
