-- Expone únicamente la URL del PDF ya generado para el portal público.
-- El archivo vive en un bucket público de lectura; no se exponen rutas internas
-- ni se permite consultar directamente la tabla de documentos desde anon.

create or replace function public.seguimiento_cotizacion_pdf_url(_codigo text)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select d.public_url
  from public.cotizaciones c
  join public.cotizacion_documentos_publicos d
    on d.cotizacion_id = c.id
   and d.version = c.version
  where c.seguimiento_codigo = upper(trim(_codigo))
    and c.estado in ('enviada', 'requiere_revision', 'aprobada', 'rechazada', 'vencida')
  order by d.created_at desc
  limit 1;
$$;

revoke all on function public.seguimiento_cotizacion_pdf_url(text) from public, authenticated;
grant execute on function public.seguimiento_cotizacion_pdf_url(text) to anon;
