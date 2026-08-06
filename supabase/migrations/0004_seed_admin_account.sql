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

insert into account (username, password, role_id, status)
values ('admin', crypt('ChangeMe!123', gen_salt('bf', 10)), 1, 1)
on conflict (username) do nothing;
