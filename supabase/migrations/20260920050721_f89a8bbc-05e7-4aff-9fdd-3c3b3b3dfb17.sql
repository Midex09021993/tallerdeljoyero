-- Fix: gerente could self-promote to dueno via the 'roles admin' policy.
-- Writes to user_roles go through server functions with the service role (bypasses RLS),
-- so direct client writes can be safely restricted to dueno only.
DROP POLICY IF EXISTS "roles admin" ON public.user_roles;

CREATE POLICY "roles admin" ON public.user_roles
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'dueno'))
  WITH CHECK (public.has_role(auth.uid(), 'dueno'));

-- Defense in depth: even an owner cannot change their own roles (lockout/self-demote protection
-- is handled by server functions); prevent non-owner rows from ever becoming 'dueno' via direct writes.
CREATE POLICY "roles no direct dueno grant" ON public.user_roles
  AS RESTRICTIVE
  FOR INSERT TO authenticated
  WITH CHECK (role <> 'dueno');
