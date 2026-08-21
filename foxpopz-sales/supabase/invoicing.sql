-- ============================================================
-- FoxPopz Sales — Invoicing add-on
-- Run this AFTER schema.sql, once, in the same Supabase SQL Editor.
-- ============================================================

-- ---------- Sequential invoice numbers (race-condition safe) ----------
create table if not exists invoice_counter (
  id int primary key default 1,
  next_number int not null default 1
);
insert into invoice_counter (id, next_number) values (1, 1)
  on conflict (id) do nothing;

create or replace function public.next_invoice_number()
returns int as $$
declare
  n int;
begin
  update invoice_counter
    set next_number = next_number + 1
    where id = 1
    returning next_number - 1 into n;
  return n;
end;
$$ language plpgsql security definer;

grant execute on function public.next_invoice_number() to authenticated;

-- ---------- Invoices ----------
create table if not exists invoices (
  id uuid primary key default gen_random_uuid(),
  invoice_number text not null unique,
  order_id uuid not null references orders(id),
  shopkeeper_id uuid not null references shopkeepers(id),
  rep_id uuid not null references profiles(id),
  amount numeric(10,2) not null,
  payment_mode text not null check (payment_mode in ('cash', 'upi', 'credit')),
  payment_status text not null default 'pending' check (payment_status in ('paid', 'pending')),
  pdf_url text,
  created_at timestamptz not null default now()
);

alter table invoices enable row level security;

create policy "invoices: rep sees own, admin sees all" on invoices
  for select using (rep_id = auth.uid() or is_admin());
create policy "invoices: rep or admin can insert own" on invoices
  for insert with check (rep_id = auth.uid() or is_admin());
create policy "invoices: rep or admin can update own" on invoices
  for update using (rep_id = auth.uid() or is_admin());

-- ---------- Storage bucket for generated PDFs ----------
-- Public bucket so a WhatsApp-shared link opens directly for the shopkeeper
-- without needing them to log in.
insert into storage.buckets (id, name, public)
  values ('invoices', 'invoices', true)
  on conflict (id) do nothing;

create policy "invoice pdfs: anyone can read"
  on storage.objects for select
  using (bucket_id = 'invoices');

create policy "invoice pdfs: authenticated can upload"
  on storage.objects for insert
  with check (bucket_id = 'invoices' and auth.uid() is not null);

create policy "invoice pdfs: authenticated can update own upload"
  on storage.objects for update
  using (bucket_id = 'invoices' and auth.uid() is not null);
