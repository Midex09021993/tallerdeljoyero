-- AURUM Transfer: métricas globales y sincronización del historial.
-- Solo metadatos operativos. No almacena ni expone contenido de archivos.

create or replace function public.sync_aurum_transfer_usage_status()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status = 'consumed' and old.status is distinct from 'consumed' then
    update public.aurum_transfer_usage
    set status = 'consumed',
        consumed_at = coalesce(new.consumed_at, now())
    where transfer_id = new.id;
  elsif new.status = 'expired' and old.status is distinct from 'expired' then
    update public.aurum_transfer_usage
    set status = 'expired'
    where transfer_id = new.id
      and status <> 'consumed';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_sync_aurum_transfer_usage_status on public.aurum_transfers;
create trigger trg_sync_aurum_transfer_usage_status
after update of status on public.aurum_transfers
for each row
execute function public.sync_aurum_transfer_usage_status();

create or replace function public.get_aurum_transfer_usage_metrics()
returns table (
  transfer_count bigint,
  downloaded_count bigint,
  total_bytes numeric,
  available_count bigint,
  expired_count bigint,
  file_count bigint,
  last_activity timestamptz
)
language sql
security definer
set search_path = public
as $$
  select
    count(*)::bigint as transfer_count,
    count(*) filter (where status = 'consumed')::bigint as downloaded_count,
    coalesce(sum(total_bytes), 0)::numeric as total_bytes,
    count(*) filter (
      where status = 'available'
        and (expires_at is null or expires_at > now())
    )::bigint as available_count,
    count(*) filter (
      where status = 'expired'
        or (status = 'available' and expires_at is not null and expires_at <= now())
    )::bigint as expired_count,
    coalesce(sum(file_count), 0)::bigint as file_count,
    max(greatest(
      created_at,
      coalesce(consumed_at, created_at)
    )) as last_activity
  from public.aurum_transfer_usage
  where public.has_role((select auth.uid()), 'dueno'::public.app_role);
$$;

revoke all on function public.get_aurum_transfer_usage_metrics() from public, anon, authenticated;
grant execute on function public.get_aurum_transfer_usage_metrics() to authenticated;

revoke all on function public.sync_aurum_transfer_usage_status() from public, anon, authenticated;
grant execute on function public.sync_aurum_transfer_usage_status() to service_role;

comment on function public.get_aurum_transfer_usage_metrics() is
'Métricas globales administrativas de AURUM Transfer. Solo metadatos operativos.';
