-- Canonical rule:
-- 1 taller (participante) = 1 identidad comercial activa.
-- FADILAB is the commercial identity of FADILAB only; it must never
-- become the identity of another workshop through sede legacy mapping.

begin;

-- 1. Reubicar la identidad legal de FADILAB al participante FADILAB.
-- No se toca ningún otro dato fiscal/comercial.
do $$
declare
  v_participante_id uuid;
  v_sede_id uuid;
begin
  select ep.id, ep.sede_id
    into v_participante_id, v_sede_id
  from public.ecosistema_participantes ep
  where ep.estado = 'activo'
    and upper(trim(ep.nombre)) = 'FADILAB'
  order by ep.created_at
  limit 1;

  if v_participante_id is not null then
    update public.identidades_comerciales
    set
      participante_id = v_participante_id,
      sede_id = v_sede_id,
      updated_at = now()
    where nombre_comercial = 'FADILAB'
      and razon_social = 'FADILAB E.I.R.L.'
      and ruc = '20612717789'
      and (
        participante_id is distinct from v_participante_id
        or sede_id is distinct from v_sede_id
      );
  else
    -- Si todavía no existe el participante FADILAB, la identidad legal
    -- queda sin propietario operativo y nunca se hereda a otro taller.
    update public.identidades_comerciales
    set
      participante_id = null,
      sede_id = null,
      updated_at = now()
    where nombre_comercial = 'FADILAB'
      and razon_social = 'FADILAB E.I.R.L.'
      and ruc = '20612717789';
  end if;
end;
$$;

-- 2. Toda identidad que todavía esté ligada por sede a un participante
-- activo recibe su participante canónico.
update public.identidades_comerciales ic
set participante_id = ep.id,
    updated_at = now()
from public.ecosistema_participantes ep
where ic.participante_id is null
  and ic.sede_id = ep.sede_id
  and ep.estado = 'activo';

-- 3. Si existieran varias identidades activas para el mismo taller,
-- conservamos la más recientemente actualizada y desactivamos las demás.
with ordenadas as (
  select
    id,
    row_number() over (
      partition by participante_id
      order by updated_at desc nulls last, created_at desc nulls last, id desc
    ) as rn
  from public.identidades_comerciales
  where activa = true
    and participante_id is not null
)
update public.identidades_comerciales ic
set activa = false,
    updated_at = now()
from ordenadas o
where o.id = ic.id
  and o.rn > 1;

-- 4. Garantía estructural: un solo perfil comercial activo por taller.
create unique index if not exists identidades_comerciales_unica_activa_participante_idx
on public.identidades_comerciales (participante_id)
where activa = true and participante_id is not null;

commit;

notify pgrst, 'reload schema';
