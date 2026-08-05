-- eCommerce (custom-framing) schema — the application's source of truth.
-- Applied manually via the Supabase SQL Editor; the .NET model maps these tables with
-- EF's ExcludeFromMigrations(), so EF never generates DDL for them.
--
-- NOTE: 0001_initial_create.sql created a now-retired generic skeleton
-- (products/invoices/invoice_lines, plural). Those tables are no longer used and can be
-- dropped:  drop table if exists invoice_lines, invoices, products cascade;

begin;

-- ---------- core reference tables ----------
create table if not exists account (
  id          bigint generated always as identity primary key,
  username    varchar(255) not null unique,
  password    varchar(255) not null,
  role_id     smallint     not null,
  status      smallint     not null default 1,
  created_at  timestamptz  not null default now(),
  updated_at  timestamptz  not null default now()
);

create table if not exists customer (
  id          bigint generated always as identity primary key,
  name        varchar(255) not null unique,
  phone       varchar(11)  not null unique,
  address     varchar(255),
  email       varchar(255) unique,
  group_price char(1),
  description varchar(255),
  created_at  timestamptz  not null default now(),
  updated_at  timestamptz  not null default now()
);

create table if not exists category (
  id         bigint generated always as identity primary key,
  name       varchar(255) not null unique,
  created_at timestamptz  not null default now()
);

create table if not exists material (
  id           bigint generated always as identity primary key,
  name         varchar(255) not null unique,
  import_price numeric(18,3) not null default 0,
  sale_price   numeric(18,3) not null default 0,
  in_stock     integer       not null default 0,
  status       smallint      not null default 1,
  description  varchar(255),
  created_at   timestamptz   not null default now(),
  updated_at   timestamptz   not null default now()
);

create table if not exists backboard (
  id           bigint generated always as identity primary key,
  type         smallint      not null,
  import_price numeric(18,3) not null default 0,
  sale_price   numeric(18,3),
  in_stock     integer       not null default 0,
  status       smallint      not null default 1,
  description  varchar(255),
  created_at   timestamptz   not null default now(),
  updated_at   timestamptz   not null default now()
);

create table if not exists sub_backboard (
  id          bigint generated always as identity primary key,
  size        varchar(20)  not null unique,
  in_stock    integer      not null default 0,
  description varchar(255),
  status      smallint     not null default 1,
  created_at  timestamptz  not null default now(),
  updated_at  timestamptz  not null default now()
);

create table if not exists frame (
  id          bigint generated always as identity primary key,
  code        integer      not null unique,
  description varchar(255),
  status      smallint     not null default 1,
  created_at  timestamptz  not null default now(),
  updated_at  timestamptz  not null default now()
);

create table if not exists frame_detail (
  id               bigint generated always as identity primary key,
  frame_id         bigint  not null references frame(id),
  sub_backboard_id bigint  not null references sub_backboard(id),
  quantity         integer not null default 0,
  created_at       timestamptz not null default now()
);

-- ---------- product & catalog ----------
create table if not exists product (
  id               bigint generated always as identity primary key,
  sku              varchar(50)  not null unique,
  name             varchar(255) not null unique,
  base_price       numeric(18,3) not null default 0,
  price_retail     numeric(18,0),
  price_wholesale  numeric(18,0),
  sub_backboard_id bigint references sub_backboard(id),
  in_stock         integer      not null default 0,
  status           smallint     not null default 1,
  description      varchar(255),
  created_at       timestamptz  not null default now(),
  updated_at       timestamptz  not null default now()
);

create table if not exists product_category (
  product_id  bigint not null references product(id) on delete cascade,
  category_id bigint not null references category(id) on delete cascade,
  primary key (product_id, category_id)
);

-- ---------- inventory ----------
create table if not exists inventory_transaction (
  id               bigint generated always as identity primary key,
  transaction_code integer     not null unique,
  type             smallint     not null,
  transaction_date date         not null default current_date,
  note             varchar(255),
  created_at       timestamptz  not null default now()
);

create table if not exists inventory_transaction_detail (
  id                       bigint generated always as identity primary key,
  inventory_transaction_id bigint not null references inventory_transaction(id) on delete cascade,
  product_id               bigint references product(id),
  backboard_id             bigint references backboard(id),
  material_id              bigint references material(id),
  frame_id                 bigint references frame(id),
  sub_backboard_id         bigint references sub_backboard(id),
  quantity                 integer      not null default 0,
  unit_price               numeric(18,3) not null default 0,
  total_price              numeric(18,3) not null default 0,
  direction                smallint      not null,
  created_at               timestamptz   not null default now()
);

-- ---------- sales ----------
create table if not exists invoice (
  id          varchar(20) primary key,
  customer_id bigint not null references customer(id),
  total       numeric(18,3) not null default 0,
  created_at  timestamptz  not null default now(),
  updated_at  timestamptz  not null default now()
);

create table if not exists invoice_detail (
  invoice_id   varchar(20) not null references invoice(id) on delete cascade,
  product_id   bigint      not null references product(id),
  product_name varchar(255) not null,
  unit_price   numeric(18,3) not null default 0,
  quantity     integer      not null default 0,
  subtotal     numeric(18,3) not null default 0,
  description  varchar(255),
  primary key (invoice_id, product_id)
);

-- ---------- config / pricing ----------
create table if not exists smtp_config (
  id              smallint primary key default 1 check (id = 1),
  address         varchar(255) not null,
  hashed_pass_app varchar(255) not null,
  duration        date,
  updated_at      timestamptz  not null default now()
);

create table if not exists sub_price (
  id         smallint primary key default 1 check (id = 1),  -- singleton rate card
  pr_kieng   numeric(18,3) not null default 0,
  pr_nh_l    numeric(18,3) not null default 0,
  pr_nh_n    numeric(18,3) not null default 0,
  pr_gl      numeric(18,3) not null default 0,
  pr_gn      numeric(18,3) not null default 0,
  pr_dl      numeric(18,3) not null default 0,
  pr_back    numeric(18,3) not null default 0,
  pr_lua     numeric(18,3) not null default 0,
  pr_kt      numeric(18,3) not null default 0,
  pr_oc      numeric(18,3) not null default 0,
  pr_nhom    numeric(18,3) not null default 0,
  pr_7f      numeric(18,3) not null default 0,
  pr_2d      numeric(18,3) not null default 0,
  pr_decal   numeric(18,3) not null default 0,
  updated_at timestamptz   not null default now()
);

create table if not exists product_component (
  id         bigint generated always as identity primary key,
  product_id bigint not null unique references product(id) on delete cascade,  -- 1:1
  wage       numeric(18,3) not null default 0,
  val_kieng  numeric(10,3),
  val_nh_l   numeric(10,3),
  val_nh_n   numeric(10,3),
  val_gl     numeric(10,3),
  val_gn     numeric(10,3),
  val_dl     numeric(10,3),
  val_back   numeric(10,3),
  val_lua    numeric(10,3),
  val_kt     numeric(10,3),
  val_oc     numeric(10,3),
  val_nhom   numeric(10,3),
  val_7f     numeric(10,3),
  val_2d     numeric(10,3),
  val_decal  numeric(10,3),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------- audit ----------
create table if not exists audit_log (
  id         bigint generated always as identity primary key,
  table_name text        not null,
  record_id  text        not null,
  action     char(1)     not null,          -- I / U / D
  old_values jsonb,
  new_values jsonb,
  changed_by bigint references account(id),
  changed_at timestamptz not null default now()
);
create index if not exists idx_audit_log_table_record on audit_log(table_name, record_id);

create or replace function fn_audit_log()
returns trigger language plpgsql security definer as $$
declare
  v_actor bigint := nullif(current_setting('app.current_account_id', true), '')::bigint;
  v_old jsonb := case when tg_op in ('UPDATE','DELETE') then to_jsonb(old) end;
  v_new jsonb := case when tg_op in ('UPDATE','INSERT') then to_jsonb(new) end;
  v_key text := coalesce(
    v_new->>'id', v_old->>'id',
    coalesce(v_new->>'invoice_id', v_old->>'invoice_id','') || '/' ||
    coalesce(v_new->>'product_id', v_old->>'product_id',''));
begin
  insert into audit_log(table_name, record_id, action, old_values, new_values, changed_by)
  values (tg_table_name, v_key, left(tg_op,1), v_old, v_new, v_actor);
  return coalesce(new, old);
end $$;

drop trigger if exists trg_audit_sub_price on sub_price;
create trigger trg_audit_sub_price
  after insert or update or delete on sub_price
  for each row execute function fn_audit_log();
drop trigger if exists trg_audit_invoice on invoice;
create trigger trg_audit_invoice
  after insert or update or delete on invoice
  for each row execute function fn_audit_log();
drop trigger if exists trg_audit_invoice_detail on invoice_detail;
create trigger trg_audit_invoice_detail
  after insert or update or delete on invoice_detail
  for each row execute function fn_audit_log();
drop trigger if exists trg_audit_account on account;
create trigger trg_audit_account
  after insert or update or delete on account
  for each row execute function fn_audit_log();

-- seed the two singletons
insert into sub_price (id) values (1) on conflict (id) do nothing;
insert into smtp_config (id, address, hashed_pass_app) values (1, '', '') on conflict (id) do nothing;

commit;
