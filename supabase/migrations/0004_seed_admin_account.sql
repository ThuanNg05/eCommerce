-- Seed the first administrator so the app can be logged into.
--
-- The password is hashed with pgcrypto's Blowfish (bf) salt, which produces a $2a$ BCrypt
-- hash that BCrypt.Net-Next (used by AuthService) verifies natively — no plaintext or
-- app-computed hash is stored in source control.
--
-- Idempotent: re-running does nothing if the 'admin' account already exists, so it will
-- NOT clobber a password you have since changed.
--
--   Default credentials:  username = admin   password = ChangeMe!123
--   role_id = 1 (Admin), status = 1 (active)
--
-- SECURITY: change this password immediately after the first login (Accounts screen or
-- PUT /api/accounts/{id}). Anyone with repo access can read the default below.

create extension if not exists pgcrypto;

-- Supabase-managed databases commonly install pgcrypto in the `extensions`
-- schema, while other PostgreSQL environments may use `public`. Include both
-- schemas so crypt/gen_salt resolve consistently in staging and local runs.
set local search_path = public, extensions;

insert into account (username, password, role_id, status)
values ('admin', crypt('Admin123', gen_salt('bf', 10)), 1, 1)
on conflict (username) do nothing;
