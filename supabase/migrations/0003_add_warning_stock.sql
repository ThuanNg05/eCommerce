-- Adds a minimum-stock threshold used for reorder alerts to every stockable table.
-- Low stock = in_stock <= warning_stock. Idempotent (safe to re-run).
-- Applied via the Supabase SQL Editor.

alter table product       add column if not exists warning_stock integer not null default 0;
alter table material      add column if not exists warning_stock integer not null default 0;
alter table backboard     add column if not exists warning_stock integer not null default 0;
alter table sub_backboard add column if not exists warning_stock integer not null default 0;
