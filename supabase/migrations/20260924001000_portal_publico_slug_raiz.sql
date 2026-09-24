-- Portal público por slug en la raíz del dominio.
-- El slug es identidad pública del taller, no una categoría técnica de URL.
-- Se bloquean rutas del sistema para evitar colisiones con el router.

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'catalogo_configuracion_slug_formato_chk'
      and conrelid = 'public.catalogo_configuracion'::regclass
  ) then
    alter table public.catalogo_configuracion
      add constraint catalogo_configuracion_slug_formato_chk
      check (
        slug = btrim(slug)
        and slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'
      ) not valid;
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'catalogo_configuracion_slug_reservado_chk'
      and conrelid = 'public.catalogo_configuracion'::regclass
  ) then
    alter table public.catalogo_configuracion
      add constraint catalogo_configuracion_slug_reservado_chk
      check (
        lower(btrim(slug)) not in (
          'auth',
          'c',
          'catalogo',
          'catalogo-publico',
          'inicio',
          'pedidos',
          'pedidos-2',
          'cotizaciones',
          'gestion',
          'operario',
          'taller',
          'herramientas',
          'perfil',
          'joya',
          'aurum-render',
          'aurum-render-public',
          'lovable'
        )
      ) not valid;
  end if;
end
$$;
