-- Server-side authentication sessions.
-- The partial unique index enforces one active device/session per account.
create table if not exists auth_session (
  id                 uuid        primary key,
  account_id         bigint      not null references account(id) on delete cascade,
  refresh_token_hash char(64)    not null,
  created_at         timestamptz not null default now(),
  expires_at         timestamptz not null,
  last_seen_at       timestamptz not null default now(),
  revoked_at         timestamptz,
  constraint ck_auth_session_expiry check (expires_at > created_at)
);

create unique index if not exists ux_auth_session_one_active_per_account
  on auth_session(account_id)
  where revoked_at is null;

create index if not exists ix_auth_session_account_id
  on auth_session(account_id);

create index if not exists ix_auth_session_expires_at
  on auth_session(expires_at)
  where revoked_at is null;

-- This table is internal to the .NET API and must never be reachable through
-- Supabase's public Data API.
alter table auth_session enable row level security;
revoke all on table auth_session from anon, authenticated;
