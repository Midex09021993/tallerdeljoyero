-- Reconciliación operativa oficial: acceso por participante y servicios externos existentes.
-- No crea pedidos ni trabajos. Solo repara vínculos canónicos y enruta trabajos
-- pendientes ya existentes cuando el taller origen carece de capacidad.
begin;

-- 1. Restaurar la relación canónica usuario -> participante para las cuentas
-- operativas actuales. Se toma la sede activa del perfil y el participante
-- activo correspondiente; no se crean usuarios ni se cambian roles.
insert into public.participante_cuentas (participante_id, user_id, relacion, estado)
select ep.id, p.id, 'principal', 'activo'
from public.profiles p
join public.ecosistema_participantes ep
  on ep.sede_id = p.sede_id
 and ep.estado = 'activo'
where p.activo = true
  and p.sede_id is not null
  and p.id in (
    '5d80fd40-b059-42e9-ad57-28ac5cf9899e',
    'd678f1f1-aea1-4c19-a8b2-b8522b8b9cb6',
    '177c0731-02ab-4167-9b34-824cf21526a6',
    'e4083d74-7dfa-4f86-9430-1a128b3bdeff'
  )
on conflict (participante_id, user_id)
do update set estado = 'activo', relacion = 'principal';

-- 2. Reconciliar trabajos pendientes existentes.
-- Solo se enruta una operación si el origen NO tiene esa capacidad y existe
-- exactamente un participante externo activo con la especialidad.
do $$
declare
  r record;
  v_destino uuid;
  v_candidatos integer;
begin
  for r in
    select t.id, t.area, t.sede_id
    from public.trabajos t
    where t.estado = 'pendiente'
      and coalesce(t.tipo, 'interno') = 'interno'
      and t.participante_id is null
      and t.responsable_user_id is null
      and not exists (
        select 1
        from public.ecosistema_participantes ep
        join public.participante_especialidades pe
          on pe.participante_id = ep.id
        join public.especialidades e
          on e.id = pe.especialidad_id
        where ep.sede_id = t.sede_id
          and ep.estado = 'activo'
          and e.activa = true
          and lower(trim(e.nombre)) = lower(trim(t.area))
      )
  loop
    select count(*), min(ep.id)
      into v_candidatos, v_destino
    from public.ecosistema_participantes ep
    join public.participante_especialidades pe
      on pe.participante_id = ep.id
    join public.especialidades e
      on e.id = pe.especialidad_id
    where ep.estado = 'activo'
      and ep.sede_id is not null
      and ep.sede_id <> r.sede_id
      and e.activa = true
      and lower(trim(e.nombre)) = lower(trim(r.area));

    if v_candidatos = 1 then
      update public.trabajos
      set tipo = 'externo',
          participante_id = v_destino,
          responsable_user_id = null,
          updated_at = now()
      where id = r.id;
    end if;
  end loop;
end $$;

notify pgrst, 'reload schema';
commit;
