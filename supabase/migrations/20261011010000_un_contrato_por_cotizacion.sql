-- Refuerzo de integridad: una cotización puede tener como máximo un contrato.
-- Las RPC ya bloquean la cotización y consultan el contrato existente; este índice
-- protege también frente a llamadas simultáneas, escrituras directas o futuras rutas.
-- No elimina ni modifica datos históricos. Si ya existen duplicados, la migración
-- se detiene con un mensaje explícito para revisarlos antes de continuar.

do $$
begin
  if exists (
    select 1
    from public.contratos
    where cotizacion_id is not null
    group by cotizacion_id
    having count(*) > 1
  ) then
    raise exception
      'No se puede aplicar la migración: hay cotizaciones vinculadas a más de un contrato. Revisar duplicados en public.contratos antes de continuar.';
  end if;
end;
$$;

create unique index if not exists contratos_una_cotizacion_un_contrato
  on public.contratos (cotizacion_id)
  where cotizacion_id is not null;

comment on index public.contratos_una_cotizacion_un_contrato is
  'Garantiza como máximo un contrato del sistema por cotización; no afecta contratos manuales sin cotizacion_id.';
