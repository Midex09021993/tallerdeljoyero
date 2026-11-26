-- Identidad comercial automática para cada taller del ecosistema.
-- Aplicación MANUAL por el propietario en Supabase.
-- No modifica identidades ya existentes ni sus datos configurados.

begin;

create or replace function public.crear_identidad_comercial_automatica_taller()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_pais text := coalesce(nullif(btrim(new.metadata->>'pais'), ''), 'Perú');
  v_codigo text;
  v_moneda text;
  v_simbolo text;
  v_impuesto_activo boolean := true;
  v_impuesto_nombre text;
  v_tasa numeric(6,3) := 0;
  v_label text := 'Identificador fiscal';
  v_zona text := 'UTC';
begin
  if new.tipo_participante <> 'organizacion' or new.sede_id is null then
    return new;
  end if;

  case v_pais
    when 'Perú' then v_codigo:='PE'; v_moneda:='PEN'; v_simbolo:='S/'; v_impuesto_nombre:='IGV'; v_tasa:=18; v_label:='RUC'; v_zona:='America/Lima';
    when 'Argentina' then v_codigo:='AR'; v_moneda:='ARS'; v_simbolo:='$'; v_impuesto_nombre:='IVA'; v_tasa:=21; v_label:='CUIT'; v_zona:='America/Argentina/Buenos_Aires';
    when 'Bolivia' then v_codigo:='BO'; v_moneda:='BOB'; v_simbolo:='Bs'; v_impuesto_nombre:='IVA'; v_tasa:=13; v_label:='NIT'; v_zona:='America/La_Paz';
    when 'Brasil' then v_codigo:='BR'; v_moneda:='BRL'; v_simbolo:='R$'; v_impuesto_activo:=false; v_impuesto_nombre:='Impuestos'; v_tasa:=0; v_label:='CNPJ / CPF'; v_zona:='America/Sao_Paulo';
    when 'Chile' then v_codigo:='CL'; v_moneda:='CLP'; v_simbolo:='$'; v_impuesto_nombre:='IVA'; v_tasa:=19; v_label:='RUT'; v_zona:='America/Santiago';
    when 'Colombia' then v_codigo:='CO'; v_moneda:='COP'; v_simbolo:='$'; v_impuesto_nombre:='IVA'; v_tasa:=19; v_label:='NIT'; v_zona:='America/Bogota';
    when 'Ecuador' then v_codigo:='EC'; v_moneda:='USD'; v_simbolo:='$'; v_impuesto_nombre:='IVA'; v_tasa:=15; v_label:='RUC'; v_zona:='America/Guayaquil';
    when 'Paraguay' then v_codigo:='PY'; v_moneda:='PYG'; v_simbolo:='₲'; v_impuesto_nombre:='IVA'; v_tasa:=10; v_label:='RUC'; v_zona:='America/Asuncion';
    when 'México' then v_codigo:='MX'; v_moneda:='MXN'; v_simbolo:='$'; v_impuesto_nombre:='IVA'; v_tasa:=16; v_label:='RFC'; v_zona:='America/Mexico_City';
    when 'República Dominicana' then v_codigo:='DO'; v_moneda:='DOP'; v_simbolo:='RD$'; v_impuesto_nombre:='ITBIS'; v_tasa:=18; v_label:='RNC'; v_zona:='America/Santo_Domingo';
    when 'Uruguay' then v_codigo:='UY'; v_moneda:='UYU'; v_simbolo:='$U'; v_impuesto_nombre:='IVA'; v_tasa:=22; v_label:='RUT'; v_zona:='America/Montevideo';
    when 'Venezuela' then v_codigo:='VE'; v_moneda:='VES'; v_simbolo:='Bs.'; v_impuesto_nombre:='IVA'; v_tasa:=16; v_label:='RIF'; v_zona:='America/Caracas';
    when 'Costa Rica' then v_codigo:='CR'; v_moneda:='CRC'; v_simbolo:='₡'; v_impuesto_nombre:='IVA'; v_tasa:=13; v_label:='Cédula jurídica'; v_zona:='America/Costa_Rica';
    when 'Cuba' then v_codigo:='CU'; v_moneda:='CUP'; v_simbolo:='$'; v_impuesto_activo:=false; v_impuesto_nombre:='Impuestos'; v_tasa:=0; v_label:='Identificador fiscal'; v_zona:='America/Havana';
    when 'El Salvador' then v_codigo:='SV'; v_moneda:='USD'; v_simbolo:='$'; v_impuesto_nombre:='IVA'; v_tasa:=13; v_label:='NIT'; v_zona:='America/El_Salvador';
    when 'España' then v_codigo:='ES'; v_moneda:='EUR'; v_simbolo:='€'; v_impuesto_nombre:='IVA'; v_tasa:=21; v_label:='NIF'; v_zona:='Europe/Madrid';
    when 'Estados Unidos' then v_codigo:='US'; v_moneda:='USD'; v_simbolo:='$'; v_impuesto_activo:=false; v_impuesto_nombre:='Sales tax'; v_tasa:=0; v_label:='EIN'; v_zona:='America/New_York';
    when 'Guatemala' then v_codigo:='GT'; v_moneda:='GTQ'; v_simbolo:='Q'; v_impuesto_nombre:='IVA'; v_tasa:=12; v_label:='NIT'; v_zona:='America/Guatemala';
    when 'Honduras' then v_codigo:='HN'; v_moneda:='HNL'; v_simbolo:='L'; v_impuesto_nombre:='ISV'; v_tasa:=15; v_label:='RTN'; v_zona:='America/Tegucigalpa';
    when 'Nicaragua' then v_codigo:='NI'; v_moneda:='NIO'; v_simbolo:='C$'; v_impuesto_nombre:='IVA'; v_tasa:=15; v_label:='RUC'; v_zona:='America/Managua';
    when 'Panamá' then v_codigo:='PA'; v_moneda:='USD'; v_simbolo:='$'; v_impuesto_nombre:='ITBMS'; v_tasa:=7; v_label:='RUC'; v_zona:='America/Panama';
    when 'Puerto Rico' then v_codigo:='PR'; v_moneda:='USD'; v_simbolo:='$'; v_impuesto_activo:=false; v_impuesto_nombre:='Sales tax'; v_tasa:=0; v_label:='EIN'; v_zona:='America/Puerto_Rico';
    when 'Canadá' then v_codigo:='CA'; v_moneda:='CAD'; v_simbolo:='C$'; v_impuesto_activo:=false; v_impuesto_nombre:='GST/HST'; v_tasa:=0; v_label:='Business number'; v_zona:='America/Toronto';
    when 'Alemania' then v_codigo:='DE'; v_moneda:='EUR'; v_simbolo:='€'; v_impuesto_nombre:='VAT'; v_tasa:=19; v_label:='Steuernummer'; v_zona:='Europe/Berlin';
    when 'Francia' then v_codigo:='FR'; v_moneda:='EUR'; v_simbolo:='€'; v_impuesto_nombre:='TVA'; v_tasa:=20; v_label:='SIREN'; v_zona:='Europe/Paris';
    when 'Italia' then v_codigo:='IT'; v_moneda:='EUR'; v_simbolo:='€'; v_impuesto_nombre:='IVA'; v_tasa:=22; v_label:='Partita IVA'; v_zona:='Europe/Rome';
    else v_codigo:='OTHER'; v_moneda:='USD'; v_simbolo:='$'; v_impuesto_activo:=false; v_impuesto_nombre:='Impuestos'; v_tasa:=0; v_label:='Identificador fiscal'; v_zona:='UTC';
  end case;

  insert into public.identidades_comerciales (
    sede_id, participante_id, nombre_comercial, pais_codigo, pais_nombre,
    moneda_codigo, moneda_simbolo, impuesto_activo, impuesto_nombre, impuesto_tasa,
    impuesto_incluido, identificador_fiscal_label, zona_horaria, color_principal,
    metadata, activa
  )
  values (
    new.sede_id, new.id, new.nombre, v_codigo, v_pais,
    v_moneda, v_simbolo, v_impuesto_activo, v_impuesto_nombre, v_tasa,
    false, v_label, v_zona, '#B58A3A',
    jsonb_build_object(
      'origen', 'provision_automatica',
      'cotizacion', jsonb_build_object(
        'introduccion', 'Es grato dirigirnos a usted, con la finalidad de remitir la siguiente cotización.',
        'terminos', jsonb_build_array(
          'Precios y condiciones sujetos a la vigencia indicada en la cotización.',
          'La fecha de entrega será coordinada según disponibilidad y alcance del servicio.',
          'La forma de pago y cualquier condición especial se detallan en la propuesta comercial.'
        ),
        'atendido_por', '',
        'responsable_cargo', '',
        'firma_nombre', '',
        'firma_cargo', '',
        'mostrar_bancos', true,
        'cuentas_bancarias', jsonb_build_array()
      )
    ),
    true
  )
  on conflict (participante_id) where activa = true and participante_id is not null
  do nothing;

  return new;
end;
$$;

drop trigger if exists ecosistema_participante_auto_identidad_comercial on public.ecosistema_participantes;
create trigger ecosistema_participante_auto_identidad_comercial
after insert on public.ecosistema_participantes
for each row
execute function public.crear_identidad_comercial_automatica_taller();

-- Completa los talleres existentes que no tengan identidad activa.
-- Conserva intactas las identidades ya creadas/configuradas.
do $$
declare
  r record;
begin
  for r in
    select ep.*
    from public.ecosistema_participantes ep
    where ep.estado = 'activo'
      and ep.tipo_participante = 'organizacion'
      and ep.sede_id is not null
      and not exists (
        select 1 from public.identidades_comerciales ic
        where ic.participante_id = ep.id
          and ic.activa = true
      )
  loop
    perform public.crear_identidad_comercial_automatica_taller_for_row(r);
  end loop;
end;
$$;

commit;

notify pgrst, 'reload schema';
