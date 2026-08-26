REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.es_admin(uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.mi_sede(uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.ve_sede(uuid, uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.set_updated_at() FROM anon, authenticated, public;

GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.es_admin(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.mi_sede(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.ve_sede(uuid, uuid) TO authenticated;