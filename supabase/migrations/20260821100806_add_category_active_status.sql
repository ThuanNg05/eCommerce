alter table public.category
  add column if not exists is_active boolean not null default true;

insert into public.app_schema_version (id, version, applied_at)
values (1, '20260821100806', now())
on conflict (id) do update
set version = excluded.version,
    applied_at = excluded.applied_at;
