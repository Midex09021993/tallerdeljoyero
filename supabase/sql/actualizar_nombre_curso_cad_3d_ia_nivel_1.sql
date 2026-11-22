-- FADILAB · Actualización del nombre oficial del curso CAD 3D Nivel 1
-- Ejecutar manualmente en Lovable Cloud / Supabase SQL Editor.
-- Actualiza el registro existente para que el nuevo nombre se refleje en el aula del alumnado
-- y en la gestión docente. No crea cursos ni modifica sesiones, matrículas o evaluaciones.

begin;

do $$
declare
  v_old_title text := 'Diseño CAD 3D para Joyería e Introducción a la Manufactura Aditiva Nivel 1';
  v_new_title text := 'Diseño CAD 3D para Joyería y Manufactura Aditiva con Inteligencia Artificial – Nivel 1';
  v_new_description text := 'Formación profesional en diseño 3D, modelado de joyería, fabricación digital e inteligencia artificial aplicada.';
  v_matches integer;
  v_updated integer;
begin
  select count(*)
    into v_matches
    from public.formacion_cursos
   where titulo = v_old_title;

  if v_matches = 0 then
    raise notice 'No se encontró un curso con el título anterior exacto. No se modificó ningún registro.';
    return;
  end if;

  if v_matches > 1 then
    raise exception 'Se encontraron % cursos con el mismo título. No se modificó ninguno para evitar cambiar cursos de otros talleres.', v_matches;
  end if;

  update public.formacion_cursos
     set titulo = v_new_title,
         descripcion = v_new_description
   where titulo = v_old_title;

  get diagnostics v_updated = row_count;
  raise notice 'Curso actualizado: % registro(s).', v_updated;
end $$;

commit;

-- Verificación:
select id, titulo, descripcion, duracion_horas, estado
  from public.formacion_cursos
 where titulo = 'Diseño CAD 3D para Joyería y Manufactura Aditiva con Inteligencia Artificial – Nivel 1';
