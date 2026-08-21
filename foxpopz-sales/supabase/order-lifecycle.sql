-- ============================================================
-- FoxPopz Sales — Order lifecycle add-on
-- Run this AFTER schema.sql, invoicing.sql, and enhancements.sql, once.
-- ============================================================

-- Delivery status: an order starts as 'order_received' the moment a rep
-- takes it at the shop. It becomes 'delivered' only when the rep confirms
-- the goods were actually handed over — which is also when payment is
-- captured and the tax invoice is generated.
alter table orders add column if not exists delivery_status text not null default 'order_received'
  check (delivery_status in ('order_received', 'delivered'));
alter table orders add column if not exists delivered_at timestamptz;

-- Index to make the status tabs fast even with thousands of orders.
create index if not exists idx_orders_delivery_status on orders(delivery_status);
create index if not exists idx_orders_rep_delivery_status on orders(rep_id, delivery_status);
