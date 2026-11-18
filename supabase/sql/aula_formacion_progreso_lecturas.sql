-- FADILAB · Aula de Formación
-- Progreso de lecturas guiadas por alumno.
-- Ejecutar una sola vez en Lovable Cloud / Supabase SQL Editor.
-- No modifica cursos, sesiones, exámenes ni archivos existentes.

begin;

do $$
begin
  if to_regclass('public.formacion_sesiones') is null then
    raise exception 'No existe public.formacion_sesiones. Verifica primero el esquema del Aula.';
  end if;
  if to_regprocedure('public.formacion_esta_inscrito(uuid,uuid)') is null then
    raise exception 'Falta public.formacion_esta_inscrito(uuid,uuid); no se creó la tabla de progreso.';
  end if;
end;
$$;

create table if not exists public.formacion_progreso_lecturas (
  alumno_user_id uuid not null references auth.users(id) on delete cascade,
  sesion_id uuid not null references public.formacion_sesiones(id) on delete cascade,
  completada_en timestamptz not null default now(),
  primary key (alumno_user_id, sesion_id)
);

alter table public.formacion_progreso_lecturas enable row level security;

drop policy if exists "alumno consulta su progreso de lecturas" on public.formacion_progreso_lecturas;
create policy "alumno consulta su progreso de lecturas"
on public.formacion_progreso_lecturas
for select
to authenticated
using (alumno_user_id = (select auth.uid()));

drop policy if exists "alumno marca lectura publicada completada" on public.formacion_progreso_lecturas;
create policy "alumno marca lectura publicada completada"
on public.formacion_progreso_lecturas
for insert
to authenticated
with check (
  alumno_user_id = (select auth.uid())
  and exists (
    select 1
    from public.formacion_sesiones s
    where s.id = sesion_id
      and s.publicada = true
      and public.formacion_esta_inscrito(s.curso_id, (select auth.uid()))
  )
);

revoke all on table public.formacion_progreso_lecturas from anon;
grant select, insert on table public.formacion_progreso_lecturas to authenticated;

commit;

-- Verificación: RLS habilitado y políticas de lectura/avance presentes.
select
  c.relrowsecurity as rls_habilitado,
  count(p.policyname) as politicas_configuradas
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
left join pg_policies p
  on p.schemaname = n.nspname
 and p.tablename = c.relname
where n.nspname = 'public'
  and c.relname = 'formacion_progreso_lecturas'
group by c.relrowsecurity;
