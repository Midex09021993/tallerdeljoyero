-- Reconciliación inicial de modalidades.
-- Una sede nueva nace con ambas modalidades apagadas.
-- Las sedes existentes conservan Producción si ya tenían capacidades productivas.
-- Servicios externos solo queda activo si la sede ya tiene trabajos externos reales.

update public.sede_modalidades sm
set
  produccion_activa = exists (
    select 1
    from public.sede_especialidades se
    join public.especialidades e on e.id = se.especialidad_id
    where se.sede_id = sm.sede_id
      and e.categoria = 'Producción'
      and e.nombre in ('Diseño 3D','Impresión 3D','Casting','Corte Láser','Taller')
  ),
  servicios_externos_activos = exists (
    select 1
    from public.trabajos t
    where t.sede_id = sm.sede_id
      and t.tipo = 'externo'
  ),
  updated_at = now();

notify pgrst, 'reload schema';
