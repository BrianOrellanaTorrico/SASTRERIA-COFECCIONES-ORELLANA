-- CONFECCIONES ORELLANA | Ubicación pública y galería del taller
-- Ejecutar una sola vez en Supabase SQL Editor.
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

drop policy if exists "store_location_public_read" on public.store_location;
create policy "store_location_public_read" on public.store_location
for select to anon, authenticated using (true);

drop policy if exists "store_location_manager_insert" on public.store_location;
create policy "store_location_manager_insert" on public.store_location
for insert to authenticated with check (public.is_catalog_manager());

drop policy if exists "store_location_manager_update" on public.store_location;
create policy "store_location_manager_update" on public.store_location
for update to authenticated using (public.is_catalog_manager())
with check (public.is_catalog_manager());

drop policy if exists "store_location_images_public_read" on public.store_location_images;
create policy "store_location_images_public_read" on public.store_location_images
for select to anon, authenticated using (true);

drop policy if exists "store_location_images_manager_insert" on public.store_location_images;
create policy "store_location_images_manager_insert" on public.store_location_images
for insert to authenticated with check (public.is_catalog_manager());

drop policy if exists "store_location_images_manager_delete" on public.store_location_images;
create policy "store_location_images_manager_delete" on public.store_location_images
for delete to authenticated using (public.is_catalog_manager());

insert into public.store_location (id,address,map_query,maps_url)
values (true,'','CONFECCIONES ORELLANA','https://goo.gl/maps/1KyVvY3ZVWbn6QiV8?g_st=ac')
on conflict (id) do nothing;

-- Las fotografías se guardan en el bucket público existente "catalogo",
-- dentro de la carpeta "ubicacion/". Se reutilizan sus políticas de Storage
-- para lectura pública y carga/borrado por cuentas owner/admin.
