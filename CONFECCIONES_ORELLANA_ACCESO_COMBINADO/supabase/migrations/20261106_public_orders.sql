-- Migración 2026-11-06: pedidos web públicos y revisión de pagos.
-- Ejecutar una sola vez en Supabase SQL Editor.
drop policy if exists "orders_public_repair_insert" on public.orders;
drop policy if exists "orders_public_request_insert" on public.orders;
create policy "orders_public_request_insert" on public.orders
for insert to anon
with check (
  customer_id is null
  and char_length(trim(customer_name)) between 2 and 120
  and char_length(trim(customer_phone)) between 7 and 25
  and quoted_total is null
  and status = 'pendiente'
  and payment_status in ('sin_revisar','no_requerido')
  and (
    (order_details ->> 'service_type' = 'arreglo'
      and order_details ->> 'request_type' = 'Solicitud de arreglo'
      and char_length(coalesce(order_details ->> 'repair_description','')) between 4 and 1800)
    or
    (order_details ->> 'service_type' = 'confeccion'
      and order_details ->> 'request_type' in ('Pedido normal','Solicitud de medidas')
      and char_length(coalesce(order_details ->> 'service','')) between 2 and 120
      and char_length(coalesce(order_details ->> 'details','')) <= 1800)
  )
);
grant insert on public.orders to anon;
create index if not exists orders_created_at_desc_idx on public.orders (created_at desc);
