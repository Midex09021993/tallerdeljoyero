-- Restores schema already consumed by the current application.
create table if not exists public.contratos (
  id uuid primary key default gen_random_uuid(),
  numero text not null unique,
  cliente text not null default '',
  telefono text not null default '',
  origen text not null default '',
  total numeric not null default 0,
  abonado numeric not null default 0,
  saldo numeric not null default 0,
  sede_id uuid references public.sedes(id) on delete set null,
  notas text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.contrato_pagos (
  id uuid primary key default gen_random_uuid(),
  contrato_id uuid not null references public.contratos(id) on delete cascade,
  contrato_numero text not null default '',
  fecha date not null default current_date,
  concepto text not null default 'Abono',
  monto numeric not null check (monto > 0),
  usuario_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

alter table public.pedidos
  add column if not exists contrato_id uuid references public.contratos(id) on delete set null,
  add column if not exists ventas_estado text not null default 'Recibido en ventas',
  add column if not exists packing_estado text not null default 'Pendiente',
  add column if not exists medio_envio text not null default '',
  add column if not exists guia_envio text not null default '',
  add column if not exists fecha_envio date,
  add column if not exists fecha_entregado date,
  add column if not exists receptor_envio text not null default '',
  add column if not exists notas_ventas text not null default '',
  add column if not exists fecha_listo_entrega timestamptz,
  add column if not exists listo_entrega_observaciones text,
  add column if not exists notas_envio text,
  add column if not exists notas_entrega text,
  add column if not exists usuario_listo_entrega text,
  add column if not exists usuario_envio text,
  add column if not exists usuario_entrega text,
  add column if not exists ventas_actualizado_por text,
  add column if not exists ventas_actualizado_en timestamptz,
  add column if not exists enviado_at timestamptz,
  add column if not exists entregado_at timestamptz;

create index if not exists pedidos_contrato_id_idx on public.pedidos(contrato_id);
create index if not exists contrato_pagos_contrato_id_idx on public.contrato_pagos(contrato_id);

alter table public.contratos enable row level security;
alter table public.contrato_pagos enable row level security;

create policy "contratos ver" on public.contratos for select to authenticated
using ((select public.has_role((select auth.uid()), 'dueno'::public.app_role))
  or (select public.has_role((select auth.uid()), 'gerente'::public.app_role))
  or sede_id = (select public.mi_sede((select auth.uid()))));

create policy "contratos gestionar" on public.contratos for all to authenticated
using ((select public.has_role((select auth.uid()), 'dueno'::public.app_role))
  or (select public.has_role((select auth.uid()), 'gerente'::public.app_role)))
with check ((select public.has_role((select auth.uid()), 'dueno'::public.app_role))
  or (select public.has_role((select auth.uid()), 'gerente'::public.app_role)));

create policy "contrato_pagos ver" on public.contrato_pagos for select to authenticated
using (exists (select 1 from public.contratos c where c.id = contrato_id and (
  (select public.has_role((select auth.uid()), 'dueno'::public.app_role))
  or (select public.has_role((select auth.uid()), 'gerente'::public.app_role))
  or c.sede_id = (select public.mi_sede((select auth.uid())))
)));

create policy "contrato_pagos gestionar" on public.contrato_pagos for all to authenticated
using ((select public.has_role((select auth.uid()), 'dueno'::public.app_role))
  or (select public.has_role((select auth.uid()), 'gerente'::public.app_role)))
with check ((select public.has_role((select auth.uid()), 'dueno'::public.app_role))
  or (select public.has_role((select auth.uid()), 'gerente'::public.app_role)));
