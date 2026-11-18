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
  if new.contrato_id is not null then
    select * into v_contrato
    from public.contratos
    where id = new.contrato_id;
  elsif nullif(btrim(coalesce(new.contrato, '')), '') is not null then
    select * into v_contrato
    from public.contratos
    where numero = new.contrato
    limit 1;
  else
    return new;
  end if;

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
before insert or update of contrato_id, contrato on public.pedidos
for each row execute function public.exigir_firma_validada_para_pedido();


-- Permite al personal administrador cargar y consultar únicamente archivos de firma
-- bajo la carpeta del contrato al que tiene acceso por sede.
drop policy if exists "contratos firmas subir admin" on storage.objects;
create policy "contratos firmas subir admin"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'cotizaciones-publicas'
  and name like 'contratos/%/firmado-%'

  and public.es_admin(auth.uid())
  and exists (
    select 1 from public.contratos c
    where name like ('contratos/' || c.id::text || '/firmado-%')
      and (public.has_role(auth.uid(), 'dueno'::public.app_role) or public.mi_sede(auth.uid()) = c.sede_id)
  )
);

drop policy if exists "contratos firmas leer admin" on storage.objects;
create policy "contratos firmas leer admin"
on storage.objects for select to authenticated
using (
  bucket_id = 'cotizaciones-publicas'
  and name like 'contratos/%/firmado-%'
  and public.es_admin(auth.uid())
  and exists (
    select 1 from public.contratos c
    where name like ('contratos/' || c.id::text || '/firmado-%')
      and (public.has_role(auth.uid(), 'dueno'::public.app_role) or public.mi_sede(auth.uid()) = c.sede_id)
  )
);

drop policy if exists "contratos documentos insertar admin" on public.contrato_documentos;
create policy "contratos documentos insertar admin"
on public.contrato_documentos for insert to authenticated
with check (
  public.es_admin(auth.uid())
  and exists (
    select 1 from public.contratos c
    where c.id = contrato_documentos.contrato_id
      and (public.has_role(auth.uid(), 'dueno'::public.app_role) or c.sede_id = public.mi_sede(auth.uid()))
  )
);

notify pgrst, 'reload schema';
