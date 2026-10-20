-- Taller del Joyero: base inicial para Cursos y formación.
-- Ejecutar en Supabase SQL Editor después de revisar el esquema de producción.
-- Seguro para volver a ejecutar: crea tabla/índices/policies si no existen.
-- Ningún curso se publica automáticamente.

create table if not exists public.cursos_formacion (
  id uuid primary key default gen_random_uuid(),
  sede_id uuid not null references public.sedes(id) on delete cascade,
  creado_por uuid not null references auth.users(id) on delete restrict,
  titulo text not null check (char_length(trim(titulo)) between 3 and 160),
  descripcion text not null default '' check (char_length(descripcion) <= 10000),
  instructor text not null default '' check (char_length(instructor) <= 160),
  modalidad text not null default 'online' check (modalidad in ('online','presencial','hibrido')),
  nivel text not null default 'todos' check (nivel in ('principiante','intermedio','avanzado','todos')),
  duracion_horas numeric(7,2) check (duracion_horas is null or duracion_horas > 0),
  precio numeric(12,2) check (precio is null or precio >= 0),
  moneda text not null default 'PEN' check (moneda in ('PEN','USD')),
  imagen_url text,
  estado text not null default 'borrador'
    check (estado in ('borrador','pendiente_revision','cambios_solicitados','aprobado','rechazado','archivado')),
  publicado boolean not null default false,
  revision_comercial_por uuid references auth.users(id) on delete set null,
  revision_comercial_en timestamptz,
  comentario_revision text,
  publicado_en timestamptz,
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now(),
  constraint cursos_publicacion_aprobada check (not publicado or estado = 'aprobado')
);

create index if not exists cursos_formacion_sede_estado_idx
  on public.cursos_formacion (sede_id, estado, creado_en desc);

create index if not exists cursos_formacion_publicados_idx
  on public.cursos_formacion (publicado, publicado_en desc)
  where publicado = true;

create or replace function public.cursos_formacion_toca_actualizado_en()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.actualizado_en := now();
  if new.publicado and not old.publicado then
    new.publicado_en := now();
  elsif not new.publicado then
    new.publicado_en := null;
  end if;
  return new;
end;
$$;

drop trigger if exists cursos_formacion_actualizado_en on public.cursos_formacion;
create trigger cursos_formacion_actualizado_en
before update on public.cursos_formacion
for each row execute function public.cursos_formacion_toca_actualizado_en();

alter table public.cursos_formacion enable row level security;

-- El cliente solo puede consultar cursos públicos aprobados.
drop policy if exists cursos_publicos_solo_aprobados on public.cursos_formacion;
create policy cursos_publicos_solo_aprobados
on public.cursos_formacion
for select
to anon, authenticated
using (publicado = true and estado = 'aprobado');

-- Las escrituras quedan reservadas a RPCs autorizadas que se añadirán
-- junto con la interfaz de gestión. No se concede INSERT/UPDATE/DELETE directo.
revoke all on public.cursos_formacion from anon, authenticated;
grant select on public.cursos_formacion to anon, authenticated;

notify pgrst, 'reload schema';

select 'cursos_formacion creada' as resultado;
