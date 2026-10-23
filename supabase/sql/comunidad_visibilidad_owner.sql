-- Control de visibilidad de participantes en Comunidad.
-- Ejecutar manualmente en Lovable Cloud > Supabase SQL Editor ANTES
-- de aplicar directorio_comunidad_publica.sql actualizado.
-- No cambia el estado operativo del participante ni la visibilidad de su catálogo.

begin;

alter table public.ecosistema_participantes
  add column if not exists comunidad_visible boolean not null default true;

comment on column public.ecosistema_participantes.comunidad_visible is
  'Controla si el participante aparece en el directorio público Comunidad. No modifica su estado ni su catálogo.';

-- Verificación de la columna y su valor predeterminado.
select column_name, data_type, column_default, is_nullable
from information_schema.columns
where table_schema = 'public'
  and table_name = 'ecosistema_participantes'
  and column_name = 'comunidad_visible';

-- Vista previa de los participantes y su visibilidad actual.
select id, nombre, tipo_participante, estado, comunidad_visible
from public.ecosistema_participantes
order by nombre;

commit;
