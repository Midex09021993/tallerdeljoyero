-- Flujo de firma contractual: recibir firma, revisar y validar antes de habilitar pedidos.
alter table public.contratos
  add column if not exists firma_validada_at timestamptz,
  add column if not exists firma_validada_por uuid references auth.users(id) on delete set null,
  add column if not exists firma_observacion text;

create or replace function public.revisar_firma_contrato(
  _contrato_id uuid,
  _decision text,
  _observacion text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_contrato public.contratos%rowtype;
begin
  if not public.es_admin(auth.uid()) then
    raise exception 'No autorizado para revisar firmas de contratos';
  end if;

  if _decision not in ('validado', 'rechazado') then
    raise exception 'Decisión de revisión inválida';
  end if;

  select * into v_contrato
  from public.contratos
  where id = _contrato_id
  for update;

  if not found then
    raise exception 'Contrato no encontrado';
  end if;

  if v_contrato.estado_firma not in ('firmado_documento_subido', 'firmado_presencial', 'firmado_certificado') then
    raise exception 'El contrato todavía no tiene una firma recibida';
  end if;

  if not exists (
    select 1 from public.contrato_documentos d
    where d.contrato_id = _contrato_id
      and d.tipo in ('firmado_documento_subido', 'firmado_presencial', 'firmado_certificado')
  ) then
    raise exception 'No se encontró el archivo de firma del contrato';
  end if;

  if _decision = 'validado' then
    update public.contratos
    set firma_validada_at = now(),
        firma_validada_por = auth.uid(),
        firma_observacion = nullif(btrim(coalesce(_observacion, '')), '')
    where id = _contrato_id;
  else
    update public.contratos
    set firma_validada_at = null,
        firma_validada_por = null,
        firma_observacion = nullif(btrim(coalesce(_observacion, '')), '')
    where id = _contrato_id;
  end if;

  return jsonb_build_object(
    'contrato_id', _contrato_id,
    'decision', _decision,
    'firma_validada_at', case when _decision = 'validado' then now() else null end
  );
end;
$$;

revoke all on function public.revisar_firma_contrato(uuid, text, text) from public, anon;
grant execute on function public.revisar_firma_contrato(uuid, text, text) to authenticated;

-- No permitir pedidos vinculados a contratos de cotización sin firma revisada y validada.
create or replace function public.exigir_firma_validada_para_pedido()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_contrato public.contratos%rowtype;
begin
  if new.contrato_id is null then
    return new;
  end if;

  select * into v_contrato
  from public.contratos
  where id = new.contrato_id;

  if not found or v_contrato.cotizacion_id is null then
    return new;
  end if;

  if v_contrato.estado_firma not in ('firmado_documento_subido', 'firmado_presencial', 'firmado_certificado')
     or v_contrato.firma_validada_at is null then
    raise exception 'No se puede crear o vincular el pedido: el contrato debe estar firmado y la firma validada por el taller';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_exigir_firma_validada_para_pedido on public.pedidos;
create trigger trg_exigir_firma_validada_para_pedido
before insert or update of contrato_id on public.pedidos
for each row execute function public.exigir_firma_validada_para_pedido();

notify pgrst, 'reload schema';
