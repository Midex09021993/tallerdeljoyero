# Aurum Print Lab — auditoría técnica y propuesta base

Fecha: 2026-10-09
Repositorio: Midex09021993/tallerdeljoyero
Base revisada: `main`, commit `5894f64074b526711d3a661dfafbd1740049a897`

## Hallazgos confirmados

1. La búsqueda del repositorio no encontró módulo implementado de perfiles de impresión, resinas o calibración; esto no implica inspección de la base productiva.
2. La identidad canónica es `participante_id`, enlazada mediante `participante_cuentas` y `ecosistema_participantes`. Print Lab no crea otro login ni usa `sede_id` como propietario.
3. Aurum Transfer sirve para enlaces temporales de un solo uso. Print Lab necesita almacenamiento privado persistente y separado.
4. La app usa TanStack Router. `src/routeTree.gen.ts` es generado y no debe editarse manualmente.
5. No se debe prometer conversión entre CHITUBOX, Lychee y Tango sin muestras reales por versión.
6. El historial de migraciones del catálogo muestra riesgos por mezclar `sede_id` y `participante_id`; Print Lab usa `participante_id` como identidad canónica.
7. La función existente `public.es_admin` considera roles globales `dueno/gerente`; no sirve como condición de pertenencia a un taller. La política inicial de Print Lab mezclaba ambas cosas y podía bloquear a miembros normales. Se corrigió para comprobar cuenta activa y participante activo por separado.

## Propuesta actual en esta rama

- `supabase/migrations/20261009170000_aurum_print_lab_base.sql`
- `docs/auditoria/aurum-print-lab-auditoria-tecnica-20261009.md`

El esquema propone seis tablas: impresoras, resinas, perfiles, revisiones, pruebas de calibración y feedback. Las claves foráneas compuestas mantienen impresora y resina en el mismo participante que el perfil. El feedback identifica al taller que prueba el perfil, que puede ser distinto del taller propietario del perfil.

La migración incorpora:
- Perfiles privados por defecto y publicación comunitaria explícita.
- Funciones auxiliares `SECURITY DEFINER` para comprobar acceso sin conceder lectura anónima a tablas internas de cuentas.
- Privilegios de lectura pública limitados por columnas; feedback, pruebas de calibración y archivos privados no se exponen a visitantes anónimos.
- Triggers de `updated_at`.
- Bucket privado `aurum-print-lab`, separado de Aurum Transfer, con ruta `<participante_id>/<archivo>`.

El límite de 50 MiB por archivo es provisional y debe confirmarse contra archivos reales.

## Estado de verificación

**Verificado en el repositorio**
- La migración y esta auditoría están en la rama `feat/aurum-print-lab-base`, dentro del PR borrador #24.
- El PR sigue abierto como borrador contra `main`.
- No se aplicó SQL, no se modificó `main` y no se tocó la base de datos de producción.
- La migración tiene un único bloque transaccional `begin/commit`, crea los helpers antes de las políticas y no conserva el bloque de políticas duplicadas de la versión anterior.

**Pendiente — no afirmar como probado**
- No se ejecutó un parser PostgreSQL ni la migración en staging; por tanto, la sintaxis y el comportamiento real aún no están validados por el motor.
- Confirmar funciones/roles y grants efectivos en el entorno de prueba administrado por Lovable Cloud.
- Probar aislamiento con dos talleres, propietario global, miembro, contacto, visitante anónimo y rutas de almacenamiento manipuladas.
- Regenerar `src/integrations/supabase/types.ts` después de validar el esquema.
- Implementar UI solo tras validar el contrato SQL; luego correr typecheck/build.
- Importar muestras reales de CHITUBOX, Lychee y Tango por versión antes de implementar adaptadores.

## Siguiente fase

1. Validar la migración en staging administrado por Lovable Cloud.
2. Ejecutar pruebas de aislamiento y acceso público.
3. Corregir cualquier fallo antes de integrar el PR.
4. Después de aprobar el contrato de base de datos, implementar la UI, generar tipos y verificar compilación.

Estado: propuesta aislada en rama; no lista para fusionar ni aplicar en producción.