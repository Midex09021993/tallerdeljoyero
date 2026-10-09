# Aurum Print Lab — auditoría técnica y propuesta base

Fecha: 2026-10-09
Repositorio: Midex09021993/tallerdeljoyero
Base revisada: main, commit 5894f64074b526711d3a661dfafbd1740049a897

## Hallazgos confirmados

1. La búsqueda del repositorio no encontró módulo implementado de perfiles de impresión, resinas o calibración; no implica que se haya inspeccionado la base productiva.
2. La identidad canónica del proyecto es participante_id enlazada mediante participante_cuentas y ecosistema_participantes. Print Lab no debe crear otro login ni usar sede_id como propietario.
3. Aurum Transfer es para enlaces temporales de un solo uso y tiene bucket privado propio. Print Lab requiere almacenamiento persistente privado separado.
4. La app usa TanStack Router. src/routeTree.gen.ts es generado y no debe editarse manualmente.
5. CHITUBOX distingue perfiles/configuraciones, proyectos y archivos laminados. Tango dispone de perfiles de impresora/resina e importación/exportación de scripts, pero no se debe prometer conversión entre slicers sin muestras reales.
6. Las migraciones del catálogo muestran historial de políticas reescritas por diferencias sede_id/participante_id. Print Lab parte de participante_id y debe probar aislamiento entre talleres.

## Propuesta en esta rama

- supabase/migrations/20261009170000_aurum_print_lab_base.sql
- docs/auditoria/aurum-print-lab-auditoria-tecnica-20261009.md

El esquema propone seis tablas: impresoras, resinas, perfiles, revisiones, pruebas de calibración y feedback. Las relaciones compuestas impiden vincular un perfil a una impresora o resina de otro participante. Los perfiles son privados por defecto y la comunidad solo puede leer perfiles publicados explícitamente.

El bucket aurum-print-lab es privado y no reutiliza aurum-transfer. El límite inicial de 50 MiB por archivo es una propuesta conservadora, no un límite validado con archivos reales.

## Bloqueos antes de producción

- No se consultó la base de datos productiva ni se ejecutó la migración.
- Validar en staging las funciones/roles `has_role`, `es_admin`, el tipo `app_role` y los permisos reales.
- Ejecutar pruebas de RLS con dos talleres, dueño global y visitante anónimo.
- Regenerar src/integrations/supabase/types.ts tras validar/aplicar el esquema.
- Añadir UI solo después de confirmar el contrato SQL y generar tipos; no editar routeTree.gen.ts manualmente.
- Probar archivos reales de CHITUBOX, Lychee y Tango por versión antes de crear importadores.
- Las columnas updated_at requieren trigger o actualización desde la aplicación; no se afirma que sean automáticas.

## Siguiente fase

1. Revisar esta propuesta.
2. Aplicar en entorno de prueba administrado por Lovable Cloud y validar SQL/RLS.
3. Implementar ruta y componentes de Print Lab, regenerar tipos y correr typecheck/build.
4. Probar privacidad entre talleres y acceso público antes de publicar.

Estado: propuesta aislada en rama; main y la base de datos de producción no se modificaron.