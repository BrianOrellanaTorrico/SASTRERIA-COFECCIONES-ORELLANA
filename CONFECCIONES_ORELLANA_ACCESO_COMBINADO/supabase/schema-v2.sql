-- CONFECCIONES ORELLANA | Esquema nuevo v2
-- Ejecutar SOLO en un proyecto Supabase nuevo/vacío desde SQL Editor.
-- No contiene credenciales. El acceso público solo puede enviar solicitudes validadas;
-- los datos de pedidos nunca se exponen mediante SELECT público.

create extension if not exists pgcrypto;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default '',
  phone text,
  role text not null default 'client' check (role in ('owner','admin','client')),
  permissions text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.garments (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category text not null check (category in ('femenina','masculina','arreglos')),
  description text not null default '',
  sewing_price numeric(12,2) check (sewing_price is null or sewing_price >= 0),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(name, category)
);

create table public.fabrics (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  description text not null default '',
  price_per_meter numeric(12,2) check (price_per_meter is null or price_per_meter >= 0),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.garment_fabrics (
  garment_id uuid not null references public.garments(id) on delete cascade,
  fabric_id uuid not null references public.fabrics(id) on delete cascade,
  primary key (garment_id, fabric_id)
);

create table public.garment_images (
  id uuid primary key default gen_random_uuid(),
  garment_id uuid not null references public.garments(id) on delete cascade,
  storage_path text not null,
  alt_text text not null default '',
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid references auth.users(id) on delete set null,
  customer_name text not null,
  customer_phone text not null,
  order_details jsonb not null default '{}'::jsonb,
  quoted_total numeric(12,2) check (quoted_total is null or quoted_total >= 0),
  status text not null default 'pendiente',
  payment_status text not null default 'sin_revisar',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index orders_created_at_idx on public.orders(created_at desc);
create index orders_customer_id_idx on public.orders(customer_id);
create index garments_category_active_idx on public.garments(category, active);

create or replace function public.is_owner()
returns boolean
language sql stable security definer
set search_path = public, auth
as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'owner');
$$;

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql security definer
set search_path = public
as $$
begin
  insert into public.profiles(id, display_name, phone)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.email, ''),
    new.phone
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created_profile on auth.users;
create trigger on_auth_user_created_profile
after insert on auth.users
for each row execute procedure public.handle_new_auth_user();

create or replace function public.has_permission(required_permission text)
returns boolean
language sql stable security definer
set search_path = public, auth
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and (
        p.role = 'owner'
        or (p.role = 'admin' and required_permission = any(p.permissions))
      )
  );
$$;

create or replace function public.submit_public_order(
  p_customer_name text,
  p_customer_phone text,
  p_order_details jsonb,
  p_quoted_total numeric default null
)
returns uuid
language plpgsql
security definer
set search_path = public, auth
as $$
declare new_order_id uuid;
begin
  if p_customer_name is null or length(trim(p_customer_name)) < 3 or length(p_customer_name) > 120 then
    raise exception 'Nombre no válido.';
  end if;
  if p_customer_phone is null or length(regexp_replace(p_customer_phone, '[^0-9+]', '', 'g')) < 7
     or length(p_customer_phone) > 30 then
    raise exception 'Teléfono no válido.';
  end if;
  if p_order_details is null or jsonb_typeof(p_order_details) <> 'object'
     or octet_length(p_order_details::text) > 20000 then
    raise exception 'Los detalles del pedido no son válidos.';
  end if;
  if p_quoted_total is not null and (p_quoted_total < 0 or p_quoted_total > 100000000) then
    raise exception 'Total no válido.';
  end if;

  insert into public.orders(customer_id, customer_name, customer_phone, order_details, quoted_total, status, payment_status)
  values (auth.uid(), trim(p_customer_name), trim(p_customer_phone), p_order_details, p_quoted_total,
          'pendiente', 'sin_revisar')
  returning id into new_order_id;
  return new_order_id;
end;
$$;

create or replace function public.set_order_payment_status(
  p_order_id uuid,
  p_payment_status text
)
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  if not public.has_permission('pagos') then
    raise exception 'No tienes permiso para verificar pagos.';
  end if;
  if p_payment_status not in ('sin_revisar','verificado','rechazado') then
    raise exception 'Estado de pago no válido.';
  end if;
  update public.orders
  set payment_status = p_payment_status, updated_at = now()
  where id = p_order_id;
  if not found then raise exception 'Pedido no encontrado.'; end if;
end;
$$;
revoke all on function public.set_order_payment_status(uuid,text) from public;
grant execute on function public.set_order_payment_status(uuid,text) to authenticated;

alter table public.profiles enable row level security;
alter table public.garments enable row level security;
alter table public.fabrics enable row level security;
alter table public.garment_fabrics enable row level security;
alter table public.garment_images enable row level security;
alter table public.orders enable row level security;

create policy profiles_read_self_or_owner on public.profiles
for select to authenticated using (id = auth.uid() or public.has_permission('cuentas'));

create policy profiles_owner_manage on public.profiles
for all to authenticated
using (public.is_owner())
with check (public.is_owner());

-- Un administrador con permiso de cuentas puede registrar el perfil de una cuenta
-- Auth ya creada, pero solo como administrador delegado; nunca puede crear propietarios.
create policy profiles_admin_create_delegate on public.profiles
for insert to authenticated
with check (role = 'admin' and public.has_permission('cuentas'));

create policy garments_public_read on public.garments
for select to anon, authenticated using (active or public.has_permission('catalogo'));
create policy garments_manager_write on public.garments
for all to authenticated using (public.has_permission('catalogo'))
with check (public.has_permission('catalogo'));

create policy fabrics_public_read on public.fabrics
for select to anon, authenticated using (active or public.has_permission('catalogo'));
create policy fabrics_manager_write on public.fabrics
for all to authenticated using (public.has_permission('catalogo'))
with check (public.has_permission('catalogo'));

create policy garment_fabrics_public_read on public.garment_fabrics
for select to anon, authenticated using (true);
create policy garment_fabrics_manager_write on public.garment_fabrics
for all to authenticated using (public.has_permission('catalogo'))
with check (public.has_permission('catalogo'));

create policy garment_images_public_read on public.garment_images
for select to anon, authenticated using (true);
create policy garment_images_manager_write on public.garment_images
for all to authenticated using (public.has_permission('catalogo'))
with check (public.has_permission('catalogo'));

create policy orders_customer_read_own on public.orders
for select to authenticated using (customer_id = auth.uid());
create policy orders_manager_read on public.orders
for select to authenticated using (public.has_permission('pedidos') or public.has_permission('pagos'));
create policy orders_manager_update on public.orders
for update to authenticated using (public.has_permission('pedidos'))
with check (public.has_permission('pedidos'));

revoke all on function public.submit_public_order(text,text,jsonb,numeric) from public;
grant execute on function public.submit_public_order(text,text,jsonb,numeric) to anon, authenticated;

insert into storage.buckets(id,name,public)
values ('catalogo','catalogo',true);

create policy catalog_images_public_read on storage.objects
for select to anon, authenticated using (bucket_id = 'catalogo');
create policy catalog_images_manager_insert on storage.objects
for insert to authenticated with check (bucket_id = 'catalogo' and public.has_permission('catalogo'));
create policy catalog_images_manager_update on storage.objects
for update to authenticated using (bucket_id = 'catalogo' and public.has_permission('catalogo'))
with check (bucket_id = 'catalogo' and public.has_permission('catalogo'));
create policy catalog_images_manager_delete on storage.objects
for delete to authenticated using (bucket_id = 'catalogo' and public.has_permission('catalogo'));


-- Catálogo inicial aprobado. Los precios quedan NULL hasta que el taller los confirme.
insert into public.garments(name, category, description, sewing_price) values
('Polleras','femenina','',null),
('Vestidos de 15','femenina','',null),
('Faldas','femenina','',null),
('Vestidos maternos','femenina','',null),
('Vestidos de novia','femenina','',null),
('Vestidos de novia para cholitas','femenina','',null),
('Pantalones','masculina','',null),
('Sacos','masculina','',null),
('Busos','arreglos','Servicio de arreglo',null),
('Jeans','arreglos','Servicio de arreglo',null),
('Chamarras','arreglos','Servicio de arreglo',null),
('Camisas','arreglos','Servicio de arreglo',null),
('Poleras','arreglos','Servicio de arreglo',null),
('Pantalones','arreglos','Servicio de arreglo',null)
on conflict (name, category) do nothing;

-- Las cuentas Auth nuevas reciben perfil client automáticamente. El propietario inicial se promueve manualmente.
-- El primer propietario se crea manualmente tras registrar su cuenta en Auth.
-- Sustituye el UUID por auth.users.id desde el panel seguro de Supabase:
-- update public.profiles
-- set display_name = 'Propietario', role = 'owner',
--     permissions = array['pedidos','pagos','catalogo','cuentas']
-- where id = 'UUID-AQUI';
