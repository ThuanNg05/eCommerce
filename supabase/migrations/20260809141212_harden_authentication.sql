-- Authentication hardening for the custom .NET JWT/session implementation.
begin;

alter table account
  add column if not exists failed_login_attempts integer not null default 0,
  add column if not exists locked_until timestamptz,
  add column if not exists must_change_password boolean not null default false,
  add column if not exists password_changed_at timestamptz;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'ck_account_failed_login_attempts'
  ) then
    alter table account
      add constraint ck_account_failed_login_attempts check (failed_login_attempts >= 0);
  end if;
end $$;

create index if not exists ix_account_locked_until
  on account(locked_until)
  where locked_until is not null;

-- The repository seed is public knowledge. Existing installations must require the
-- seeded administrator to choose a private password before accessing business APIs.
update account
set must_change_password = true
where username = 'admin'
  and password_changed_at is null;

-- Account credentials are internal to the .NET API and must not be exposed through
-- Supabase REST/GraphQL, even if the project still uses legacy public-schema grants.
alter table account enable row level security;
revoke all on table account from anon, authenticated;

-- Never copy a password hash into audit JSON. Also harden the trigger function itself:
-- SECURITY DEFINER uses a fixed search_path and cannot be called as a public RPC.
create or replace function public.fn_audit_log()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_actor bigint := nullif(current_setting('app.current_account_id', true), '')::bigint;
  v_old jsonb := case when tg_op in ('UPDATE','DELETE') then to_jsonb(old) end;
  v_new jsonb := case when tg_op in ('UPDATE','INSERT') then to_jsonb(new) end;
  v_key text;
begin
  if tg_table_name = 'account' then
    v_old := v_old - 'password';
    v_new := v_new - 'password';
  end if;

  v_key := coalesce(
    v_new->>'id', v_old->>'id',
    coalesce(v_new->>'invoice_id', v_old->>'invoice_id','') || '/' ||
    coalesce(v_new->>'product_id', v_old->>'product_id',''));

  insert into audit_log(table_name, record_id, action, old_values, new_values, changed_by)
  values (tg_table_name, v_key, left(tg_op,1), v_old, v_new, v_actor);
  return coalesce(new, old);
end $$;

revoke execute on function public.fn_audit_log() from public, anon, authenticated;

commit;
