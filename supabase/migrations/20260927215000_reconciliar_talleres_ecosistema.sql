-- Puente de reconciliacion: sede -> ecosistema_participante.
-- Es temporal/compatibilidad; la identidad canonica futura sera participante_id.
-- Se ejecuta antes de la limpieza y consolidacion para que ambas encuentren
-- un vinculo determinista y verificable.

alter table public.ecosistema_participantes
  add column if not exists sede_id uuid references public.sedes(id) on delete set null;

create unique index if not exists ecosistema_participantes_sede_unq
  on public.ecosistema_participantes(sede_id)
  where sede_id is not null;

-- El perimetro autorizado es explicito. Si faltan sedes, se crean;
-- no se eliminan ni modifican sedes fuera de este paso.
insert into public.sedes (nombre, ciudad, modo, activa)
values
  ('FADILAB', 'Trujillo', 'completo', true),
  ('JOYAS BOLIVAR', 'Medellín', 'completo', true),
  ('SIBERIANA', 'Lima', 'completo', true),
  ('Taller Chanduvi', 'Chiclayo', 'completo', true),
  ('Yamanik', 'Chiclayo', 'completo', true)
on conflict (nombre) do update
set ciudad = excluded.ciudad,
    activa = true,
    updated_at = now();

-- Cada sede autorizada debe tener exactamente un participante organizacion.
insert into public.ecosistema_participantes
  (tipo_participante, nombre, ciudad, estado, sede_id)
select
  'organizacion',
  s.nombre,
  s.ciudad,
  'activo',
  s.id
from public.sedes s
where lower(trim(s.nombre)) in (
  'fadilab','joyas bolivar','siberiana','taller chanduvi','yamanik'
)
and not exists (
  select 1
  from public.ecosistema_participantes ep
  where ep.sede_id = s.id
);

-- Si ya existia un participante por nombre pero sin puente, enlazarlo
-- solamente cuando no exista otro participante enlazado a esa sede.
update public.ecosistema_participantes ep
set sede_id = s.id,
    updated_at = now()
from public.sedes s
where ep.sede_id is null
  and lower(trim(ep.nombre)) = lower(trim(s.nombre))
  and lower(trim(s.nombre)) in (
    'fadilab','joyas bolivar','siberiana','taller chanduvi','yamanik'
  )
  and not exists (
    select 1 from public.ecosistema_participantes ep2
    where ep2.sede_id = s.id
  );

-- Asociar cuentas existentes a su participante equivalente.
insert into public.participante_cuentas
  (participante_id, user_id, relacion, estado)
select distinct ep.id, p.id, 'principal', 'activo'
from public.profiles p
join public.ecosistema_participantes ep on ep.sede_id = p.sede_id
where p.sede_id is not null
on conflict (participante_id, user_id) do update
set estado = 'activo';

insert into public.participante_cuentas
  (participante_id, user_id, relacion, estado)
select distinct ep.id, ur.user_id, 'miembro', 'activo'
from public.user_roles ur
join public.ecosistema_participantes ep on ep.sede_id = ur.sede_id
where ur.sede_id is not null
on conflict (participante_id, user_id) do update
set estado = 'activo';

-- Verificacion: el perimetro autorizado queda completo y sin duplicidad.
do $$
declare
  v_count integer;
begin
  select count(*)
    into v_count
  from public.sedes s
  where lower(trim(s.nombre)) in (
    'fadilab','joyas bolivar','siberiana','taller chanduvi','yamanik'
  )
  and exists (
    select 1 from public.ecosistema_participantes ep
    where ep.sede_id = s.id
      and lower(trim(ep.nombre)) = lower(trim(s.nombre))
      and ep.tipo_participante = 'organizacion'
  );

  if v_count <> 5 then
    raise exception 'Reconciliacion abortada: se esperaban 5 sedes con participante y se encontraron %', v_count;
  end if;

  if exists (
    select 1
    from public.ecosistema_participantes ep
    join public.sedes s on s.id = ep.sede_id
    group by ep.sede_id
    having count(*) > 1
  ) then
    raise exception 'Reconciliacion abortada: existe mas de un participante por sede';
  end if;
end $$;

create index if not exists ecosistema_participantes_sede_idx
  on public.ecosistema_participantes(sede_id);
