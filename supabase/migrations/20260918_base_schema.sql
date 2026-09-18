create extension if not exists pgcrypto;

create table if not exists public.almacenes (
  id uuid default gen_random_uuid() primary key,
  nombre text not null,
  telefono text,
  costo_suscripcion numeric(12,2) not null default 0,
  costo_mantenimiento numeric(12,2) not null default 0,
  suscripcion_vence_el timestamptz,
  mantenimiento_vence_el timestamptz,
  estado text not null default 'activo',
  creado_el timestamptz not null default now()
);

create table if not exists public.perfiles (
  id uuid primary key references auth.users(id) on delete cascade,
  almacen_id uuid references public.almacenes(id) on delete set null,
  nombre_completo text,
  rol text not null default 'dueno',
  activo boolean not null default true,
  creado_el timestamptz not null default now()
);

create table if not exists public.productos (
  id uuid default gen_random_uuid() primary key,
  almacen_id uuid references public.almacenes(id) on delete cascade,
  nombre text not null,
  precio numeric(12,2) not null default 0,
  stock integer not null default 0,
  categoria text not null default 'General',
  creado_el timestamptz not null default now()
);

create index if not exists idx_perfiles_almacen on public.perfiles (almacen_id);
create index if not exists idx_productos_almacen on public.productos (almacen_id);

grant usage on schema public to service_role;
grant select, insert, update, delete on public.almacenes to service_role;
grant select, insert, update, delete on public.perfiles to service_role;
grant select, insert, update, delete on public.productos to service_role;

alter table public.almacenes enable row level security;
alter table public.perfiles enable row level security;
alter table public.productos enable row level security;
