-- AURUM BOARD — notas visuales del taller
-- Aplicar manualmente en Supabase SQL Editor. No ejecutar desde ChatGPT/Lovable.
create table if not exists public.aurum_board_notes (
  id uuid primary key default gen_random_uuid(),
  participante_id uuid not null,
  sede_id uuid null,
  user_id uuid not null references auth.users(id) on delete cascade,
  titulo text not null default 'Nota nueva',
  contenido text not null default '',
  color text not null default '#FFF3C4',
  categoria text not null default 'idea' check (categoria in ('idea','pendiente','produccion','cliente','compra')),
  posicion_x integer not null default 24,
  posicion_y integer not null default 24,
  fijada boolean not null default false,
  estado text not null default 'activa' check (estado in ('activa','archivada','completada')),
  visibilidad text not null default 'personal' check (visibilidad in ('personal','taller')),
  fecha_recordatorio timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists aurum_board_notes_participante_idx on public.aurum_board_notes(participante_id,sede_id,estado,updated_at desc);
create index if not exists aurum_board_notes_user_idx on public.aurum_board_notes(user_id,updated_at desc);
alter table public.aurum_board_notes enable row level security;
create policy "aurum_board_select_member" on public.aurum_board_notes for select to authenticated using (
  user_id=auth.uid() or (visibilidad='taller' and participante_id in (
    select p.participante_id from public.profiles p where p.id=auth.uid() and p.participante_id is not null
    union select pc.participante_id from public.participante_cuentas pc where pc.user_id=auth.uid() and pc.estado='activo'
  ))
);
create policy "aurum_board_insert_own" on public.aurum_board_notes for insert to authenticated with check (
  user_id=auth.uid() and participante_id in (
    select p.participante_id from public.profiles p where p.id=auth.uid() and p.participante_id is not null
    union select pc.participante_id from public.participante_cuentas pc where pc.user_id=auth.uid() and pc.estado='activo'
  )
);
create policy "aurum_board_update_own" on public.aurum_board_notes for update to authenticated using (user_id=auth.uid()) with check (user_id=auth.uid());
create policy "aurum_board_delete_own" on public.aurum_board_notes for delete to authenticated using (user_id=auth.uid());
grant select,insert,update,delete on public.aurum_board_notes to authenticated;
