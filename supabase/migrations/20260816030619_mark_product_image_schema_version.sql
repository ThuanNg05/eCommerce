begin;

insert into public.app_schema_version (id, version, applied_at)
values (1, '20260816030619', now())
on conflict (id) do update
set version = excluded.version,
    applied_at = excluded.applied_at;

commit;
