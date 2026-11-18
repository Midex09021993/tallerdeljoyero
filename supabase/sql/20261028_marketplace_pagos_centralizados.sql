-- AURUM LAB · habilitación de cobros centralizados Mercado Pago.
-- Ejecutar manualmente en SQL Editor de Lovable Cloud ANTES de desplegar las funciones.
-- Comisión de plataforma: 20% del precio publicado. Vendedor: 80% antes de considerar costos
-- del proveedor, impuestos, reembolsos o contracargos. Este SQL no ejecuta pagos ni transferencias.

begin;

alter table public.compras_archivos_digitales
  add column if not exists comision_plataforma numeric(12,2) not null default 0,
  add column if not exists importe_vendedor numeric(12,2) not null default 0,
  add column if not exists preferencia_pago text;

alter table public.compras_archivos_digitales
  drop constraint if exists compras_archivos_comision_no_negativa_check;
alter table public.compras_archivos_digitales
  add constraint compras_archivos_comision_no_negativa_check
  check (comision_plataforma >= 0 and importe_vendedor >= 0);

create unique index if not exists compras_archivos_preferencia_pago_uq
  on public.compras_archivos_digitales (proveedor_pago, preferencia_pago)
  where preferencia_pago is not null;

comment on column public.compras_archivos_digitales.comision_plataforma is
  'Comisión de AURUM LAB (20% del precio bruto para nuevas compras; el coste de pasarela se contabiliza por separado).';
comment on column public.compras_archivos_digitales.importe_vendedor is
  'Importe bruto atribuible al vendedor (80% del precio); no implica que el retiro haya sido pagado.';
comment on column public.compras_archivos_digitales.preferencia_pago is
  'Identificador de preferencia/checkout creado por Mercado Pago. Nunca contiene credenciales.';
notify pgrst, 'reload schema';
commit;

-- Verificación posterior:
select column_name, data_type, column_default
from information_schema.columns
where table_schema = 'public'
  and table_name = 'compras_archivos_digitales'
  and column_name in ('comision_plataforma', 'importe_vendedor', 'preferencia_pago')
order by column_name;
