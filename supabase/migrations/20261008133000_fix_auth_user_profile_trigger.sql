-- Corrige el trigger de Auth para el esquema actual de profiles.
-- profiles.usuario es NOT NULL y tiene índice único; el trigger legado no lo rellenaba,
-- por lo que Auth devolvía "Database error creating new user" antes de que el servidor
-- pudiera completar el perfil del nuevo taller.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_usuario text;
BEGIN
  v_usuario := lower(trim(COALESCE(NEW.raw_user_meta_data ->> 'usuario', '')));

  IF v_usuario = '' OR length(v_usuario) > 50 THEN
    v_usuario := 'usuario_' || replace(NEW.id::text, '-', '');
  END IF;

  -- El usuario puede existir ya por una migración/flujo paralelo; en ese caso
  -- usamos un identificador garantizado para no bloquear la creación en Auth.
  IF EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE lower(p.usuario) = lower(v_usuario)
      AND p.id <> NEW.id
  ) THEN
    v_usuario := 'usuario_' || replace(NEW.id::text, '-', '');
  END IF;

  INSERT INTO public.profiles (
    id,
    usuario,
    nombre,
    apellidos,
    dni,
    telefono
  )
  VALUES (
    NEW.id,
    v_usuario,
    COALESCE(NEW.raw_user_meta_data ->> 'nombre', NEW.raw_user_meta_data ->> 'full_name', ''),
    COALESCE(NEW.raw_user_meta_data ->> 'apellidos', ''),
    COALESCE(NEW.raw_user_meta_data ->> 'dni', ''),
    COALESCE(NEW.raw_user_meta_data ->> 'telefono', '')
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$$;
