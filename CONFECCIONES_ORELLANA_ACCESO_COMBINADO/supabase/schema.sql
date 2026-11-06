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

drop policy if exists "profiles_read_own_or_managers" on public.profiles;
create policy "profiles_read_own_or_managers" on public.profiles
for select to authenticated
using (id = auth.uid() or public.is_catalog_manager());

drop policy if exists "catalog_public_read_garments" on public.garments;
create policy "catalog_public_read_garments" on public.garments
for select to anon, authenticated using (active = true or public.is_catalog_manager());
drop policy if exists "catalog_manager_write_garments" on public.garments;
create policy "catalog_manager_write_garments" on public.garments
for all to authenticated using (public.is_catalog_manager()) with check (public.is_catalog_manager());

drop policy if exists "catalog_public_read_fabrics" on public.fabrics;
create policy "catalog_public_read_fabrics" on public.fabrics
for select to anon, authenticated using (active = true or public.is_catalog_manager());
drop policy if exists "catalog_manager_write_fabrics" on public.fabrics;
create policy "catalog_manager_write_fabrics" on public.fabrics
for all to authenticated using (public.is_catalog_manager()) with check (public.is_catalog_manager());

drop policy if exists "catalog_public_read_compatibility" on public.garment_fabrics;
create policy "catalog_public_read_compatibility" on public.garment_fabrics
for select to anon, authenticated using (true);
drop policy if exists "catalog_manager_write_compatibility" on public.garment_fabrics;
create policy "catalog_manager_write_compatibility" on public.garment_fabrics
for all to authenticated using (public.is_catalog_manager()) with check (public.is_catalog_manager());

drop policy if exists "catalog_public_read_images" on public.garment_images;
create policy "catalog_public_read_images" on public.garment_images
for select to anon, authenticated using (true);
drop policy if exists "catalog_manager_write_images" on public.garment_images;
create policy "catalog_manager_write_images" on public.garment_images
for all to authenticated using (public.is_catalog_manager()) with check (public.is_catalog_manager());

drop policy if exists "orders_customer_insert" on public.orders;
create policy "orders_customer_insert" on public.orders
for insert to authenticated
with check (customer_id = auth.uid());

-- Solicitudes públicas desde la web: sin cotización ni verificación de pago por parte del visitante.
-- Los visitantes anónimos solo pueden insertar; no pueden leer, modificar ni borrar pedidos.
drop policy if exists "orders_public_repair_insert" on public.orders;
drop policy if exists "orders_public_request_insert" on public.orders;
create policy "orders_public_request_insert" on public.orders
for insert to anon
with check (
  customer_id is null
  and char_length(trim(customer_name)) between 2 and 120
  and char_length(trim(customer_phone)) between 7 and 25
  and jsonb_typeof(order_details) = 'object'
  and pg_column_size(order_details) <= 65536
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

drop policy if exists "orders_customer_read_own" on public.orders;
create policy "orders_customer_read_own" on public.orders
for select to authenticated
using (customer_id = auth.uid() or public.is_catalog_manager());
drop policy if exists "orders_manager_update" on public.orders;
create policy "orders_manager_update" on public.orders
for update to authenticated
using (public.is_catalog_manager()) with check (public.is_catalog_manager());

-- Bucket público para fotografías de catálogo.
insert into storage.buckets (id, name, public)
values ('catalogo', 'catalogo', true)
on conflict (id) do update set public = true;

drop policy if exists "catalog_images_public_read" on storage.objects;
create policy "catalog_images_public_read" on storage.objects
for select to anon, authenticated
using (bucket_id = 'catalogo');

drop policy if exists "catalog_images_manager_upload" on storage.objects;
create policy "catalog_images_manager_upload" on storage.objects
for insert to authenticated
with check (bucket_id = 'catalogo' and public.is_catalog_manager());

drop policy if exists "catalog_images_manager_update" on storage.objects;
create policy "catalog_images_manager_update" on storage.objects
for update to authenticated
using (bucket_id = 'catalogo' and public.is_catalog_manager())
with check (bucket_id = 'catalogo' and public.is_catalog_manager());

drop policy if exists "catalog_images_manager_delete" on storage.objects;
create policy "catalog_images_manager_delete" on storage.objects
for delete to authenticated
using (bucket_id = 'catalogo' and public.is_catalog_manager());


-- Índice para cargar primero los pedidos más recientes en el panel administrativo.
create index if not exists orders_created_at_desc_idx on public.orders (created_at desc);


-- Configuración general del sitio (QR oficial y fotografía de ubicación).
create table if not exists public.site_settings (
  id smallint primary key default 1 check (id = 1),
  qr_storage_path text,
  location_photo_path text,
  updated_at timestamptz not null default now()
);
insert into public.site_settings (id) values (1) on conflict (id) do nothing;
alter table public.site_settings enable row level security;

-- Ubicación pública y galería del taller.
create table if not exists public.store_location (
  id boolean primary key default true check (id = true),
  address text not null default '',
  map_query text not null default 'CONFECCIONES ORELLANA',
  maps_url text not null default 'https://goo.gl/maps/1KyVvY3ZVWbn6QiV8?g_st=ac',
  updated_at timestamptz not null default now()
);
create table if not exists public.store_location_images (
  id uuid primary key default gen_random_uuid(),
  storage_path text not null unique,
  alt_text text not null default '',
  sort_order bigint not null default 0,
  created_at timestamptz not null default now()
);
alter table public.store_location enable row level security;
alter table public.store_location_images enable row level security;

insert into public.store_location (id, address, map_query, maps_url)
values (true, '', 'CONFECCIONES ORELLANA', 'https://goo.gl/maps/1KyVvY3ZVWbn6QiV8?g_st=ac')
on conflict (id) do nothing;

-- Bucket independiente para el QR oficial.
insert into storage.buckets (id, name, public)
values ('qr-pagos', 'qr-pagos', true)
on conflict (id) do update set public = true;

-- Políticas adicionales: lectura pública y escritura solo para owner/admin.
do $$
begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='site_settings' and policyname='site_settings_public_read') then
    create policy site_settings_public_read on public.site_settings
    for select to anon, authenticated using (true);
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='site_settings' and policyname='site_settings_manager_write') then
    create policy site_settings_manager_write on public.site_settings
    for all to authenticated using (public.is_catalog_manager()) with check (public.is_catalog_manager());
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='store_location' and policyname='store_location_public_read') then
    create policy store_location_public_read on public.store_location
    for select to anon, authenticated using (true);
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='store_location' and policyname='store_location_manager_insert') then
    create policy store_location_manager_insert on public.store_location
    for insert to authenticated with check (public.is_catalog_manager());
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='store_location' and policyname='store_location_manager_update') then
    create policy store_location_manager_update on public.store_location
    for update to authenticated using (public.is_catalog_manager()) with check (public.is_catalog_manager());
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='store_location_images' and policyname='store_location_images_public_read') then
    create policy store_location_images_public_read on public.store_location_images
    for select to anon, authenticated using (true);
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='store_location_images' and policyname='store_location_images_manager_insert') then
    create policy store_location_images_manager_insert on public.store_location_images
    for insert to authenticated with check (public.is_catalog_manager());
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='store_location_images' and policyname='store_location_images_manager_delete') then
    create policy store_location_images_manager_delete on public.store_location_images
    for delete to authenticated using (public.is_catalog_manager());
  end if;
  if not exists (select 1 from pg_policies where schemaname='storage' and tablename='objects' and policyname='qr_payments_public_read') then
    create policy qr_payments_public_read on storage.objects
    for select to anon, authenticated using (bucket_id='qr-pagos');
  end if;
  if not exists (select 1 from pg_policies where schemaname='storage' and tablename='objects' and policyname='qr_payments_manager_upload') then
    create policy qr_payments_manager_upload on storage.objects
    for insert to authenticated with check (bucket_id='qr-pagos' and public.is_catalog_manager());
  end if;
  if not exists (select 1 from pg_policies where schemaname='storage' and tablename='objects' and policyname='qr_payments_manager_update') then
    create policy qr_payments_manager_update on storage.objects
    for update to authenticated using (bucket_id='qr-pagos' and public.is_catalog_manager())
    with check (bucket_id='qr-pagos' and public.is_catalog_manager());
  end if;
  if not exists (select 1 from pg_policies where schemaname='storage' and tablename='objects' and policyname='qr_payments_manager_delete') then
    create policy qr_payments_manager_delete on storage.objects
    for delete to authenticated using (bucket_id='qr-pagos' and public.is_catalog_manager());
  end if;
end $$;

-- Realtime para avisos de pedidos en el panel administrativo.
do $$
begin
  if exists (select 1 from pg_publication where pubname='supabase_realtime')
     and not exists (select 1 from pg_publication_tables
                     where pubname='supabase_realtime' and schemaname='public' and tablename='orders') then
    alter publication supabase_realtime add table public.orders;
  end if;
end $$;
