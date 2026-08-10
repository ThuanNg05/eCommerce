-- The desktop application uses a direct PostgreSQL connection through its local
-- .NET API. React does not call the Supabase Data API. Keep public tables private
-- from anon/authenticated and define a non-login group role for device logins.

begin;

create table if not exists public.app_schema_version (
  id smallint primary key check (id = 1),
  version text not null,
  applied_at timestamptz not null default now()
);

alter table public.app_schema_version enable row level security;

insert into public.app_schema_version (id, version, applied_at)
values (1, '20260810020113', now())
on conflict (id) do update
set version = excluded.version,
    applied_at = excluded.applied_at;

revoke all privileges on all tables in schema public from anon, authenticated;
revoke all privileges on all sequences in schema public from anon, authenticated;
revoke execute on all functions in schema public from public, anon, authenticated;

alter default privileges for role postgres in schema public
  revoke select, insert, update, delete, truncate, references, trigger, maintain
  on tables from anon, authenticated;
alter default privileges for role postgres in schema public
  revoke usage, select, update on sequences from anon, authenticated;
alter default privileges for role postgres in schema public
  revoke execute on functions from public, anon, authenticated;

do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'warehouse_app') then
    create role warehouse_app;
  end if;
end
$$;

-- Supabase's managed postgres role cannot toggle SUPERUSER/BYPASSRLS flags.
-- Newly created roles default to those flags being disabled; assert that state
-- below instead of requesting unsupported superuser-only ALTER ROLE options.
alter role warehouse_app nologin nocreatedb nocreaterole noinherit;

do $$
begin
  if exists (
    select 1
    from pg_roles
    where rolname = 'warehouse_app'
      and (rolcanlogin or rolsuper or rolcreatedb or rolcreaterole or rolreplication or rolbypassrls)
  ) then
    raise exception 'warehouse_app has an elevated or login attribute';
  end if;
end
$$;

grant connect on database postgres to warehouse_app;
grant usage on schema public to warehouse_app;

grant select, insert, update on table
  public.account,
  public.backboard,
  public.category,
  public.customer,
  public.frame,
  public.material,
  public.product,
  public.product_component,
  public.smtp_config,
  public.sub_backboard,
  public.sub_price
to warehouse_app;

grant select, insert, update, delete on table public.auth_session to warehouse_app;
grant select on table public.app_schema_version, public.audit_log to warehouse_app;

grant select, insert on table
  public.inventory_transaction,
  public.inventory_transaction_detail
to warehouse_app;

grant select, insert, update on table public.invoice to warehouse_app;

grant select, insert, delete on table
  public.frame_detail,
  public.invoice_detail,
  public.product_category
to warehouse_app;

grant usage, select on all sequences in schema public to warehouse_app;

do $$
declare
  target record;
begin
  for target in
    select n.nspname as schema_name, c.relname as table_name
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relkind in ('r', 'p')
  loop
    execute format(
      'drop policy if exists warehouse_app_backend_all on %I.%I',
      target.schema_name,
      target.table_name);
    execute format(
      'create policy warehouse_app_backend_all on %I.%I for all to warehouse_app using (true) with check (true)',
      target.schema_name,
      target.table_name);
  end loop;
end
$$;

-- Trigger execution does not require callers to execute the trigger function.
-- Keep fn_audit_log private even though it runs as SECURITY DEFINER.
revoke execute on function public.fn_audit_log() from public, anon, authenticated, warehouse_app;

commit;
