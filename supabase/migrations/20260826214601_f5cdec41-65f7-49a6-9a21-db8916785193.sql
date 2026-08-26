ALTER TABLE public.pedidos
  ADD COLUMN talla text NOT NULL DEFAULT '',
  ADD COLUMN cantidad_piezas integer NOT NULL DEFAULT 1,
  ADD COLUMN piedras text NOT NULL DEFAULT '';