-- Renombrar la sede histórica de Gerencia general a FADILAB.
-- No crea una sede nueva ni cambia sus relaciones: conserva el mismo UUID.
do $$
begin
  if exists (
    select 1 from public.sedes
    where lower(trim(nombre)) = 'gerencia general'
  ) and exists (
    select 1 from public.sedes
    where lower(trim(nombre)) = 'fadilab'
  ) then
    raise exception 'No se puede renombrar Gerencia general: ya existe FADILAB';
  end if;

  update public.sedes
  set nombre = 'FADILAB',
      updated_at = now()
  where lower(trim(nombre)) = 'gerencia general';
end;
$$;
