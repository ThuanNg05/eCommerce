alter table public.invoice
  add column if not exists public_lookup_token varchar(64);

create unique index if not exists ux_invoice_public_lookup_token
  on public.invoice(public_lookup_token)
  where public_lookup_token is not null;

insert into public.app_schema_version (id, version, applied_at)
values (1, '20260822021838', now())
on conflict (id) do update
set version = excluded.version,
    applied_at = excluded.applied_at;
