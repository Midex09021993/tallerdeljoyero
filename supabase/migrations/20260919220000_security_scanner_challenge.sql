-- SECURITY SCANNER CHALLENGE — TEMPORARY
-- Intentionally creates a harmless SECURITY DEFINER execution finding.
-- It returns only a fixed diagnostic string and accesses no application data.
-- Goal: verify that the security scanner detects and remediates excessive EXECUTE privileges.

create or replace function public.security_scanner_challenge()
returns text
language sql
security definer
set search_path = public
as $$
  select 'security-scanner-challenge';
$$;

-- INTENTIONAL MISCONFIGURATION FOR THE TEST:
-- Both anonymous and authenticated roles can execute this SECURITY DEFINER function.
grant execute on function public.security_scanner_challenge() to anon;
grant execute on function public.security_scanner_challenge() to authenticated;
