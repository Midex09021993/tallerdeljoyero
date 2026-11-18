-- Documento contractual versionado y preparado para firma.
-- Conserva una instantánea de la plantilla usada para que un contrato generado no cambie
-- aunque el administrador modifique la plantilla posteriormente.

alter table public.contratos
  add column if not exists version integer not null default 1,
  add column if not exists cotizacion_id uuid references public.cotizaciones(id) on delete set null,
  add column if not exists identidad_comercial_id uuid references public.identidades_comerciales(id) on delete set null,
  add column if not exists plantilla_contrato_id uuid references public.plantillas_contrato(id) on delete set null,
  add column if not exists plantilla_version integer,
  add column if not exists estado_firma text not null default 'pendiente'
    check (estado_firma in ('pendiente','firmado_documento_subido','firmado_presencial','firmado_certificado'));

create index if not exists contratos_identidad_comercial_id_idx
  on public.contratos(identidad_comercial_id);

create index if not exists contratos_plantilla_contrato_id_idx
  on public.contratos(plantilla_contrato_id);

create table if not exists public.contrato_documentos (
  id uuid primary key default gen_random_uuid(),
  contrato_id uuid not null references public.contratos(id) on delete cascade,
  version integer not null default 1 check (version > 0),
  tipo text not null default 'original'
    check (tipo in ('original','firmado_documento_subido','firmado_presencial','firmado_certificado')),
  storage_path text not null,
  sha256 text not null,
  plantilla_version integer,
  plantilla_contenido jsonb not null default '{}'::jsonb,
  creado_por uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (contrato_id, version, tipo)
);

create index if not exists contrato_documentos_contrato_idx
  on public.contrato_documentos(contrato_id, version);

alter table public.contrato_documentos enable row level security;

drop policy if exists "contrato documentos ver" on public.contrato_documentos;
create policy "contrato documentos ver"
on public.contrato_documentos
for select to authenticated
using (
  exists (
    select 1
    from public.contratos c
    where c.id = contrato_documentos.contrato_id
      and (
        public.has_role(auth.uid(), 'dueno'::public.app_role)
        or public.has_role(auth.uid(), 'gerente'::public.app_role)
        or c.sede_id = public.mi_sede(auth.uid())
      )
  )
);

drop policy if exists "contrato documentos gestionar" on public.contrato_documentos;
create policy "contrato documentos gestionar"
on public.contrato_documentos
for all to authenticated
using (
  exists (
    select 1
    from public.contratos c
    where c.id = contrato_documentos.contrato_id
      and (
        public.has_role(auth.uid(), 'dueno'::public.app_role)
        or public.has_role(auth.uid(), 'gerente'::public.app_role)
      )
  )
)
with check (
  exists (
    select 1
    from public.contratos c
    where c.id = contrato_documentos.contrato_id
      and (
        public.has_role(auth.uid(), 'dueno'::public.app_role)
        or public.has_role(auth.uid(), 'gerente'::public.app_role)
      )
  )
);
