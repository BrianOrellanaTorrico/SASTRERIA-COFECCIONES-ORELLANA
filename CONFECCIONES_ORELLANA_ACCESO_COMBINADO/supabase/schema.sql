-- CONFECCIONES ORELLANA | Esquema inicial
-- Ejecutar en Supabase SQL Editor después de crear el proyecto.
create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default '',
  phone text,
  role text not null default 'client' check (role in ('owner','admin','client')),
  created_at timestamptz not null default now()
);

create table if not exists public.garments (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category text not null check (category in ('femenina','masculina','arreglos')),
  description text not null default '',
  sewing_price numeric(12,2) not null default 0 check (sewing_price >= 0),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.fabrics (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  description text not null default '',
  price_per_meter numeric(12,2) check (price_per_meter is null or price_per_meter >= 0),
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.garment_fabrics (
  garment_id uuid not null references public.garments(id) on delete cascade,
  fabric_id uuid not null references public.fabrics(id) on delete cascade,
  primary key (garment_id, fabric_id)
);

create table if not exists public.garment_images (
  id uuid primary key default gen_random_uuid(),
  garment_id uuid not null references public.garments(id) on delete cascade,
  storage_path text not null,
  alt_text text not null default '',
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid references auth.users(id) on delete set null,
  customer_name text not null,
  customer_phone text not null,
  order_details jsonb not null default '{}'::jsonb,
  quoted_total numeric(12,2) check (quoted_total is null or quoted_total >= 0),
  status text not null default 'pendiente',
  payment_status text not null default 'sin_revisar',
  created_at timestamptz not null default now()
);

create or replace function public.is_catalog_manager()
returns boolean language sql stable security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role in ('owner','admin')
  );
$$;

alter table public.profiles enable row level security;
alter table public.garments enable row level security;
alter table public.fabrics enable row level security;
alter table public.garment_fabrics enable row level security;
alter table public.garment_images enable row level security;
alter table public.orders enable row level security;

create policy "profiles_read_own_or_managers" on public.profiles
for select to authenticated
using (id = auth.uid() or public.is_catalog_manager());

create policy "catalog_public_read_garments" on public.garments
for select to anon, authenticated using (active = true or public.is_catalog_manager());
create policy "catalog_manager_write_garments" on public.garments
for all to authenticated using (public.is_catalog_manager()) with check (public.is_catalog_manager());

create policy "catalog_public_read_fabrics" on public.fabrics
for select to anon, authenticated using (active = true or public.is_catalog_manager());
create policy "catalog_manager_write_fabrics" on public.fabrics
for all to authenticated using (public.is_catalog_manager()) with check (public.is_catalog_manager());

create policy "catalog_public_read_compatibility" on public.garment_fabrics
for select to anon, authenticated using (true);
create policy "catalog_manager_write_compatibility" on public.garment_fabrics
for all to authenticated using (public.is_catalog_manager()) with check (public.is_catalog_manager());

create policy "catalog_public_read_images" on public.garment_images
for select to anon, authenticated using (true);
create policy "catalog_manager_write_images" on public.garment_images
for all to authenticated using (public.is_catalog_manager()) with check (public.is_catalog_manager());

create policy "orders_customer_insert" on public.orders
for insert to authenticated
with check (customer_id = auth.uid());

-- Solicitudes públicas de arreglos: solo permite crear solicitudes sin precio ni anticipo.
-- Los visitantes anónimos no pueden consultar, modificar ni borrar pedidos.
drop policy if exists "orders_public_repair_insert" on public.orders;
create policy "orders_public_repair_insert" on public.orders
for insert to anon
with check (
  customer_id is null
  and char_length(trim(customer_name)) between 2 and 120
  and char_length(trim(customer_phone)) between 7 and 25
  and order_details ->> 'service_type' = 'arreglo'
  and order_details ->> 'request_type' = 'Solicitud de arreglo'
  and char_length(coalesce(order_details ->> 'repair_description', '')) between 4 and 1800
  and quoted_total is null
  and status = 'pendiente'
  and payment_status = 'no_requerido'
);
-- La política RLS anterior limita qué filas pueden insertar los visitantes.
grant insert on public.orders to anon;

create policy "orders_customer_read_own" on public.orders
for select to authenticated
using (customer_id = auth.uid() or public.is_catalog_manager());
create policy "orders_manager_update" on public.orders
for update to authenticated
using (public.is_catalog_manager()) with check (public.is_catalog_manager());

-- Bucket público para fotografías de catálogo.
insert into storage.buckets (id, name, public)
values ('catalogo', 'catalogo', true)
on conflict (id) do update set public = true;

create policy "catalog_images_public_read" on storage.objects
for select to anon, authenticated
using (bucket_id = 'catalogo');

create policy "catalog_images_manager_upload" on storage.objects
for insert to authenticated
with check (bucket_id = 'catalogo' and public.is_catalog_manager());

create policy "catalog_images_manager_update" on storage.objects
for update to authenticated
using (bucket_id = 'catalogo' and public.is_catalog_manager())
with check (bucket_id = 'catalogo' and public.is_catalog_manager());

create policy "catalog_images_manager_delete" on storage.objects
for delete to authenticated
using (bucket_id = 'catalogo' and public.is_catalog_manager());
