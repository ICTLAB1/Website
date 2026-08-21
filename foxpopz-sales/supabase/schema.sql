-- ============================================================
-- FoxPopz Sales — Supabase schema
-- Run this once in Supabase SQL Editor (Project > SQL Editor > New query)
-- ============================================================

create extension if not exists "pgcrypto";

-- ---------- PROFILES ----------
-- One row per app user, linked 1:1 to auth.users. Role controls what they see.
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  phone text,
  role text not null default 'rep' check (role in ('admin', 'rep')),
  active boolean not null default true,
  created_at timestamptz not null default now()
);

-- Auto-create a profile row whenever a new auth user signs up / is created.
-- New users default to role='rep'. Promote to 'admin' manually in the table,
-- or from the Admin > Reps screen once you've promoted your own account once.
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name, role)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)), 'rep')
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ---------- PRODUCTS ----------
create table if not exists products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  sku text unique,
  unit text not null default 'packet',
  unit_price numeric(10,2) not null default 0,
  stock_qty numeric(10,2) not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

-- ---------- SHOPKEEPERS ----------
create table if not exists shopkeepers (
  id uuid primary key default gen_random_uuid(),
  shop_name text not null,
  owner_name text,
  phone text,
  address text,
  area text,
  latitude numeric,
  longitude numeric,
  assigned_rep_id uuid references profiles(id),
  created_by uuid references profiles(id),
  created_at timestamptz not null default now()
);

-- ---------- ORDERS ----------
create table if not exists orders (
  id uuid primary key default gen_random_uuid(),
  shopkeeper_id uuid not null references shopkeepers(id),
  rep_id uuid not null references profiles(id),
  order_date timestamptz not null default now(),
  total_amount numeric(10,2) not null default 0,
  status text not null default 'confirmed' check (status in ('confirmed', 'cancelled')),
  notes text,
  created_at timestamptz not null default now()
);

-- ---------- ORDER ITEMS ----------
create table if not exists order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders(id) on delete cascade,
  product_id uuid references products(id),
  product_name text not null,
  qty numeric(10,2) not null,
  unit_price numeric(10,2) not null,
  subtotal numeric(10,2) not null
);

-- ---------- PAYMENTS ----------
-- Represents money actually received (at time of sale, or a later collection
-- against outstanding credit). Outstanding for a shopkeeper is always:
--   SUM(orders.total_amount) - SUM(payments.amount)
create table if not exists payments (
  id uuid primary key default gen_random_uuid(),
  shopkeeper_id uuid not null references shopkeepers(id),
  order_id uuid references orders(id),
  rep_id uuid not null references profiles(id),
  amount numeric(10,2) not null,
  mode text not null check (mode in ('cash', 'upi')),
  payment_date timestamptz not null default now(),
  notes text,
  created_at timestamptz not null default now()
);

-- ---------- STOCK TRANSACTIONS ----------
create table if not exists stock_transactions (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references products(id),
  type text not null check (type in ('in', 'out', 'adjustment')),
  qty numeric(10,2) not null,
  reference text,
  created_by uuid references profiles(id),
  created_at timestamptz not null default now()
);

-- ---------- Trigger: order_items -> decrement stock automatically ----------
create or replace function public.apply_stock_out()
returns trigger as $$
begin
  if new.product_id is not null then
    update products set stock_qty = stock_qty - new.qty where id = new.product_id;
    insert into stock_transactions (product_id, type, qty, reference, created_by)
    values (new.product_id, 'out', new.qty, 'order:' || new.order_id, null);
  end if;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_order_item_insert on order_items;
create trigger on_order_item_insert
  after insert on order_items
  for each row execute procedure public.apply_stock_out();

-- ============================================================
-- ROW LEVEL SECURITY
-- Reps: can see/manage their own shopkeepers, orders, payments.
-- Admins: can see/manage everything.
-- ============================================================

alter table profiles enable row level security;
alter table products enable row level security;
alter table shopkeepers enable row level security;
alter table orders enable row level security;
alter table order_items enable row level security;
alter table payments enable row level security;
alter table stock_transactions enable row level security;

-- Helper: is the current user an admin?
create or replace function public.is_admin()
returns boolean as $$
  select exists (
    select 1 from profiles where id = auth.uid() and role = 'admin'
  );
$$ language sql security definer stable;

-- PROFILES
create policy "profiles: self or admin can read" on profiles
  for select using (id = auth.uid() or is_admin());
create policy "profiles: self can update own basic info" on profiles
  for update using (id = auth.uid() or is_admin());
create policy "profiles: admin can insert" on profiles
  for insert with check (is_admin() or id = auth.uid());

-- PRODUCTS (everyone logged in can read; only admin writes)
create policy "products: any authenticated can read" on products
  for select using (auth.uid() is not null);
create policy "products: admin can write" on products
  for all using (is_admin()) with check (is_admin());

-- SHOPKEEPERS
create policy "shopkeepers: rep sees own, admin sees all" on shopkeepers
  for select using (assigned_rep_id = auth.uid() or created_by = auth.uid() or is_admin());
create policy "shopkeepers: rep or admin can insert" on shopkeepers
  for insert with check (auth.uid() is not null);
create policy "shopkeepers: owner rep or admin can update" on shopkeepers
  for update using (assigned_rep_id = auth.uid() or created_by = auth.uid() or is_admin());

-- ORDERS
create policy "orders: rep sees own, admin sees all" on orders
  for select using (rep_id = auth.uid() or is_admin());
create policy "orders: rep or admin can insert own" on orders
  for insert with check (rep_id = auth.uid() or is_admin());
create policy "orders: rep or admin can update own" on orders
  for update using (rep_id = auth.uid() or is_admin());

-- ORDER ITEMS (follow parent order visibility)
create policy "order_items: visible if parent order visible" on order_items
  for select using (
    exists (select 1 from orders o where o.id = order_id and (o.rep_id = auth.uid() or is_admin()))
  );
create policy "order_items: insert if parent order owned" on order_items
  for insert with check (
    exists (select 1 from orders o where o.id = order_id and (o.rep_id = auth.uid() or is_admin()))
  );

-- PAYMENTS
create policy "payments: rep sees own, admin sees all" on payments
  for select using (rep_id = auth.uid() or is_admin());
create policy "payments: rep or admin can insert own" on payments
  for insert with check (rep_id = auth.uid() or is_admin());

-- STOCK TRANSACTIONS (admin only, reps don't need visibility)
create policy "stock_transactions: admin can read" on stock_transactions
  for select using (is_admin());
create policy "stock_transactions: admin can write" on stock_transactions
  for all using (is_admin()) with check (is_admin());

-- ============================================================
-- ONE-TIME SETUP NOTE
-- After you sign up your own account in the app for the first time,
-- run this once (replace the email) to make yourself an admin:
--
--   update profiles set role = 'admin' where id =
--     (select id from auth.users where email = 'you@example.com');
-- ============================================================
