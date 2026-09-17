create table if not exists public.ventas (
  id uuid default gen_random_uuid() primary key,
  almacen_id uuid not null,
  total numeric(12,2) not null default 0,
  metodo_pago text not null default 'Efectivo',
  monto_recibido numeric(12,2),
  vuelto numeric(12,2) default 0,
  referencia text,
  lector text,
  created_by uuid,
  created_at timestamptz not null default now()
);

alter table public.ventas add column if not exists created_by uuid;

create table if not exists public.detalle_ventas (
  id uuid default gen_random_uuid() primary key,
  venta_id uuid not null,
  producto_id uuid not null,
  cantidad integer not null default 1,
  precio numeric(12,2) not null default 0,
  created_at timestamptz not null default now(),
  constraint detalle_ventas_venta_fk
    foreign key (venta_id) references public.ventas(id) on delete cascade
);

create table if not exists public.cierre_caja (
  id uuid default gen_random_uuid() primary key,
  almacen_id uuid not null,
  fecha date not null default current_date,
  monto_efectivo_esperado numeric(12,2) not null default 0,
  monto_efectivo_real numeric(12,2) not null default 0,
  diferencia numeric(12,2) not null default 0,
  observaciones text,
  created_at timestamptz not null default now()
);

create index if not exists idx_ventas_almacen_fecha
  on public.ventas (almacen_id, created_at desc);

create index if not exists idx_cierre_caja_almacen_fecha
  on public.cierre_caja (almacen_id, fecha desc);

grant usage on schema public to service_role;
grant select, insert, update, delete on public.ventas to service_role;
grant select, insert, update, delete on public.detalle_ventas to service_role;
grant select, insert, update, delete on public.cierre_caja to service_role;

alter table public.ventas enable row level security;
alter table public.detalle_ventas enable row level security;
alter table public.cierre_caja enable row level security;

drop policy if exists "usuarios pueden consultar ventas de su almacen" on public.ventas;
create policy "usuarios pueden consultar ventas de su almacen"
  on public.ventas for select to authenticated
  using (
    almacen_id = (
      select p.almacen_id
      from public.perfiles p
      where p.id = auth.uid()
    )
  );

drop policy if exists "usuarios pueden consultar detalles de su almacen" on public.detalle_ventas;
create policy "usuarios pueden consultar detalles de su almacen"
  on public.detalle_ventas for select to authenticated
  using (
    exists (
      select 1
      from public.ventas v
      where v.id = detalle_ventas.venta_id
        and v.almacen_id = (
          select p.almacen_id
          from public.perfiles p
          where p.id = auth.uid()
        )
    )
  );

drop policy if exists "usuarios pueden consultar cierres de su almacen" on public.cierre_caja;
create policy "usuarios pueden consultar cierres de su almacen"
  on public.cierre_caja for select to authenticated
  using (
    almacen_id = (
      select p.almacen_id
      from public.perfiles p
      where p.id = auth.uid()
    )
  );
