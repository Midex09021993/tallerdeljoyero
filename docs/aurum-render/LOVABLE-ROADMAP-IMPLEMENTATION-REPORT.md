# AURUM RENDER — Informe de recomendaciones de Lovable e implementación

**Base documental:** “Auditoría Tecnológica Integral de AURUM RENDER”, compartida por el usuario.  
**Rama de trabajo:** `main`.  
**Corte de implementación:** 14 de noviembre de 2026.

Este informe separa las recomendaciones expresas de la auditoría de Lovable de los cambios comprobables en el repositorio. “Implementado” describe código y pruebas añadidos; no equivale a certificación visual, medición de rendimiento ni CI aprobado.

## 1. Hoja de ruta de Lovable frente al trabajo realizado

| Fase | Lo que Lovable recomendó | Lo que ya hicimos en AURUM | Estado real |
|---|---|---|---|
| 1. Estabilización | Revisar ciclo de vida de `viewer.ts` y `AurumRender.tsx`; comprobar 10 cargas/descargas consecutivas sin crecimiento continuo de memoria WebGL. | Se reforzó la liberación de geometría temporal en el GLB Quality Gate; se documentó ownership y teardown; se mantuvo `disposeAurumViewer()` como dueño único de renderer, composer, escena, controles y recursos del visor. | **Parcial.** Hay correcciones y límites de ownership definidos; falta la prueba de 10 ciclos en navegador/GPU real. |
| 2. Module Contracts | Formalizar `IAurumGeometryContract`, `IAurumOpticalContract`, `IAurumRenderPipelineContract` e `IAurumMediaExportContract` para separar módulos productivos y controladores. | Se creó `module-contracts.ts`; Geometry extiende el contrato desde el importador; Metal/Gem implementan contratos ópticos separados y una fachada conjunta; Post expone modos LIVE/SETTLED/CAPTURE; Media Export unifica creación del frame pipeline y grabación; contratos registrados y consumidos desde el host productivo. | **Implementado en código.** Pruebas añadidas al workflow; falta ejecución CI verificable. |
| 3. Rendimiento LIVE | Bypassear GemMask durante movimiento activo y restaurarlo al primer frame estable. | Durante `onStart`, el compositor omite `GemMask` y su FXAA dependiente; conserva RenderPass, OutputPass y Surface Edge AA cuando el perfil LIVE lo permite. En `onEnd`, el contrato vuelve a SETTLED y restaura los pases según el perfil de reposo. Se añadió regresión automatizada. | **Implementado en código y cubierto por prueba fuente.** Falta medir FPS y validar visualmente el primer frame estable en navegador/GPU real. |
| 4. Calidad de metales | Sustituir CSG destructivo por consolidación no destructiva mediante `mergeGeometries` y soldadura creased; excluir gemas. | Se optimizó Visual Weld y se añadió `fast-visual-merge.ts`: agrupa solo meshes con categoría metal explícita, mismo padre y misma instancia de material; transforma clones a coordenadas del padre; valida salida; oculta fuentes solo tras añadir el reemplazo. Opción explícita `metalFastVisualMerge` en el importador, desactivada por defecto; pruebas de compatibilidad, exclusión de gemas y fallback. | **Implementado como función opt-in y cubierto por pruebas fuente.** No se activa por defecto; falta ejecución CI y validación con modelos CAD/GLB reales. |
| 5. Vídeo determinista | Renderizar y codificar fotogramas de forma secuencial/offscreen para no depender del reloj de GPU y evitar frames perdidos. | Se formalizó el contrato Media Export; el vídeo utiliza el compositor y los pases de belleza existentes, incluye Surface Edge AA cuando corresponde y restaura el estado del visor incluso ante fallos. | **Parcial.** Sigue usando `MediaRecorder`/`captureStream()`; no hay codificador offline determinista ni garantía de 60 FPS en el archivo. |
| 6. Acumulación progresiva en reposo | Evaluar 2–4 subfotogramas con jitter al detener la cámara para mejorar facetas. | Se formalizaron modos y se mantuvo render por demanda, Surface Edge AA 0.035 en perfiles habilitados y TAA desactivado en LIVE y SETTLED. | **No implementado intencionalmente.** La acumulación temporal/jitter no se activa porque el usuario indicó mantener TAA desactivado y priorizar rendimiento y estabilidad. |
| 7. Validación automática | Crear regresión visual Playwright con referencias perceptuales para anillos, aretes y dijes. | Se ampliaron pruebas unitarias de contratos, gemas/BVH, vídeo, GLB Quality Gate, Visual Weld y ciclo de vida; se incorporaron al workflow de calidad. | **Parcial.** Hay pruebas unitarias; falta suite Playwright visual/perceptual y ejecución CI con logs válidos. |

## 2. Hallazgos prioritarios de Lovable

| ID | Hallazgo de la auditoría | Trabajo realizado | Pendiente / decisión |
|---|---|---|---|
| H-01 | CSG de metales con límite de 16 uniones y riesgo ante caras coplanares/tolerancias. | Fast Visual Merge ya existe como ruta separada sin CSG; solo se ejecuta si el importador recibe `metalFastVisualMerge: true`. Agrupa por padre y material exacto, preserva UV/normales/transformaciones y deja las fuentes ocultas pero recuperables. | No aumentar el límite CSG ni activar booleana global. Fast Visual Merge sigue opt-in hasta completar CI y validación CAD/GLB real. |
| H-02 | GemMask añade renders de profundidad/máscara durante órbita. | Bypass activo: GemMask y el FXAA que consume su máscara quedan deshabilitados durante `onStart`; `onEnd` restablece el perfil SETTLED y los vuelve a habilitar solo si la calidad seleccionada lo permite. La cadena de belleza restante se conserva. | Falta validar en GPU real que la máscara reaparece sin salto visual y medir el ahorro de tiempo por frame. |
| H-03 | Vídeo depende de la cadencia de GPU y puede perder fotogramas. | Pipeline de vídeo conectado al compositor; restauración transaccional y contrato común añadidos. | Falta modo determinista cuadro a cuadro/offscreen y encoder compatible; no afirmar equivalencia de vídeo con la vista del visor todavía. |
| H-04 | Duplicidad entre `src/lib/aurum-*-engine.ts` y controladores `src/lib/aurum/*`. | Contratos canónicos tipados y dependencias entre módulos registrados. | Sigue pendiente inventariar presets/interfaces duplicados y migrar por partes sin cambiar valores ni lógica óptica. |
| H-05 | No hay TAA acumulativo en reposo. | TAA permanece desactivado en LIVE y SETTLED; Surface Edge AA suave en perfiles habilitados. | No se adopta la recomendación de TAA/jitter en reposo por instrucción expresa del usuario. No reactivarlo en esta fase. |

## 3. Contratos que quedan formalizados

| Contrato | Punto de implementación | Consumidor productivo |
|---|---|---|
| `IAurumGeometryContract` | `src/lib/aurum/core/module-contracts.ts`; `AurumImportPlugin` lo extiende | `aurum.import` / import pipeline manager |
| `IAurumOpticalContract` | `module-contracts.ts`, `optical-contract.ts`, `metal-adapter.ts`, `gem-adapter.ts` | `aurum.optical-contract`, dependiente de `aurum.metal` y `aurum.gem` |
| `IAurumRenderPipelineContract` | `render-pipeline-contract.ts` | `aurum.post`; cambios de movimiento y reposo usan `setMode` |
| `IAurumMediaExportContract` | `media-export-contract.ts` | `aurum.media-export`; frame pipeline y grabador consumidos desde el host |

Invariantes de integración:
- Los contratos no son propietarios de renderer, composer, scene, camera, controles, texturas HDRI, materiales ni BVH.
- `disposeAurumViewer()` conserva el teardown único del visor.
- La fachada óptica delega en los adaptadores actuales: no altera shaders, IOR, dispersión, scintillation, BVH, HDRI ni calibraciones.
- LIVE y SETTLED no activan TAA. El modo CAPTURE es una etiqueta contractual y no habilita TAA.
- La transición de gemas se limita a canales de apariencia compatibles y el refresco BVH de los meshes seleccionados espera a que la transición termine.

## 4. Evidencia de código y validación

Cambios de esta fase:
- `src/lib/aurum/core/module-contracts.ts`
- `src/lib/aurum/core/render-pipeline-contract.ts`
- `src/lib/aurum/core/media-export-contract.ts`
- `src/lib/aurum/core/optical-contract.ts`
- Adaptación de `import-plugin.ts`, `metal-adapter.ts`, `gem-adapter.ts`, `video-frame-pipeline.ts` y `AurumRender.tsx`.
- Pruebas en `scripts/aurum-adapter-contracts.test.ts` y `scripts/aurum-gem-application.test.ts`.

El workflow `.github/workflows/quality.yml` ya contiene los pasos para esas pruebas. En el último chequeo del commit de cierre no había workflow runs ni status checks asociados; por ello no se declara TypeScript, build, lint ni pruebas aprobadas. La validación técnica debe completarse cuando GitHub Actions entregue una ejecución con runner y logs.

## 5. Orden recomendado para la siguiente fase

1. Ejecutar CI y corregir cualquier fallo de compilación o pruebas sin mezclar cambios funcionales.
2. Implementar GemMask bypass LIVE de forma aislada y reversible, sin alterar shaders ni perfil settled.
3. Validar Fast Visual Merge opt-in con fixtures CAD/GLB reales; mantener CSG experimental fuera del camino por defecto.
4. Diseñar la ruta de vídeo determinista como motor de exportación separado del visor actual.
5. Añadir regresión visual Playwright con fixtures de joyería y tolerancias perceptuales.

La acumulación TAA/jitter en reposo queda fuera de este plan mientras siga vigente la instrucción de no activar TAA en el visor LIVE ni SETTLED.
\n\n## 6. Cierre de implementación — AURUM FAST VISUAL MERGE\n\n- Nuevo módulo: `src/lib/aurum/fast-visual-merge.ts`.\n- Integración: `convertAurumToGlb(..., { metalFastVisualMerge: true })` y `AurumImportRequest.metalFastVisualMerge`. La opción está desactivada por defecto y no se activa automáticamente en importaciones existentes.\n- La consolidación no realiza CSG, no recalcula normales ni altera UV; mantiene geometrías fuente intactas y recuperables. Gemas, materiales distintos, padres distintos, layouts de atributos incompatibles y meshes no clasificados explícitamente como metal quedan fuera.\n- Pruebas añadidas: `scripts/aurum-fast-visual-merge.test.ts`; incorporadas al workflow `quality.yml`.\n- No se modificaron shaders, BVH, HDRI, calibraciones ópticas ni estados TAA.\n