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


## Actualización de cierre técnico — 2026-11-13

### Cambios de infraestructura incluidos en `main`

- GPU Resource Manager: cierre reentrante seguro; el manager marca su estado como cerrado antes de ejecutar callbacks externos de `dispose()`. Prueba de regresión incluida.
- Gem Engine: sincronización de uniformes de entorno que admite correctamente el valor numérico cero.
- Event Bus: entrega el evento a todos los suscriptores registrados incluso si uno falla; después informa los fallos mediante `AggregateError`. La excepción no se silencia y puede activar el rollback del ciclo de vida que emitió el evento.
- Prueba añadida para comprobar aislamiento de suscriptores y reporte agregado.
- La suite `aurum-plugin-registry.test.ts` ya está incluida en el workflow de calidad.

### Matriz de madurez para la auditoría

| Área | Estado para auditoría | Límite explícito |
|---|---|---|
| Plugin Registry | Implementado y probado | Revisar contratos de activación/desactivación y recuperación |
| Service Container | Implementado y probado | Snapshot de solo lectura; no resuelve dependencias dinámicas |
| Event Bus | Implementado; aislamiento de fallos probado | Síncrono; no es una cola/event stream asíncrona |
| Resource Scope | Implementado y probado | Limpieza genérica; no infiere ownership |
| GPU Resource Manager | Implementado y probado | Disponible como servicio; adopción productiva sigue siendo explícita y parcial |
| Viewer / Scene / Lighting / Metal / Gem | Adaptadores de producción | Contratos estables que delegan; no son motores autónomos ni reemplazos |
| AURUM IMPORT / Pipeline Manager | Integrado y probado | Sigue delegando decodificación, conversión y normalización; ampliar pruebas CAD reales |
| Smart Scan | Implementado, solo lectura | Triaje ligero; no sustituye diagnóstico profundo |
| Geometry / Surface / Solid / Intersection / Broadphase | Implementados como diagnósticos | No reparan ni fusionan geometría; revisar precisión y escalabilidad |
| Metal Union / Visual Weld | Experimental | No habilitar por defecto; revisar CSG, costuras y normales con fixtures CAD |
| Edge Quality | Parcial | MSAA/TAA existentes; SSAA no implementado |
| Final Render | Adaptador implementado | Path tracer existente bajo demanda; revisar restauración de estado y coste |
| Gem Transition | Desactivado | No reactivar durante auditoría |

### Restricciones de validación antes de declarar cierre

- No declarar un módulo autónomo solo porque esté registrado en Plugin Registry.
- No transferir recursos de renderer/scene/materiales/HDRI/BVH al GPU Resource Manager sin mapear creación, compartición y liberación por propietario.
- No ampliar Metal Union ni Visual Weld a geometrías Mesh/SubD ni relajar reglas de capas hasta contar con pruebas de manifold, tolerancias, atributos, normales y GLB round-trip.
- No modificar el motor óptico, shaders, perfiles, HDRI, calibración de metales ni pipeline de interacción para completar la documentación.
- La auditoría de Lovable debe comenzar en modo solo lectura y entregar evidencias por archivo/línea, severidad, impacto, recomendación y pruebas necesarias.

### Estado CI

El workflow de calidad está configurado para build, TypeScript, ESLint, pruebas de regresión AURUM y checks Deno. La existencia de esos pasos no acredita que el commit actual haya pasado: registrar el resultado real de GitHub Actions al momento de la auditoría. Si no hay ejecución disponible, marcarlo como pendiente.


## AURUM Module Contracts — primera entrega conservadora

Se amplió el contrato declarativo de plugins sin cambiar la creación de escenas, materiales, geometrías, shaders, HDRI, BVH ni el ciclo de render en vivo.

### Campos nuevos del contrato

- `description`: responsabilidad legible del módulo.
- `providesServices`: identificadores de servicios que el módulo declara ofrecer.
- `requiresServices`: identificadores que deben estar disponibles antes de inicializar.
- `dependencies`: dependencias de plugins existentes, conservando el orden topológico.

### Validaciones previas a inicialización

- Identificadores de servicio vacíos.
- Servicios provistos duplicados dentro de un módulo.
- Servicio declarado como provisto que no existe en el contenedor.
- Dos módulos que declaran el mismo proveedor.
- Servicios requeridos que no están registrados.

Estas comprobaciones ocurren durante la resolución del grafo y antes de ejecutar cualquier `initialize()`. Los contratos son aditivos y opcionales para no obligar a migrar de golpe los módulos existentes.

### Integración

`AurumProductionModule` ahora admite `description` y `requiresServices`, y el host deriva `providesServices` de las claves del mapa de servicios que recibe. El host sigue siendo propietario del ciclo de vida de plugins; los controladores productivos conservan la propiedad de sus recursos Three.js.

### Pruebas añadidas

- Rechazar servicios requeridos ausentes antes de inicializar.
- Rechazar servicios declarados como provistos que no están registrados.
- Rechazar dos módulos que declaran el mismo proveedor.

Ejecutar: `bun test scripts/aurum-plugin-registry.test.ts`.

### Límite de esta entrega

No se migraron todos los módulos productivos para declarar `requiresServices`; esto debe hacerse después de inventariar sus dependencias reales, no adivinándolas. Esta entrega establece y prueba el mecanismo, no certifica todavía que todos los módulos estén completamente contratados.

## AURUM EDGE QUALITY — cierre de contrato MSAA

La revisión del pipeline confirma que `createAurumPostPipeline()` instancia `EffectComposer` y configura EDGE QUALITY inmediatamente después de su construcción, antes de añadir/renderizar los pases. MSAA se limita a los dos targets ping-pong del compositor.

- MSAA se activa solo cuando el renderer declara WebGL2 y el dispositivo ofrece al menos dos samples.
- Los samples solicitados se limitan al máximo reportado por el dispositivo.
- Si alguno de los targets no acepta la configuración, se restauran los valores previos de ambos targets y el compositor conserva su fallback nativo.
- No se añade un render loop, target extra, pasada adicional ni cambio al renderer productivo.
- TAA continúa siendo responsabilidad del pipeline existente. SSAA no está implementado.
- El suavizado FXAA específico de gemas existente continúa aislado mediante su máscara categórica; no se amplía su alcance a metales ni se cambian shaders ópticos.

Pruebas añadidas en `scripts/aurum-edge-quality.test.ts`: límites WebGL2, clamp de samples, configuración simétrica, ausencia de soporte, target faltante y rollback ante target no configurable. El workflow ejecuta esta suite.

## Integración productiva del host — revisión 2026-11-13

La revisión del punto de composición en `src/components/AurumRender.tsx` confirma que el host ya está instanciado dentro del ciclo de vida del visor y que los siguientes servicios se registran y arrancan:

- `aurum.viewer`: escena, cámara, renderer, controles y nodo anfitrión existentes.
- `aurum.geometry`: motor de diagnóstico geométrico.
- `aurum.import`: importador y coordinador de pipeline; la carga de modelos consulta el servicio registrado `aurum.import.manager`.
- `aurum.scene`: adaptador del controlador de escena productivo.
- `aurum.lighting`: adaptador del controlador de iluminación productivo.
- `aurum.metal` y `aurum.gem`: servicios delegados por `material-application.ts`; no sustituyen el motor de materiales ni sus perfiles ópticos.
- `aurum.final-render`: registro diferido del adaptador de render final; la exportación path-traced lo resuelve desde el host al solicitarse.

El host inicia los plugins después de construir los controladores y se libera durante el cleanup del visor. Si el arranque falla, se registra el error y se conserva el renderer productivo existente. Este comportamiento es deliberadamente fail-soft.

### Límites que siguen abiertos

- La integración se encuentra en el punto de composición de `AurumRender.tsx`; no significa que cada subsistema haya transferido su ownership al host.
- El GPU Resource Manager permanece disponible como servicio de infraestructura. Los controladores productivos conservan la propiedad y liberación de sus recursos.
- El adaptador de render final se carga bajo demanda; debe verificarse su exportación real con capturas y escenas de referencia.
- La validación con archivos CAD reales, modelos de gran tamaño y sesiones prolongadas sigue pendiente.
- Gem Transition continúa fuera del alcance y no debe activarse como parte de esta integración.

### Corrección del contrato de identificadores

En `production-plugin-host.ts` se corrigió el patrón de validación de IDs con segmentos separados por punto y la normalización del ID para el servicio `aurum.plugin.*`. Se añadió una regresión para el identificador `aurum.viewer`, que debe publicarse como `aurum.plugin.aurum-viewer`.

### Evidencia de CI

Los runs asociados a los commits `121ea81` y `ee8a5d1` finalizaron en fallo, pero GitHub devolvió los jobs sin pasos ni logs (`steps: null`, `logs_url: null`). Por tanto no se puede atribuir el fallo a TypeScript, tests, build o ESLint ni declarar la suite aprobada. La ejecución verificable de calidad sigue siendo un bloqueo previo al cierre.

