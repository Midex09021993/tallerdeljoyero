-- AURUM Secure Viewer: never persist or return a signed Storage URL to the browser.
-- Public links remain token-based and expire after three days.

begin;

alter table public.visor_3d_enlaces
  alter column modelo_url drop not null;

alter table public.visor_3d_enlaces
  drop constraint if exists visor_3d_enlaces_modelo_url_check;

alter table public.visor_3d_enlaces
  add constraint visor_3d_enlaces_modelo_url_check
  check (
    modelo_url is null or (
      modelo_url like 'https://%' and
      position('/storage/v1/object/sign/mi-nube/' in modelo_url) > 0
    )
  );

-- Existing stored URLs are no longer needed: resolution uses modelo_ruta.
update public.visor_3d_enlaces
   set modelo_url = null
 where modelo_url is not null;

-- The browser must create links through the authenticated Edge Function,
-- which validates ownership and inserts using the service role.
revoke all on function public.crear_enlace_visor_3d(text, text, text, text)
  from public, anon, authenticated;

-- Only the public resolver Edge Function may resolve a token.
revoke all on function public.resolver_enlace_visor_3d(text)
  from public, anon, authenticated;

commit;

notify pgrst, 'reload schema';
