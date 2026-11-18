-- Capacidades externas iniciales del ecosistema.
-- FADILAB es un taller/joyería (organización), no un usuario externo.
-- Se habilita como proveedor de la especialidad Diseño 3D sin cambiar su identidad.

insert into public.especialidades (nombre, categoria, activa)
values ('Diseño 3D', 'Producción / Diseño', true)
on conflict (nombre) do update
set categoria = coalesce(public.especialidades.categoria, excluded.categoria),
    activa = true;

insert into public.participante_especialidades (participante_id, especialidad_id)
select ep.id, e.id
from public.ecosistema_participantes ep
cross join public.especialidades e
where lower(trim(ep.nombre)) = 'fadilab'
  and lower(trim(e.nombre)) = 'diseño 3d'
  and ep.estado = 'activo'
on conflict (participante_id, especialidad_id) do nothing;
