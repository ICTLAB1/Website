-- ============================================================
-- FoxPopz Sales — Manager role add-on
-- Run this AFTER schema.sql, invoicing.sql, enhancements.sql, and
-- order-lifecycle.sql, once. Safe to re-run.
--
-- Three roles now exist:
--   rep     — Sales Person: takes orders, marks delivery/payment on their
--             own orders. Cannot delete any entry.
--   manager — sees and manages ALL orders/shops/payments/products company-
--             wide (mark delivered, collect payment, adjust stock, reassign
--             shops) — but cannot delete sales, and cannot add/manage team
--             logins (that stays admin-only).
--   admin   — everything, including deleting a sale and adding team members.
-- ============================================================

-- ---------- allow the new role value ----------
alter table profiles drop constraint if exists profiles_role_check;
alter table profiles add constraint profiles_role_check
  check (role in ('admin', 'manager', 'rep'));

-- ---------- helper: is the current user a manager? ----------
create or replace function public.is_manager()
returns boolean as $$
  select exists (
    select 1 from profiles where id = auth.uid() and role = 'manager'
  );
$$ language sql security definer stable;

-- ---------- ORDERS: managers can see & update every order, not just their own ----------
drop policy if exists "orders: rep sees own, admin sees all" on orders;
create policy "orders: rep sees own, staff sees all" on orders
  for select using (rep_id = auth.uid() or is_admin() or is_manager());

drop policy if exists "orders: rep or admin can update own" on orders;
create policy "orders: rep own or staff can update" on orders
  for update using (rep_id = auth.uid() or is_admin() or is_manager());

-- ---------- ORDER ITEMS: follow the same visibility ----------
drop policy if exists "order_items: visible if parent order visible" on order_items;
create policy "order_items: visible if parent order visible" on order_items
  for select using (
    exists (select 1 from orders o where o.id = order_id and (o.rep_id = auth.uid() or is_admin() or is_manager()))
  );

-- ---------- PAYMENTS: managers can see & collect against every order ----------
drop policy if exists "payments: rep sees own, admin sees all" on payments;
create policy "payments: rep sees own, staff sees all" on payments
  for select using (rep_id = auth.uid() or is_admin() or is_manager());

-- ---------- SHOPKEEPERS: managers can see & reassign any shop ----------
drop policy if exists "shopkeepers: rep sees own, admin sees all" on shopkeepers;
create policy "shopkeepers: rep sees own, staff sees all" on shopkeepers
  for select using (assigned_rep_id = auth.uid() or created_by = auth.uid() or is_admin() or is_manager());

drop policy if exists "shopkeepers: owner rep or admin can update" on shopkeepers;
create policy "shopkeepers: owner rep or staff can update" on shopkeepers
  for update using (assigned_rep_id = auth.uid() or created_by = auth.uid() or is_admin() or is_manager());

-- ---------- PRODUCTS: managers can manage stock/pricing too ----------
drop policy if exists "products: admin can write" on products;
create policy "products: staff can write" on products
  for all using (is_admin() or is_manager()) with check (is_admin() or is_manager());

-- ---------- STOCK TRANSACTIONS: managers can read/write (needed for stock adjustments) ----------
drop policy if exists "stock_transactions: admin can read" on stock_transactions;
drop policy if exists "stock_transactions: admin can write" on stock_transactions;
create policy "stock_transactions: staff can read" on stock_transactions
  for select using (is_admin() or is_manager());
create policy "stock_transactions: staff can write" on stock_transactions
  for all using (is_admin() or is_manager()) with check (is_admin() or is_manager());

-- ---------- INVOICES: managers can see every invoice ----------
drop policy if exists "invoices: rep sees own, admin sees all" on invoices;
create policy "invoices: rep sees own, staff sees all" on invoices
  for select using (rep_id = auth.uid() or is_admin() or is_manager());

-- ============================================================
-- DELETE A SALE — admin only. This intentionally REPLACES the earlier
-- version, which let a rep delete their own entry. From now on, nobody
-- but an admin can delete a sale — not the rep who created it, not a
-- manager.
-- ============================================================
create or replace function public.delete_sale(order_id_input uuid)
returns void as $$
declare
  order_row orders%rowtype;
  item record;
begin
  select * into order_row from orders where id = order_id_input;
  if not found then
    raise exception 'Sale not found';
  end if;

  if not is_admin() then
    raise exception 'Only an admin can delete a sale';
  end if;

  for item in select * from order_items where order_id = order_id_input loop
    if item.product_id is not null then
      update products set stock_qty = stock_qty + item.qty where id = item.product_id;
      insert into stock_transactions (product_id, type, qty, reference, created_by)
      values (item.product_id, 'in', item.qty, 'sale deleted: ' || order_id_input, auth.uid());
    end if;
  end loop;

  delete from payments where order_id = order_id_input;
  delete from invoices where order_id = order_id_input;
  delete from order_items where order_id = order_id_input;
  delete from orders where id = order_id_input;
end;
$$ language plpgsql security definer;

grant execute on function public.delete_sale(uuid) to authenticated;
