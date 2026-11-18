ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS acceso_desde date,
  ADD COLUMN IF NOT EXISTS acceso_hasta date;