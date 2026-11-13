# AURUM RENDER — Estado modular y auditoría técnica

Fecha de preparación: 2026-11-13  
Rama autorizada: `main` únicamente.

## Objetivo de la auditoría

Revisar la arquitectura modular existente de AURUM RENDER, detectar acoplamientos, contratos incompletos, riesgos de ciclo de vida GPU, problemas de rendimiento y oportunidades de pruebas. La auditoría debe distinguir entre módulos realmente independientes y adaptadores que todavía delegan en controladores de producción existentes.

## Restricciones obligatorias

- No crear ni utilizar ramas distintas de `main`.
- No cambiar shaders, IOR, dispersión, scintillation, BVH óptico, HDRI, calibración de metales ni perfiles ópticos de gemas sin autorización expresa.
- No reemplazar ni duplicar los controladores de producción para aparentar modularidad.
- No transferir ownership de geometrías, materiales, texturas o render targets sin demostrar quién los crea, comparte y libera.
- No cambiar comportamiento visual ni pipeline de render sin explicar el riesgo y presentar una propuesta.
- No ejecutar migraciones de base de datos: AURUM RENDER no necesita cambios de esquema para esta auditoría.
- Toda modificación debe incluir pruebas y validación de build, TypeScript, ESLint y CI.

## Estado observado de los módulos

| Módulo | Estado observado | Límite actual / trabajo pendiente |
|---|---|---|
| AURUM CORE / Plugin Registry | Implementado | Revisar fallos de activación, rollback y orden de dependencias |
| Service Container | Implementado | Contrato de solo lectura; revisar colisiones y consumo |
| Event Bus | Implementado | Revisar aislamiento de errores de handlers y limpieza |
| Resource Scope | Implementado | Scope genérico; no equivale por sí solo a ownership GPU compartido |
| GPU Resource Manager | Implementado, adopción controlada | Servicio disponible en el plugin host; los recursos del renderer productivo aún no se han transferido |
| Viewer Adapter | Adaptador de producción | Expone referencias; no posee ni administra el renderer/loop |
| Scene Adapter | Adaptador de producción | Delegación al controlador de escena existente |
| Lighting Adapter | Adaptador de producción | Delegación al controlador de iluminación existente |
| Metal Adapter | Adaptador de producción | Delegación al motor/materiales existentes |
| Gem Adapter | Adaptador de producción | Delegación al motor óptico existente; requiere auditoría de fronteras y responsabilidades |
| AURUM IMPORT | Integrado | Formatos y pipeline modular; ampliar pruebas con CAD reales y modelos complejos |
| Import Pipeline Manager | Implementado | Revisar cancelación, errores parciales, memoria y límites de carga |
| AURUM GEOMETRY | Diagnóstico read-only | No es un motor de edición geométrica; no muta buffers |
| AURUM SURFACE | Experimental | Diagnóstico de malla; no prueba continuidad G1/G2 CAD/BREP |
| Solid / Intersection | Diagnósticos implementados | Validar tolerancias, coste y escalabilidad en modelos reales |
| AURUM EDGE QUALITY | Parcial | MSAA integrado; TAA sigue en el pipeline existente; SSAA no implementado |
| Final Render Adapter | Adaptador implementado | La implementación de path tracing sigue en el módulo existente |
| AURUM GEM TRANSITION | Desactivado por configuración reciente | No reactivar durante la auditoría sin autorización y prueba A/B |

## GPU Resource Manager

Archivo: `src/lib/aurum/core/gpu-resource-manager.ts`

Servicio: `aurum.gpu.resources`, registrado por `production-plugin-host.ts`.

Capacidades:
- Ownership explícito por identificador de módulo/propietario.
- Referencias compartidas para un mismo recurso.
- Liberación solo después del último propietario.
- Liberación por propietario y limpieza del host.
- Métricas de recursos, propietarios y referencias.
- Clasificación por geometría, material, textura, render target, buffer y otros.

Regla de seguridad: el manager solo debe recibir recursos cuya propiedad haya sido transferida explícitamente. No debe escanear la escena ni llamar dispose() sobre recursos que continúen siendo propiedad de controladores productivos.

Pruebas: `scripts/aurum-gpu-resource-manager.test.ts` y cobertura del host en `scripts/aurum-production-plugin-host.test.ts`.

## Mejoras recientes del flujo de gemas

- La asignación del material físico se realiza antes del enriquecimiento óptico secundario.
- HDRI de gema puede actualizarse sobre los targets resueltos.
- El índice de capas de gemas se prepara al cargar el modelo.
- Inclusiones, diagnósticos y mapa de espesor se difieren a turnos idle.
- BVH admite actualización dirigida de los targets modificados.
- Se comprueba que los targets pertenezcan al modelo actual para descartar referencias obsoletas.

Pruebas: `scripts/aurum-gem-application.test.ts`.

Estas mejoras no equivalen a una certificación visual/performance: deben validarse con modelos CAD representativos en navegador.

## CI

El workflow `.github/workflows/quality.yml` incluye build, typecheck, pruebas de regresión AURUM, ESLint y comprobaciones Deno de Edge Functions. Se añadieron pasos para los tests de aplicación de gemas y GPU Resource Manager.

No marcar CI como aprobado hasta que GitHub Actions publique resultados exitosos del commit evaluado.

## Plan de auditoría solicitado a Lovable

1. Levantar un mapa real de dependencias e imports entre todos los módulos AURUM.
2. Identificar ciclos, imports cruzados, responsabilidades duplicadas y dependencias ocultas.
3. Clasificar cada componente como motor independiente, adaptador, coordinador, diagnóstico o infraestructura.
4. Revisar si cada módulo tiene contrato estable, ownership explícito, política de errores, cancelación y dispose.
5. Auditar el GPU Resource Manager y proponer adopción gradual sin doble liberación ni pérdida de recursos compartidos.
6. Revisar el pipeline de importación y los límites de memoria/CPU en modelos grandes.
7. Revisar la frontera entre Gem Engine, entorno, material-application, BVH y transiciones.
8. Revisar Edge Quality y Final Render sin añadir loops ni buffers redundantes.
9. Ejecutar build, typecheck, ESLint y todas las pruebas AURUM; informar resultados reales y logs.
10. Entregar hallazgos por severidad (P0/P1/P2/P3), evidencia (archivo y línea), impacto, corrección propuesta y prueba de regresión.

## Entregable esperado

Lovable debe entregar primero un informe de auditoría sin modificar código. Después debe presentar un plan de correcciones ordenado por riesgo. Ningún cambio que afecte el motor óptico, render en vivo, materiales, HDRI, BVH o ownership GPU debe aplicarse sin revisión y autorización.
