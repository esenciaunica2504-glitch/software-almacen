create table if not exists public.clientes (
  id uuid default gen_random_uuid() primary key,
  almacen_id uuid not null,
  nombre text not null,
  telefono text,
  email text,
  notas text,
  created_at timestamptz not null default now()
);

alter table public.ventas add column if not exists cliente_id uuid;

create index if not exists idx_clientes_almacen_nombre
  on public.clientes (almacen_id, nombre);

create index if not exists idx_ventas_cliente
  on public.ventas (cliente_id);

grant usage on schema public to service_role;
grant select, insert, update, delete on public.clientes to service_role;

alter table public.clientes enable row level security;

drop policy if exists "usuarios pueden consultar clientes de su almacen" on public.clientes;
create policy "usuarios pueden consultar clientes de su almacen"
  on public.clientes for select to authenticated
  using (
    almacen_id = (
      select p.almacen_id
      from public.perfiles p
      where p.id = auth.uid()
    )
  );
