-- Completar la consolidacion Ecosistema en los modulos que historicamente
-- conservaron sede_id fuera del nucleo principal.
-- sede_id permanece como compatibilidad; participante_id es canonico.

begin;

alter table public.compras add column if not exists participante_id uuid;
alter table public.catalogo_colecciones add column if not exists participante_id uuid;
alter table public.catalogo_productos add column if not exists participante_id uuid;
alter table public.catalogo_configuracion add column if not exists participante_id uuid;
alter table public.inventario_joya_eventos add column if not exists participante_id uuid;
alter table public.produccion_eventos add column if not exists participante_id uuid;
alter table public.tarifas_mano_obra add column if not exists participante_id uuid;

update public.compras c
set participante_id = ep.id
from public.ecosistema_participantes ep
where c.participante_id is null and c.sede_id = ep.sede_id;

update public.catalogo_colecciones c
set participante_id = ep.id
from public.ecosistema_participantes ep
where c.participante_id is null and c.sede_id = ep.sede_id;

update public.catalogo_productos c
set participante_id = ep.id
from public.ecosistema_participantes ep
where c.participante_id is null and c.sede_id = ep.sede_id;

update public.catalogo_configuracion c
set participante_id = ep.id
from public.ecosistema_participantes ep
where c.participante_id is null and c.sede_id = ep.sede_id;

update public.inventario_joya_eventos c
set participante_id = ep.id
from public.ecosistema_participantes ep
where c.participante_id is null and c.sede_id = ep.sede_id;

update public.produccion_eventos c
set participante_id = ep.id
from public.ecosistema_participantes ep
where c.participante_id is null and c.sede_id = ep.sede_id;

update public.tarifas_mano_obra c
set participante_id = ep.id
from public.ecosistema_participantes ep
where c.participante_id is null and c.sede_id = ep.sede_id;

alter table public.compras drop constraint if exists compras_participante_id_fkey;
alter table public.compras add constraint compras_participante_id_fkey
  foreign key (participante_id) references public.ecosistema_participantes(id) on delete restrict;

alter table public.catalogo_colecciones drop constraint if exists catalogo_colecciones_participante_id_fkey;
alter table public.catalogo_colecciones add constraint catalogo_colecciones_participante_id_fkey
  foreign key (participante_id) references public.ecosistema_participantes(id) on delete cascade;

alter table public.catalogo_productos drop constraint if exists catalogo_productos_participante_id_fkey;
alter table public.catalogo_productos add constraint catalogo_productos_participante_id_fkey
  foreign key (participante_id) references public.ecosistema_participantes(id) on delete cascade;

alter table public.catalogo_configuracion drop constraint if exists catalogo_configuracion_participante_id_fkey;
alter table public.catalogo_configuracion add constraint catalogo_configuracion_participante_id_fkey
  foreign key (participante_id) references public.ecosistema_participantes(id) on delete cascade;

alter table public.inventario_joya_eventos drop constraint if exists inventario_joya_eventos_participante_id_fkey;
alter table public.inventario_joya_eventos add constraint inventario_joya_eventos_participante_id_fkey
  foreign key (participante_id) references public.ecosistema_participantes(id) on delete restrict;

alter table public.produccion_eventos drop constraint if exists produccion_eventos_participante_id_fkey;
alter table public.produccion_eventos add constraint produccion_eventos_participante_id_fkey
  foreign key (participante_id) references public.ecosistema_participantes(id) on delete restrict;

alter table public.tarifas_mano_obra drop constraint if exists tarifas_mano_obra_participante_id_fkey;
alter table public.tarifas_mano_obra add constraint tarifas_mano_obra_participante_id_fkey
  foreign key (participante_id) references public.ecosistema_participantes(id) on delete cascade;

create index if not exists compras_participante_idx on public.compras(participante_id);
create index if not exists catalogo_colecciones_participante_idx on public.catalogo_colecciones(participante_id);
create index if not exists catalogo_productos_participante_idx on public.catalogo_productos(participante_id);
create index if not exists catalogo_configuracion_participante_idx on public.catalogo_configuracion(participante_id);
create index if not exists inventario_joya_eventos_participante_idx on public.inventario_joya_eventos(participante_id);
create index if not exists produccion_eventos_participante_idx on public.produccion_eventos(participante_id);
create index if not exists tarifas_mano_obra_participante_idx on public.tarifas_mano_obra(participante_id);

do $$
declare
  t text;
  tablas text[] := array[
    'compras','catalogo_colecciones','catalogo_productos','catalogo_configuracion',
    'inventario_joya_eventos','produccion_eventos','tarifas_mano_obra'
  ];
  v_missing integer;
begin
  foreach t in array tablas loop
    execute format('drop trigger if exists trg_%I_participante_canonico on public.%I', t, t);
    execute format('create trigger trg_%I_participante_canonico before insert or update of sede_id, participante_id on public.%I for each row execute function public.sincronizar_participante_operativo()', t, t);
  end loop;

  select count(*) into v_missing
  from (
    select id from public.compras where sede_id is not null and participante_id is null
    union all select id from public.catalogo_colecciones where sede_id is not null and participante_id is null
    union all select id from public.catalogo_productos where sede_id is not null and participante_id is null
    union all select id from public.catalogo_configuracion where sede_id is not null and participante_id is null
    union all select id from public.inventario_joya_eventos where sede_id is not null and participante_id is null
    union all select id from public.produccion_eventos where sede_id is not null and participante_id is null
    union all select id from public.tarifas_mano_obra where sede_id is not null and participante_id is null
  ) x;

  if v_missing > 0 then
    raise exception 'Ecosistema abortado: quedaron % registros fuera del participante canonico', v_missing;
  end if;
end;
$$;

commit;
