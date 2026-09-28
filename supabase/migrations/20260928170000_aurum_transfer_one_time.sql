-- AURUM Transfer: transferencias públicas de un solo uso.
-- No reutiliza buckets ni tablas del ERP.
create table if not exists public.aurum_transfers (
  id uuid primary key default gen_random_uuid(),
  token_hash text not null unique,
  status text not null default 'available' check (status in ('available','processing','consumed','expired')),
  files jsonb not null default '[]'::jsonb,
  file_count integer not null default 0,
  total_bytes bigint not null default 0,
  expires_at timestamptz not null default (now() + interval '24 hours'),
  created_at timestamptz not null default now(),
  consumed_at timestamptz
);

alter table public.aurum_transfers enable row level security;

revoke all on public.aurum_transfers from anon, authenticated;
grant all on public.aurum_transfers to service_role;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'aurum-transfer',
  'aurum-transfer',
  false,
  52428800,
  null
)
on conflict (id) do update
set public = false,
    file_size_limit = 52428800;

create or replace function public.claim_aurum_transfer(_token_hash text)
returns public.aurum_transfers
language plpgsql
security definer
set search_path = public
as $$
declare
  v_transfer public.aurum_transfers;
begin
  select *
    into v_transfer
    from public.aurum_transfers
   where token_hash = _token_hash
   for update;

  if not found then
    return null;
  end if;

  if v_transfer.expires_at <= now() then
    update public.aurum_transfers
       set status = 'expired'
     where id = v_transfer.id;
    return null;
  end if;

  if v_transfer.status <> 'available' then
    return null;
  end if;

  update public.aurum_transfers
     set status = 'processing'
   where id = v_transfer.id
   returning * into v_transfer;

  return v_transfer;
end;
$$;

create or replace function public.release_aurum_transfer(_transfer_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.aurum_transfers
     set status = 'available'
   where id = _transfer_id
     and status = 'processing';
end;
$$;

revoke all on function public.claim_aurum_transfer(text) from public, anon, authenticated;
revoke all on function public.release_aurum_transfer(uuid) from public, anon, authenticated;
grant execute on function public.claim_aurum_transfer(text) to service_role;
grant execute on function public.release_aurum_transfer(uuid) to service_role;

comment on table public.aurum_transfers is
'Enlaces AURUM Transfer de un solo uso. Los archivos se eliminan tras una descarga exitosa.';
