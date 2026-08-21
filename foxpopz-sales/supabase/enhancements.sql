-- ============================================================
-- FoxPopz Sales — Enhancements add-on
-- Run this AFTER schema.sql and invoicing.sql, once.
-- Safe to re-run — everything here is idempotent.
-- ============================================================

-- MRP (printed price) alongside the actual selling price (unit_price).
alter table products add column if not exists mrp numeric(10,2);
alter table products add column if not exists hsn_sac text;

-- Snapshot MRP/HSN on each order line too, so past invoices stay accurate
-- even if you change a product's MRP/HSN later.
alter table order_items add column if not exists mrp numeric(10,2);
alter table order_items add column if not exists hsn_sac text;

-- Optional per-order discount, applied before GST.
alter table orders add column if not exists discount numeric(10,2) not null default 0;

-- ============================================================
-- Delete a sale (order) — reverses stock, removes its payments and
-- invoice, then deletes the order itself. Only the rep who made the sale,
-- or an admin, can do this. Runs as one atomic transaction: if anything
-- fails, nothing is changed.
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

  if order_row.rep_id <> auth.uid() and not is_admin() then
    raise exception 'Not authorized to delete this sale';
  end if;

  -- put the stock back
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
