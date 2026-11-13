# AURUM RENDER — arquitectura, capacidades y evolución modular

> Estado del documento: auditoría de arquitectura y propuesta de evolución.
> Base revisada: rama `main`, código de AURUM RENDER y dependencias declaradas en `package.json`.
> Propósito: explicar cómo está construido AURUM RENDER, separar capacidades implementadas de capacidades experimentales y definir una evolución modular sin alterar la calidad visual actual.

## 1. Resumen ejecutivo

AURUM RENDER está construido sobre **Three.js y WebGL**. Sobre esa base se ha desarrollado una capa propia especializada en visualización de joyería: materiales de metales, perfiles ópticos de gemas, entornos HDRI diferenciados, preparación de modelos, aceleración geométrica, iluminación de estudio, postprocesamiento y captura final.

Por tanto, la descripción más precisa no es «un motor gráfico escrito desde cero», sino:

**Un motor de visualización de joyería desarrollado por AURUM sobre Three.js, con módulos, perfiles, algoritmos y pipelines especializados propios.**

La estrategia aprobada es conservar esa base y evolucionarla hacia una arquitectura modular con contratos explícitos y plugins. La modularización no debe cambiar por sí misma los shaders, calibraciones, HDRI, geometría ni el resultado visual.

## 2. Comparación tecnológica

La columna de iJewel resume la referencia comparativa compartida para este proyecto. Sus detalles internos no se consideran verificados de forma independiente; iJewel es una tecnología propietaria y no tenemos acceso a su implementación privada.

| Tecnología / capacidad | iJewel (referencia compartida) | AURUM RENDER (estado comprobado en el repositorio) |
|---|---|---|
| Base gráfica | Three.js | Three.js `0.185.1` |
| Arquitectura | Threepipe + WebGi, según la referencia | Motor propio de aplicación sobre Three.js, organizado en componentes y módulos especializados |
| Renderizado | WebGL | WebGL mediante Three.js; pipeline de render en vivo y ruta de captura final |
| Materiales | PBR y plugins especializados | `MeshPhysicalMaterial` y motor PBR propio en `aurum-material-engine.ts`, con perfiles de materiales |
| Diamantes | Algoritmos y shaders especializados (según referencia) | Shader de gemas, dispersión dinámica, perfiles y runtime BVH dedicado; pipeline geométrico de rayos en fase de desarrollo |
| Refracción | Cálculo especializado en tiempo real (según referencia) | IOR, transmisión y respuesta de material de Three.js, más utilidades geométricas propias de refracción/reflexión |
| Piedras preciosas | Pipeline especializado | Catálogo y perfiles ópticos por familia, shader dinámico y entorno de gemas independiente |
| Metales | PBR, tone mapping y LUT (según referencia) | Perfiles PBR propios, motor de materiales y entorno HDRI independiente para metales |
| Iluminación | HDRI de estudio y presets (según referencia) | Controlador de iluminación, presets y entornos separados para metales y gemas |
| Postprocesado | Plugins de SSAO, Bloom, LUT, TAA y otros (según referencia) | Pipeline propio de postprocesamiento y configuración de efectos; la activación depende del modo de render |
| Modelos | 3DM, FBX, STL, OBJ, GLTF y GLB (según referencia) | Pipeline propio de carga y preparación; conversión/exportación GLB y compresión Draco. Los formatos concretos admitidos deben confirmarse por cada ruta del loader |
| Optimización | Render progresivo y gestión de recursos (según referencia) | BVH, cachés, preparación/LOD de geometría, presupuesto adaptativo por triángulos y control del ciclo de vida del visor |
| Captura final | No especificado en la referencia | Ruta de captura final con `three-gpu-pathtracer` y utilidades propias de captura |
| Integración de joyería | No especificado en la referencia | Reconocimiento de partes/capas, asignación de metales y gemas, preparación de mallas y herramientas de exportación |

**Importante:** esta tabla no es un benchmark de calidad ni una certificación de equivalencia. Compara el alcance descrito en la referencia aportada con capacidades y archivos identificados en el repositorio. Para afirmar superioridad o igualdad hacen falta pruebas controladas con la misma geometría, cámara, iluminación, materiales, resolución y hardware.

## 3. Arquitectura actual identificada

### Aplicación e integración

- `src/components/AurumRender.tsx`: componente de integración principal. Coordina interfaz, estado, carga de modelos, selección, materiales, gemas, iluminación, exportación y conexión con los módulos.
- `src/components/AurumRenderShell.tsx`: contenedor/carga de la experiencia.
- `src/components/AurumRenderSidebar.tsx` y `AurumRenderConfig.tsx`: superficies de interfaz y configuración.
- `src/lib/aurum/api.ts`: fachada de comandos para la integración interna y una API allowlisted para configuradores embebidos.

**Hallazgo arquitectónico:** el componente principal tiene aproximadamente 4.900 líneas y concentra demasiadas responsabilidades. Además, actualmente utiliza una directiva `@ts-nocheck`. Esto no invalida el motor, pero sí aumenta el coste y el riesgo de evolución. La solución será extraer responsabilidades gradualmente, con tipos y pruebas, sin reescritura masiva.

### Materiales, gemas y óptica

- `src/lib/aurum-material-engine.ts`: motor de perfiles de materiales para metales y gemas.
- `src/lib/aurum/material-application.ts`: aplica materiales y gemas a objetivos/modelos.
- `src/lib/aurum/scintillation.ts`: respuesta dinámica de gemas y calidad de shader.
- `src/lib/aurum/gem-physical-core.ts`: modelo físico/perfil de gema y campos asociados.
- `src/lib/aurum/optical-response.ts`: respuesta óptica de familia.
- `src/lib/aurum/aurum-diamond-material.ts`: integración del material de diamante.
- `src/lib/aurum/aurum-diamond-pipeline.ts`: utilidades de Fresnel, reflexión, refracción y trazado geométrico de rayos de diagnóstico.
- `src/lib/aurum/aurum-diamond-bvh-runtime.ts`: runtime BVH especializado para gemas/diamantes.

**Límite técnico que debe comunicarse con precisión:** el trazado geométrico CPU de `aurum-diamond-pipeline.ts` es una herramienta de muestreo/diagnóstico; no es por sí solo un path tracer de imagen completa. La captura final dispone de una ruta separada con `three-gpu-pathtracer`.

### Iluminación, escena y renderizado

- `src/lib/aurum/lighting.ts`: controlador de luces y rigs de iluminación.
- `src/lib/aurum/environment.ts`: entorno de metales/escena.
- `src/lib/aurum/gem-environment.ts`: entorno específico de gemas.
- `src/lib/aurum/scene.ts`: controlador de escena.
- `src/lib/aurum/viewer.ts`: creación, resize, ciclo de render y disposición del visor.
- `src/lib/aurum/post.ts`: utilidades del pipeline de postprocesamiento.
- `src/lib/aurum/path-traced-capture.ts` y `path-tracer-final.ts`: ruta de captura final/path tracing.

### Geometría, carga y rendimiento

- `model-loader.ts`, `model-prep.ts`, `model-normalizer.ts`, `model-parts.ts` y `mesh-preflight.ts`: carga, normalización, preparación, identificación de partes y diagnóstico de mallas.
- `live-geometry-lod.ts`: preparación y calidad de geometría en vivo.
- `runtime-budget.ts`: presupuesto adaptativo en función del número de triángulos.
- `thickness-map.ts`: mapas/cachés de espesor.
- `draco-export.ts`: compresión de exportación GLB con Draco.

## 4. Arquitectura objetivo: AURUM CORE + módulos + plugins

La propuesta no consiste en convertir cada archivo en un plugin. Primero se separan responsabilidades y se definen contratos. Algunos componentes seguirán siendo servicios internos del núcleo; los plugins serán extensiones que implementen un contrato estable.

### AURUM CORE

Responsabilidades centrales:

1. Ciclo de vida de la aplicación de render.
2. Contexto de escena y cámara.
3. Acceso controlado al renderer/WebGL.
4. Gestión y liberación de recursos GPU.
5. Eventos de resize, visibilidad y recuperación de contexto.
6. Presupuesto global de rendimiento.
7. Registro y coordinación de capacidades.

El núcleo debe poder iniciar una escena básica y cerrarse correctamente sin que ningún plugin opcional esté instalado.

### Módulos especializados

| Módulo objetivo | Responsabilidad | Base existente |
|---|---|---|
| Gem Engine | Materiales, familias de gemas, perfiles, inclusiones y respuesta dinámica | `material-application.ts`, `scintillation.ts`, `gem-physical-core.ts`, catálogos |
| Diamond Engine | Material de diamante, aceleración BVH y diagnóstico óptico | `aurum-diamond-material.ts`, `aurum-diamond-bvh-runtime.ts`, `aurum-diamond-pipeline.ts` |
| Metal Engine | Perfiles y aplicación de materiales metálicos | `aurum-material-engine.ts`, `material-application.ts` |
| Light Engine | Rig, presets, HDRI y entornos | `lighting.ts`, `environment.ts`, `gem-environment.ts` |
| Geometry Engine | Importación, preflight, normalización, partes y LOD | `model-loader.ts`, `model-prep.ts`, `mesh-preflight.ts`, `live-geometry-lod.ts` |
| Post Engine | Efectos, calidad y composición de imagen | `post.ts`, `aurum-post-engine.ts`, `aurum-ssao-engine.ts` |
| Capture Pipeline | Captura de alta calidad y path tracing | `path-traced-capture.ts`, `path-tracer-final.ts` |
| Pipeline Manager | Coordinar orden, dependencias, perfiles y calidad | Nuevo componente por diseñar |

### Contrato mínimo de plugin (diseño propuesto)

Todo plugin deberá declarar:

- Identificador y versión.
- Capacidades que proporciona.
- Dependencias obligatorias y opcionales.
- Inicialización con un contexto explícito.
- Activación/desactivación.
- Liberación idempotente de recursos.
- Configuración validada y tipada.
- Compatibilidad con los modos interactivo y final.
- Pruebas de contrato y de regresión.

Los plugins no deben crear render loops paralelos, apropiarse del renderer sin autorización ni modificar recursos que no les pertenecen.

## 5. Secuencia de implementación aprobada

1. **Baseline visual y de rendimiento:** guardar escena, modelo, cámara, presets, capturas y métricas de referencia.
2. **Contratos de AURUM CORE:** tipar contexto, capacidades, eventos y gestión de recursos. Sin tocar shaders ni calibraciones.
3. **Extraer infraestructura:** separar ciclo de vida del renderer, escena/cámara y recursos.
4. **Gem Engine:** primera extracción especializada, manteniendo la salida visual.
5. **Metal Engine y Light Engine:** separación progresiva con pruebas de equivalencia.
6. **Pipeline Manager:** orquestar módulos y presupuestos de calidad/GPU.
7. **Plugin Registry:** habilitar extensiones internas cuando los contratos estén probados.

## 6. Criterios de aceptación y protección visual

La imagen de referencia de la joya compartida por el usuario será la referencia visual de regresión. Para cada extracción se debe comparar:

- Color, reflejos y respuesta del oro blanco.
- Transparencia, fuego y reflejos del diamante central.
- Apariencia de piedras laterales.
- Legibilidad de engastes y geometría.
- Resultado de captura final.
- Fluidez del orbitado y estabilidad tras resize/minimizar/maximizar.
- Tiempo de render y uso de memoria/GPU, en el mismo hardware y condiciones.

Una extracción no se acepta solo porque compile. Debe mantener el comportamiento visual y no introducir regresiones de rendimiento. Si no se dispone de capturas comparables o métricas, el resultado se marca como pendiente de validación.

## 7. Reglas de ingeniería

- Trabajar exclusivamente en `main`; no crear ramas.
- No reemplazar Three.js ni reescribir AURUM RENDER.
- No modificar shaders, BVH, HDRI ni calibraciones durante las extracciones de infraestructura, salvo autorización técnica explícita y prueba específica.
- Mantener interfaces explícitas y evitar nuevos `any` en los contratos.
- Cada cambio debe incluir pruebas unitarias/de contrato cuando corresponda.
- Ejecutar build, typecheck, lint y pruebas de regresión antes de declarar una fase terminada.
- Preparar SQL separado para carga manual en Supabase si una fase futura requiere cambios de base de datos.
- Mantener AURUM CAUSTICS como laboratorio experimental hasta validar un método físico de cálculo de caústicas.

## 8. Estado y límites de esta auditoría

Esta auditoría se basa en la estructura y los archivos consultados en GitHub. Identifica responsabilidades, dependencias directas y oportunidades de modularización, pero no equivale a un perfilado de GPU ni a una ejecución local de build/tests.

La tabla de iJewel procede de la referencia compartida por el usuario y no constituye una auditoría de su código privado.

**Objetivo:** que AURUM evolucione hacia una plataforma propia de tecnología de renderizado para joyería, conservando la calidad de imagen actual y ganando modularidad, mantenibilidad y capacidad de extensión.
