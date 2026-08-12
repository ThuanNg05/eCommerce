-- Replace the legacy plaintext SMTP password column with authenticated ciphertext.
-- Existing plaintext cannot be safely transformed in SQL because the AES key intentionally
-- lives outside the database. Clear it once and require an administrator to enter it again.
begin;

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'smtp_config'
      and column_name = 'hashed_pass_app'
  ) then
    update public.smtp_config
    set hashed_pass_app = '',
        updated_at = now()
    where hashed_pass_app <> '';

    alter table public.smtp_config
      rename column hashed_pass_app to protected_pass_app;
  end if;
end
$$;

alter table public.smtp_config
  alter column protected_pass_app type varchar(2048);

insert into public.app_schema_version (id, version, applied_at)
values (1, '20260812193000', now())
on conflict (id) do update
set version = excluded.version,
    applied_at = excluded.applied_at;

commit;
