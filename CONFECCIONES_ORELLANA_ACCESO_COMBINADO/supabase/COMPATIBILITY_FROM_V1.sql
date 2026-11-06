-- CONFECCIONES ORELLANA
-- Compatibilidad para la base V1 creada con categories/products/orders/profiles.
-- Añade el esquema que espera el ZIP ENSAMBLE ACTUALIZADO sin borrar tablas ni datos.
-- Ejecutar una sola vez en Supabase SQL Editor. Puede volver a ejecutarse.

create extension if not exists pgcrypto;

-- 1) Ampliar perfiles existentes con los nombres que utiliza el panel nuevo.
alter table public.profiles add column if not exists display_name text not null default '';
alter table public.profiles add column if not exists phone text;
alter table public.profiles add column if not exists role text not null default 'client';
update public.profiles
set display_name = coalesce(nullif(display_name, ''), nombre, ''),
    phone = coalesce(phone, telefono),
    role = case rol when 'propietario' then 'owner' when 'admin' then 'admin' else 'client' end
where display_name is distinct from coalesce(nullif(display_name, ''), nombre, '')
   or phone is distinct from coalesce(phone, telefono)
   or role is distinct from case rol when 'propietario' then 'owner' when 'admin' then 'admin' else 'client' end;

create or replace function public.orellana_sync_profile_columns()
returns trigger language plpgsql set search_path = public as $$
begin
  if new.display_name is null or new.display_name = '' then new.display_name := coalesce(new.nombre, '');
  else new.nombre := new.display_name; end if;
  if new.phone is null then new.phone := new.telefono; else new.telefono := new.phone; end if;
  if new.role = 'owner' then new.rol := 'propietario';
  elsif new.role = 'admin' then new.rol := 'admin';
  else new.rol := 'cliente'; end if;
  return new;
end; $$;

do $$ begin
  if not exists (select 1 from pg_trigger where tgname='orellana_sync_profile_columns_trg' and tgrelid='public.profiles'::regclass and not tgisinternal) then
    create trigger orellana_sync_profile_columns_trg before insert or update on public.profiles
    for each row execute function public.orellana_sync_profile_columns();
  end if;
end $$;

-- 2) Ampliar fabrics sin sustituir la tabla existente.
alter table public.fabrics add column if not exists name text;
alter table public.fabrics add column if not exists description text not null default '';
alter table public.fabrics add column if not exists price_per_meter numeric(12,2);
alter table public.fabrics add column if not exists active boolean not null default true;
update public.fabrics set name=coalesce(name,nombre), description=coalesce(nullif(description,''),descripcion,''),
  price_per_meter=coalesce(price_per_meter,precio_metro), active=coalesce(active,activo,true)
where name is distinct from coalesce(name,nombre)
   or description is distinct from coalesce(nullif(description,''),descripcion,'')
   or price_per_meter is distinct from coalesce(price_per_meter,precio_metro)
   or active is distinct from coalesce(active,activo,true);

create or replace function public.orellana_sync_fabric_columns()
returns trigger language plpgsql set search_path = public as $$
begin
  if new.name is null then new.name := new.nombre; else new.nombre := new.name; end if;
  if new.description is null or new.description = '' then new.description := coalesce(new.descripcion,''); else new.descripcion := new.description; end if;
  if new.price_per_meter is null then new.price_per_meter := new.precio_metro; else new.precio_metro := new.price_per_meter; end if;
  new.active := coalesce(new.active,new.activo,true); new.activo := new.active;
  return new;
end; $$;

do $$ begin
  if not exists (select 1 from pg_trigger where tgname='orellana_sync_fabric_columns_trg' and tgrelid='public.fabrics'::regclass and not tgisinternal) then
    create trigger orellana_sync_fabric_columns_trg before insert or update on public.fabrics
    for each row execute function public.orellana_sync_fabric_columns();
  end if;
end $$;
create unique index if not exists fabrics_name_compat_unique on public.fabrics(name) where name is not null;

-- 3) Tabla de prendas que consume el ZIP actual.
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
create table if not exists public.garment_fabrics (
  garment_id uuid not null references public.garments(id) on delete cascade,
  fabric_id uuid not null references public.fabrics(id) on delete cascade,
  primary key (garment_id,fabric_id)
);
create table if not exists public.garment_images (
  id uuid primary key default gen_random_uuid(),
  garment_id uuid not null references public.garments(id) on delete cascade,
  storage_path text not null,
  alt_text text not null default '',
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

-- Copiar, sin borrar, los productos/categorías creados en la primera inicialización.
insert into public.garments (id,name,category,description,sewing_price,active)
select p.id,p.nombre,c.tipo,coalesce(p.descripcion,''),coalesce(p.precio_costura,0),coalesce(p.activo,true)
from public.products p join public.categories c on c.id=p.category_id
on conflict (id) do nothing;
insert into public.garment_fabrics (garment_id,fabric_id)
select pf.product_id,pf.fabric_id from public.product_fabrics pf
join public.garments g on g.id=pf.product_id
join public.fabrics f on f.id=pf.fabric_id
on conflict do nothing;

-- 4) Ampliar pedidos para el formato JSON que utiliza la web nueva.
alter table public.orders alter column nombre_cliente set default '';
alter table public.orders alter column telefono set default '';
alter table public.orders add column if not exists customer_name text;
alter table public.orders add column if not exists customer_phone text;
alter table public.orders add column if not exists order_details jsonb not null default '{}'::jsonb;
alter table public.orders add column if not exists quoted_total numeric(12,2);
alter table public.orders add column if not exists status text not null default 'pendiente';
alter table public.orders add column if not exists payment_status text not null default 'sin_revisar';
update public.orders set customer_name=coalesce(nullif(customer_name,''),nombre_cliente,''),
  customer_phone=coalesce(nullif(customer_phone,''),telefono,''),
  status=coalesce(nullif(estado,''),status,'pendiente'),
  payment_status=case when pago_estado='pagado' then 'pagado' when pago_estado='rechazado' then 'rechazado' when pago_estado='sin_pago' then 'no_requerido' else 'sin_revisar' end,
  quoted_total=case when total=0 then null else total end
where customer_name is distinct from coalesce(nullif(customer_name,''),nombre_cliente,'')
   or customer_phone is distinct from coalesce(nullif(customer_phone,''),telefono,'')
   or status is distinct from coalesce(nullif(estado,''),status,'pendiente')
   or payment_status is distinct from case when pago_estado='pagado' then 'pagado' when pago_estado='rechazado' then 'rechazado' when pago_estado='sin_pago' then 'no_requerido' else 'sin_revisar' end
   or quoted_total is distinct from case when total=0 then null else total end;

create or replace function public.orellana_sync_order_columns()
returns trigger language plpgsql set search_path = public as $$
begin
  if new.customer_name is null or new.customer_name='' then new.customer_name := coalesce(new.nombre_cliente,'');
  else new.nombre_cliente := new.customer_name; end if;
  if new.customer_phone is null or new.customer_phone='' then new.customer_phone := coalesce(new.telefono,'');
  else new.telefono := new.customer_phone; end if;
  if new.status is null then new.status := coalesce(new.estado,'pendiente'); else new.estado := new.status; end if;
  if new.payment_status is null then
    new.payment_status := case new.pago_estado when 'pagado' then 'pagado' when 'rechazado' then 'rechazado' when 'sin_pago' then 'no_requerido' else 'sin_revisar' end;
  end if;
  if new.payment_status='pagado' then new.pago_estado := 'pagado';
  elsif new.payment_status='rechazado' then new.pago_estado := 'rechazado';
  elsif new.payment_status='no_requerido' then new.pago_estado := 'sin_pago';
  else new.pago_estado := 'pendiente_revision'; end if;
  if new.quoted_total is not null then new.total := new.quoted_total; end if;
  return new;
end; $$;

do $$ begin
  if not exists (select 1 from pg_trigger where tgname='orellana_sync_order_columns_trg' and tgrelid='public.orders'::regclass and not tgisinternal) then
    create trigger orellana_sync_order_columns_trg before insert or update on public.orders
    for each row execute function public.orellana_sync_order_columns();
  end if;
end $$;

-- 5) Ajustes del sitio (QR y fotografía de ubicación).
create table if not exists public.site_settings (
  id smallint primary key default 1 check (id=1),
  qr_storage_path text,
  location_photo_path text,
  updated_at timestamptz not null default now()
);
insert into public.site_settings (id,qr_storage_path,location_photo_path)
values (1,null,null) on conflict (id) do nothing;

-- 6) Funciones de autorización compatibles con los roles antiguos y nuevos.
create or replace function public.is_catalog_manager()
returns boolean language sql stable security definer set search_path=public as $$
  select exists(select 1 from public.profiles where id=auth.uid() and role in ('owner','admin'));
$$;
create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path=public as $$
  select exists(select 1 from public.profiles where id=auth.uid() and (role in ('owner','admin') or rol in ('propietario','admin')));
$$;

-- 7) RLS y permisos.
alter table public.profiles enable row level security;
alter table public.fabrics enable row level security;
alter table public.garments enable row level security;
alter table public.garment_fabrics enable row level security;
alter table public.garment_images enable row level security;
alter table public.orders enable row level security;
alter table public.site_settings enable row level security;
grant usage on schema public to anon,authenticated;
grant select on public.garments,public.fabrics,public.garment_fabrics,public.garment_images,public.site_settings to anon,authenticated;
grant select on public.profiles to authenticated;
grant insert on public.orders to anon;
grant select,insert,update on public.orders to authenticated;
grant insert,update,delete on public.garments,public.fabrics,public.garment_fabrics,public.garment_images to authenticated;
grant insert,update on public.site_settings to authenticated;

do $$ begin
  if not exists(select 1 from pg_policies where schemaname='public' and tablename='profiles' and policyname='profiles_read_own_or_managers') then
    create policy profiles_read_own_or_managers on public.profiles for select to authenticated using(id=auth.uid() or public.is_catalog_manager()); end if;
  if not exists(select 1 from pg_policies where schemaname='public' and tablename='garments' and policyname='catalog_public_read_garments') then
    create policy catalog_public_read_garments on public.garments for select to anon,authenticated using(active=true or public.is_catalog_manager()); end if;
  if not exists(select 1 from pg_policies where schemaname='public' and tablename='garments' and policyname='catalog_manager_write_garments') then
    create policy catalog_manager_write_garments on public.garments for all to authenticated using(public.is_catalog_manager()) with check(public.is_catalog_manager()); end if;
  if not exists(select 1 from pg_policies where schemaname='public' and tablename='fabrics' and policyname='catalog_public_read_fabrics') then
    create policy catalog_public_read_fabrics on public.fabrics for select to anon,authenticated using(active=true or public.is_catalog_manager()); end if;
  if not exists(select 1 from pg_policies where schemaname='public' and tablename='fabrics' and policyname='catalog_manager_write_fabrics') then
    create policy catalog_manager_write_fabrics on public.fabrics for all to authenticated using(public.is_catalog_manager()) with check(public.is_catalog_manager()); end if;
  if not exists(select 1 from pg_policies where schemaname='public' and tablename='garment_fabrics' and policyname='catalog_public_read_compatibility') then
    create policy catalog_public_read_compatibility on public.garment_fabrics for select to anon,authenticated using(true); end if;
  if not exists(select 1 from pg_policies where schemaname='public' and tablename='garment_fabrics' and policyname='catalog_manager_write_compatibility') then
    create policy catalog_manager_write_compatibility on public.garment_fabrics for all to authenticated using(public.is_catalog_manager()) with check(public.is_catalog_manager()); end if;
  if not exists(select 1 from pg_policies where schemaname='public' and tablename='garment_images' and policyname='catalog_public_read_images') then
    create policy catalog_public_read_images on public.garment_images for select to anon,authenticated using(true); end if;
  if not exists(select 1 from pg_policies where schemaname='public' and tablename='garment_images' and policyname='catalog_manager_write_images') then
    create policy catalog_manager_write_images on public.garment_images for all to authenticated using(public.is_catalog_manager()) with check(public.is_catalog_manager()); end if;
  if not exists(select 1 from pg_policies where schemaname='public' and tablename='orders' and policyname='orders_public_test_insert') then
    create policy orders_public_test_insert on public.orders for insert to anon with check(customer_id is null and length(btrim(customer_name)) between 2 and 120 and length(btrim(customer_phone)) between 7 and 25 and jsonb_typeof(order_details)='object' and pg_column_size(order_details)<=65536 and quoted_total is null and status='pendiente' and payment_status in ('sin_revisar','no_requerido')); end if;
  if not exists(select 1 from pg_policies where schemaname='public' and tablename='orders' and policyname='orders_authenticated_test_insert') then
    create policy orders_authenticated_test_insert on public.orders for insert to authenticated with check(customer_id is null and length(btrim(customer_name)) between 2 and 120 and jsonb_typeof(order_details)='object' and quoted_total is null and status='pendiente' and payment_status in ('sin_revisar','no_requerido')); end if;
  if not exists(select 1 from pg_policies where schemaname='public' and tablename='orders' and policyname='orders_customer_read_own') then
    create policy orders_customer_read_own on public.orders for select to authenticated using(customer_id=auth.uid() or public.is_catalog_manager()); end if;
  if not exists(select 1 from pg_policies where schemaname='public' and tablename='orders' and policyname='orders_manager_update') then
    create policy orders_manager_update on public.orders for update to authenticated using(public.is_catalog_manager()) with check(public.is_catalog_manager()); end if;
  if not exists(select 1 from pg_policies where schemaname='public' and tablename='site_settings' and policyname='site_settings_public_read') then
    create policy site_settings_public_read on public.site_settings for select to anon,authenticated using(true); end if;
  if not exists(select 1 from pg_policies where schemaname='public' and tablename='site_settings' and policyname='site_settings_manager_write') then
    create policy site_settings_manager_write on public.site_settings for all to authenticated using(public.is_catalog_manager()) with check(public.is_catalog_manager()); end if;
end $$;

-- 8) Buckets y políticas de Storage sin eliminar políticas existentes.
insert into storage.buckets(id,name,public) values('catalogo','catalogo',true)
on conflict(id) do update set public=true;
insert into storage.buckets(id,name,public) values('qr-pagos','qr-pagos',true)
on conflict(id) do update set public=true;
do $$ begin
  if not exists(select 1 from pg_policies where schemaname='storage' and tablename='objects' and policyname='catalog_images_public_read') then
    create policy catalog_images_public_read on storage.objects for select to anon,authenticated using(bucket_id='catalogo'); end if;
  if not exists(select 1 from pg_policies where schemaname='storage' and tablename='objects' and policyname='catalog_images_manager_upload') then
    create policy catalog_images_manager_upload on storage.objects for insert to authenticated with check(bucket_id='catalogo' and public.is_catalog_manager()); end if;
  if not exists(select 1 from pg_policies where schemaname='storage' and tablename='objects' and policyname='catalog_images_manager_update') then
    create policy catalog_images_manager_update on storage.objects for update to authenticated using(bucket_id='catalogo' and public.is_catalog_manager()) with check(bucket_id='catalogo' and public.is_catalog_manager()); end if;
  if not exists(select 1 from pg_policies where schemaname='storage' and tablename='objects' and policyname='catalog_images_manager_delete') then
    create policy catalog_images_manager_delete on storage.objects for delete to authenticated using(bucket_id='catalogo' and public.is_catalog_manager()); end if;
  if not exists(select 1 from pg_policies where schemaname='storage' and tablename='objects' and policyname='qr_payments_public_read') then
    create policy qr_payments_public_read on storage.objects for select to anon,authenticated using(bucket_id='qr-pagos'); end if;
  if not exists(select 1 from pg_policies where schemaname='storage' and tablename='objects' and policyname='qr_payments_manager_upload') then
    create policy qr_payments_manager_upload on storage.objects for insert to authenticated with check(bucket_id='qr-pagos' and public.is_catalog_manager()); end if;
  if not exists(select 1 from pg_policies where schemaname='storage' and tablename='objects' and policyname='qr_payments_manager_update') then
    create policy qr_payments_manager_update on storage.objects for update to authenticated using(bucket_id='qr-pagos' and public.is_catalog_manager()) with check(bucket_id='qr-pagos' and public.is_catalog_manager()); end if;
  if not exists(select 1 from pg_policies where schemaname='storage' and tablename='objects' and policyname='qr_payments_manager_delete') then
    create policy qr_payments_manager_delete on storage.objects for delete to authenticated using(bucket_id='qr-pagos' and public.is_catalog_manager()); end if;
end $$;

-- 9) Realtime para que admin reciba avisos mientras el panel está abierto.
do $$ begin
  if exists(select 1 from pg_publication where pubname='supabase_realtime') and not exists(
    select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='orders'
  ) then alter publication supabase_realtime add table public.orders; end if;
end $$;

-- Fin: no se borran tablas, filas ni políticas existentes.