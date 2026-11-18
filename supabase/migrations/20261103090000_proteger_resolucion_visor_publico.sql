-- Security hardening: the public shared viewer must resolve links only
-- through the resolver-enlace-visor-3d Edge Function (service role).
-- Direct anonymous/authenticated RPC execution would expose the stored
-- signed Storage URL and bypass the short-lived URL policy.

begin;

revoke all on function public.resolver_enlace_visor_3d(text)
  from public, anon, authenticated;

-- Keep the function definition for controlled server-side compatibility,
-- but do not grant browser roles direct access to it.

commit;

notify pgrst, 'reload schema';
