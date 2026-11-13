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

## AURUM IMPORT — presupuestos de recursos

Se añadieron presupuestos explícitos y configurables sin imponer límites nuevos a los flujos CAD existentes:

- `maxFileBytes`: límite duro opcional, comprobado antes de llamar al decodificador. Si no se especifica, no rechaza archivos por tamaño.
- `geometryBudget.maxMeshes`, `maxVertices`, `maxTriangles`: umbrales informativos calculados con Smart Scan después de normalizar el modelo. El exceso se devuelve en `resourceBudget.exceeded` y en los detalles de `smart-scan-complete`; no rechaza ni modifica la geometría.
- `resourceBudget` informa bytes de archivo, meshes, vértices y triángulos estimados por los buffers inspeccionados.
- El fast path sigue siendo de solo lectura y no lanza diagnósticos topológicos profundos automáticamente.

Pruebas: reporte de exceso de presupuesto sin rechazo y rechazo previo al decodificador cuando se configura explícitamente un máximo de bytes. Los límites geométricos son advertencias, no estimaciones de RAM total ni garantías de memoria GPU; deben calibrarse con archivos CAD reales.

## AURUM IMPORT — cancelación segura y limpieza de geometría

El contrato de importación ahora acepta un `AbortSignal` opcional. Se comprueba antes de iniciar, después de decodificar y entre las etapas de conversión/normalización; el manager también comprueba cancelación entre Smart Scan y cada diagnóstico profundo.

- La cancelación se representa como error estándar `AbortError` y publica `import-failed` con el indicador `cancelled`.
- Si la importación no llega a entregar un resultado, se liberan los `BufferGeometry` decodificados/parciales de origen y modelo, deduplicando referencias compartidas.
- No se liberan materiales: pueden ser compartidos con el visor y no pertenecen exclusivamente al importador.
- La ruta normal y el fast path de Smart Scan permanecen sin diagnósticos profundos; surface/solid/intersection siguen siendo opt-in.
- Límite explícito: los decodificadores actuales de terceros no reciben todavía el AbortSignal. Si se cancela durante una decodificación/conversión síncrona o no cancelable, el resultado se descarta y limpia al alcanzar el siguiente punto seguro; no se promete interrupción inmediata del trabajo interno.

Pruebas añadidas en `scripts/aurum-import-pipeline.test.ts`: solicitud ya cancelada (no invoca el importador), cancelación después de decodificar (libera geometría) y cancelación entre Smart Scan y diagnósticos profundos. La suite ya está integrada en el workflow de calidad.

### AURUM IMPORT — liberación de geometría decodificada tras normalización — 2026-11-13

Se cerró la frontera de memoria de la importación exitosa:

- Una vez que el modelo normalizado está listo, el visor conserva ese modelo como activo.
- Para formatos convertidos (3DM, STL, OBJ y FBX), el importador libera los `BufferGeometry` del objeto decodificado que ya no son referenciados por el modelo normalizado.
- La liberación compara por identidad las geometrías retenidas por el modelo final y deduplica las geometrías de origen. Si una geometría estuviera compartida, no se libera.
- La entrada GLB devuelve el mismo objeto como origen y modelo; en ese caso la operación es un no-op.
- No se liberan materiales, texturas ni recursos del renderer. El contrato del visor sigue siendo propietario del modelo normalizado y de su teardown.
- La referencia `sourceObject` permanece disponible para metadatos/auditoría, pero sus buffers geométricos exclusivos dejan de ser utilizables después de la entrega del resultado.

Pruebas añadidas en `scripts/aurum-import-pipeline.test.ts`: liberar geometría exclusiva, preservar geometría compartida y no liberar el modelo GLB cuando origen/modelo son la misma instancia. La ejecución real de Bun, TypeScript, build y CI sigue pendiente de confirmación.

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



## Actualización del mapa de módulos — 2026-11-13

El mapa de arquitectura de la sección interna de Herramientas se actualizó para reflejar las piezas que ya existen en el repositorio y separar su estado real de integración:

- **AURUM CORE:** Plugin Registry, Service Container, Event Bus, Resource Scope y GPU Resource Manager. El manager GPU está registrado como servicio, pero la adopción sobre recursos productivos sigue siendo explícita y controlada.
- **Adaptadores registrados:** Viewer, Scene, Lighting, Metal y Gem. Son fachadas hacia controladores productivos; su registro no significa que sean motores autónomos.
- **Óptica:** Diamond Pipeline/BVH conserva su runtime especializado. No se modifica ni se declara como plugin autónomo por aparecer en el mapa.
- **Importación:** AURUM IMPORT, Import Pipeline Manager, Smart Scan, Geometry, Solid, Intersection y Broadphase. El manager ya contempla cancelación en puntos seguros y presupuestos de recursos; los presupuestos geométricos son diagnósticos/advisory y el límite de bytes solo se aplica cuando se configura explícitamente.
- **GLB Quality Gate:** existe como módulo de validación y tiene pruebas de round-trip. El punto de invocación exacto dentro de cada ruta productiva debe confirmarse durante la auditoría.
- **Surface:** diagnóstico experimental de solo lectura; no suelda ni repara.
- **Metal Union / Visual Weld:** experimentales y no habilitados por defecto.
- **Post / Edge Quality:** MSAA está integrado en los targets del compositor; TAA permanece en el pipeline de postprocesado; SSAA no está implementado.
- **Final Render / exportación:** el usuario reporta que el flujo ya funciona correctamente. Se refleja como funcional en revisión preliminar, no como validación técnica certificada. La auditoría debe comprobar fidelidad de salida, restauración del visor y limpieza de recursos sin reabrir cambios funcionales innecesarios.
- **Video Export / Image Export:** flujos separados que se conectan al visor productivo; no son plugins independientes del Registry.
- **AURUM GEM TRANSITION:** suspendido. No reactivar.

### Matriz de consumo productivo de los 12 módulos — revisión 2026-11-13

Esta matriz diferencia registro en el host, consumo real de servicios y uso directo de controladores. El registro por sí solo no acredita que un consumidor utilice el contrato del módulo.

| Módulo | Registro en host | Consumo productivo observado | Clasificación |
|---|---|---|---|
| `aurum.viewer` | Sí | Viewer Adapter obtiene scene/renderer; el loop y teardown siguen en AurumRender/viewer | Integrado como adaptador read-only |
| `aurum.geometry` | Sí | Import Manager recibe Geometry Engine por inyección y ejecuta inspección opt-in | Integrado en importación/diagnóstico |
| `aurum.import` | Sí | AurumRender resuelve `aurum.import.manager` y usa `load()` | Integrado en ruta productiva |
| `aurum.scene` | Sí | Scene Adapter se usa para preset y fondo; el controlador conserva la lógica | Integrado como fachada |
| `aurum.lighting` | Sí | El controlador productivo se usa directamente; el host publica sus servicios | Parcial: registro/fachada, consumidor principal aún acoplado |
| `aurum.metal` | Sí | Material Application usa servicios adaptadores para operaciones de metal | Integrado por delegación; ownership de materiales externo |
| `aurum.gem` | Sí | Material Application aplica gemas mediante su servicio de aplicación; óptica/BVH siguen en controladores especializados | Integrado por delegación; no autónomo |
| `aurum.final-render` | Sí | AurumRender resuelve el loader desde el host al solicitar captura final | Integrado bajo demanda |
| `aurum.glb-quality` | Sí | El Quality Gate se ejecuta dentro de `convertAurumToGlb()`; el host publica snapshots/evaluación como servicios | Integrado en exportación; la ruta usa el módulo directamente |
| `aurum.edge-quality` | Sí | La configuración se aplica al construir el pipeline; el host publica la función | Integrado en pipeline, no se observó consumo por lookup del host |
| `aurum.post` | Sí | AurumRender opera composer y controles del pipeline productivo; los servicios también se publican en el host | Integrado en producción; parte del consumo sigue directo |
| `aurum.media-export` | Sí | AurumRender resuelve por host el frame pipeline y el recorder; path-traced capture se publica pero no se confirmó su invocación desde ese servicio | Parcial: vídeo integrado; captura path-traced expuesta sin consumidor confirmado |

#### Fronteras y pendientes que Lovable debe verificar

- **AURUM IMPORT:** el objeto decodificado conserva metadatos, pero sus geometrías exclusivas se liberan al quedar listo el modelo normalizado. Las geometrías compartidas con el modelo final se preservan. La ruta GLB (source === model) no libera.
- **AURUM SCENE / LIGHTING / POST / EDGE:** el host gestiona el ciclo de vida del plugin y publica servicios; los controladores productivos siguen ejecutando parte de las operaciones directamente. No migrar consumidores durante esta fase sin pruebas.
- **AURUM GLB QUALITY:** el round-trip de calidad sí se invoca en `model-loader.ts`; los servicios registrados en host no son el punto de consumo actual.
- **AURUM MEDIA EXPORT:** vídeo usa servicios del host para crear el pipeline de frames y cargar el recorder. El helper path-traced está disponible, pero disponibilidad no equivale a consumo.
- **GPU Resource Manager:** continúa sin ownership de recursos productivos del visor. No transferir recursos como parte de esta auditoría.
- **GEM TRANSITION:** permanece suspendido; Metal Union/Visual Weld permanecen experimentales y desactivados por defecto.

#### Resultado CI de la revisión

Para el commit documental `45bf6088d0f62762a523312c5e6b65efa9348056`, la consulta de estado combinado devolvió cero status checks y la consulta de runs asociados al commit devolvió una lista vacía. No hay evidencia de una ejecución CI para ese commit en la respuesta de GitHub. No se declara build, TypeScript, ESLint ni pruebas aprobadas. Lovable debe ejecutar las validaciones en su entorno y adjuntar logs y SHA exactos.

### Criterio de cierre de esta fase

La prioridad es completar y verificar integraciones, contratos y dependencias reales. No iniciar optimizaciones, cambios ópticos ni rediseños funcionales antes de que Lovable entregue una auditoría de solo lectura con evidencia por archivo/línea, clasificación de severidad y plan de corrección. La existencia de una tarjeta en el mapa no constituye prueba de integración: cada módulo debe rastrearse hasta su punto de invocación productivo y su propietario de ciclo de vida.

La actualización visual del mapa no certifica por sí misma que todos los módulos estén integrados. Las conexiones pendientes quedan explícitamente marcadas para la auditoría.


### Integración multimedia con AURUM CORE — 2026-11-13

Se registra el módulo `aurum.media-export` en el Production Plugin Host. Declara dependencias con Viewer, Post y Final Render y expone:
- `aurum.media.video-frame.create`: fábrica del pipeline de frames que usa el compositor live.
- `aurum.media.video-recorder.load`: carga diferida del codificador MediaRecorder existente.
- `aurum.media.path-traced.capture`: helper de captura path-traced disponible como servicio.

El flujo productivo de vídeo ahora resuelve desde el host la fábrica del pipeline de frames y el cargador del recorder; deja de invocar esos dos componentes directamente desde AurumRender. El pipeline sigue usando el renderer/compositor y los pases live existentes. No se crea otro renderer ni se altera la óptica.

La captura path-traced se expone como servicio, pero su consumo por la ruta concreta de exportación debe confirmarse en una auditoría de llamadas; el flujo de imagen final existente ya se sirve mediante Final Render Adapter. No confundir disponibilidad del servicio con uso efectivo.

El registro y el cambio de consumidor están en los commits `aab7991` y `08b9b2b`. Pendiente: validar compilación y comportamiento de exportación en navegador real; el workflow asociado terminó en fallo sin pasos ni logs disponibles.


### GPU Resource Manager — frontera de ownership explícita — 2026-11-13

- El Production Plugin Host expone ahora `gpuResources` como propiedad tipada (`AurumGpuResourceManager`), además del servicio `aurum.gpu.resources` en el contenedor.
- Ambas rutas apuntan a la misma instancia; se prueba esa identidad y el estado inicial vacío/no-disposed en `scripts/aurum-production-plugin-host.test.ts`.
- La API admite ownership explícito por ownerId, referencias compartidas y liberación al último propietario. La liberación es terminal para un recurso ya disposed.
- **No se transfirió todavía ownership de renderer, composer, escena, geometrías, materiales, texturas HDRI ni BVH** desde los controladores productivos. El tracking sigue opt-in y el estado real de adopción productiva es parcial.
- Esta frontera tipada permite que cada controlador se integre después de forma deliberada, con su ciclo de vida probado. No se debe registrar un recurso compartido en el manager hasta confirmar quién es su propietario y quién ejecuta su cleanup actual.
- Próxima auditoría: inventariar por recurso (creador, consumidores, owner actual, evento de liberación, posibilidad de compartir) y decidir adopción uno por uno. No hacer un barrido global de scene.traverse ni dispose implícito.

Commit de contrato: `83e978a`; prueba: `ab57c8a`; estado UI: `22336e7`.


### Inventario de ownership y teardown — revisión 2026-11-13

La lectura del código productivo confirma que el cierre del visor tiene dos fronteras separadas:

1. `productionPluginHost.dispose()` cierra el Registry y el GPU Resource Manager del CORE.
2. `disposeAurumViewer()` sigue siendo el propietario del teardown de recursos del visor: OrbitControls, Lighting Controller, Ground Controller, selección, texturas/entornos, EffectComposer, render lists y WebGLRenderer. El desmontaje también libera Diamond BVH y listeners/loop.

Hallazgos de integración:
- `AurumLightingController.dispose()` se invoca desde `disposeAurumViewer()`; no se debe registrar su `dispose` como disposer adicional del plugin, porque provocaría doble liberación.
- Scene Adapter delega en el controlador de escena; no declara un disposer propio.
- Viewer Adapter es read-only y no debe liberar renderer, scene, camera ni controls.
- Metal/Gem adapters exponen funciones de aplicación óptica, no ownership de materiales ni texturas; los materiales pueden ser compartidos y siguen bajo los controladores existentes.
- Video Frame Pipeline restaura tamaño, pixel ratio y estado enabled de passes, pero no es propietario del composer ni del renderer.
- El host todavía no recibe recursos Three.js productivos mediante `gpuResources.track()`; su manager permanece como frontera opt-in disponible. Por tanto, no afirmar que el teardown productivo esté centralizado en GPU Resource Manager.

Decisión para esta fase: conservar `disposeAurumViewer()` como propietario único del teardown del visor. No migrar objetos al GPU Resource Manager hasta diseñar una transferencia explícita y probar el orden de liberación. La siguiente integración debe ser de observabilidad/trazabilidad del ciclo de vida, no de doble ownership.

Evidencia principal: `src/components/AurumRender.tsx` (cleanup y desmontaje), `src/lib/aurum/viewer.ts` (`disposeAurumViewer`), `src/lib/aurum/lighting.ts` (dispose de luces), adaptadores Viewer/Scene/Lighting/Metal/Gem y `src/lib/aurum/video-frame-pipeline.ts`.


### AURUM MEDIA EXPORT — rollback transaccional de preparación de frames — 2026-11-13

La preparación del pipeline de vídeo ahora revierte el estado del compositor si falla antes de devolver el controlador al consumidor:

- Si falla `setPixelRatio`, `setSize` o la selección de pases durante la inicialización, intenta restaurar pixel ratio, dimensiones y estado original de todos los pases antes de propagar el error original.
- La restauración intenta completar cada operación aunque una de ellas falle; el primer error de restauración se propaga cuando la restauración fue solicitada explícitamente.
- `restore()` sigue siendo idempotente.
- `renderFrame()` rechaza llamadas posteriores a la restauración para evitar reutilizar un pipeline cerrado.
- El módulo no libera composer, renderer, escena ni pases; su ownership continúa en el visor productivo.

Pruebas añadidas en `scripts/aurum-video-frame-pipeline.test.ts`: rollback ante fallo parcial de configuración y rechazo de render después de restaurar. No se ejecutó Bun/build/TypeScript en este entorno; el cambio requiere validación en CI y exportación real en navegador.


### AURUM GLB QUALITY GATE — ownership de la escena temporal — 2026-11-13

La ruta de conversión a GLB realiza un round-trip real: GLTFExporter genera el binario sin compresión, GLTFLoader lo reabre y el Quality Gate compara geometría, triángulos, bounds, materiales y procedencia de gemas/uniones.

Hallazgo corregido:
- La escena devuelta por `GLTFLoader.parseAsync()` era temporal y se utilizaba solo para tomar el snapshot de calidad.
- No tenía una liberación explícita después de la comparación, tanto en el caso aprobado como en el rechazado.
- Ahora la escena temporal se conserva en una referencia local y se libera en `finally`, después de capturar el snapshot y decidir el resultado.
- La liberación deduplica geometrías, materiales y texturas y actúa exclusivamente sobre recursos de la escena temporal reabierta. No recorre ni libera la escena CAD de origen, ni materiales compartidos del visor.
- Si la limpieza temporal falla, se registra una advertencia sin reemplazar el resultado o error original del Quality Gate.

Límite: esto cubre el árbol de recursos Three.js enlazados directamente a las propiedades de los materiales del GLTF reabierto. No se hace cierre explícito de ImageBitmap ni se modifica el ciclo de vida del decodificador Draco compartido.

Validación pendiente: ejecutar `scripts/aurum-glb-quality-gate.test.ts`, build y exportaciones reales con GLB que incluya texturas, gemas y múltiples cuerpos. No se certifica CI ni compilación desde esta sesión.
