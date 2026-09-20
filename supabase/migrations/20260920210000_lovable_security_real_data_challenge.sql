-- LOVABLE SECURITY SCANNER TEST — TEMPORARY
-- This migration intentionally introduces a REAL RLS exposure on the test project.
-- It grants anonymous SELECT access to public.pedidos so Lovable's security scanner
-- can detect a genuine data-access vulnerability and propose the remediation.
--
-- IMPORTANT: This is intentionally insecure and must be removed after the scan.

drop policy if exists "LOVABLE TEST - pedidos anon read" on public.pedidos;

create policy "LOVABLE TEST - pedidos anon read"
on public.pedidos
for select
to anon
using (true);

comment on policy "LOVABLE TEST - pedidos anon read" on public.pedidos is
'TEMPORARY SECURITY TEST: intentionally exposes pedido rows to anon so the Lovable security scanner can detect and remediate a real RLS vulnerability. Remove after testing.';
