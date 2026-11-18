alter table public.clientes add column if not exists sede_id uuid references public.sedes(id);
update public.clientes c set sede_id = (select s.id from public.sedes s order by s.created_at limit 1) where c.sede_id is null;
alter table public.clientes alter column sede_id set not null;
create index if not exists clientes_sede_idx on public.clientes(sede_id);