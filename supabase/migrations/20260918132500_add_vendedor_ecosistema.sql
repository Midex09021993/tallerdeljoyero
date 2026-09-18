-- Add seller / commercializer as an ecosystem participant type.
alter table public.solicitudes_acceso drop constraint if exists solicitudes_acceso_tipo_solicitante_check;
alter table public.solicitudes_acceso
  add constraint solicitudes_acceso_tipo_solicitante_check
  check (tipo_solicitante in ('taller','profesional','vendedor','proveedor','servicio'));

alter table public.ecosistema_participantes drop constraint if exists ecosistema_participantes_tipo_participante_check;
alter table public.ecosistema_participantes
  add constraint ecosistema_participantes_tipo_participante_check
  check (tipo_participante in ('organizacion','profesional','vendedor','proveedor','servicio','talento','institucion_educativa'));
