-- Sincroniza el esquema comercial con la RPC de cotizaciones.
-- No modifica datos existentes ni permisos: solo asegura que clientes.creado_por exista.
alter table public.clientes
  add column if not exists creado_por uuid
  references auth.users(id)
  on delete set null;

create index if not exists clientes_creado_por_idx
  on public.clientes(creado_por);
