# Aurum Render — evaluación aislada de trazado de diamante

Estado: evaluación técnica; no activar en el visor de producción todavía.

## Objetivo

Comparar el shader de diamante activo de AURUM con un trazador por píxel basado en BVH, sin modificar el aspecto de las demás gemas ni los metales.

## Candidato principal

- Paquete: `realistic-diamond-shader` (Apache-2.0).
- Referencia: https://github.com/pateljenish9878/realistic-diamond-shader
- Su documentación declara compatibilidad con Three.js 0.160–0.189 y `three-mesh-bvh` 0.9.x. AURUM usa Three.js 0.185.1 y `three-mesh-bvh` 0.9.16.
- Capacidades declaradas: BVH por píxel sobre la geometría real, refracción/reflexión interna, dispersión cromática y HDR/EXR.
- Requisitos relevantes: WebGL2, mapa HDR/EXR de entorno y cámara actualizada por frame. El escalado no uniforme puede invalidar direcciones de rayo/normales.

## Alternativa de referencia, no integrar directamente

- https://github.com/piellardj/diamond-webgl
- Su licencia declarada es GPL-3.0. No copiar ni incorporar su código al producto sin resolver primero las obligaciones y compatibilidad de licencia.

## Límites de esta fase

1. El shader actual de AURUM se conserva como ruta activa y fallback.
2. No se sustituye ningún material de otra familia de gemas ni ningún metal.
3. No se añade aún la dependencia al bundle de producción: primero se debe verificar la geometría real, el formato del HDRI y el comportamiento WebGL2 en el modelo CAD.
4. No declarar una mejora visual o de FPS sin una comparación ejecutada en navegador/GPU con el mismo anillo, cámara, iluminación y resolución.

## Protocolo de comparación

Usar el mismo diamante CAD y las mismas condiciones para ambas rutas:

- **A — Actual:** shader activo de AURUM, sin modificar sus parámetros.
- **B — Experimental:** `createDiamondBVH(geometry)` + `createDiamondMaterial`, comenzando con IOR 2.417, 3 rebotes y dispersión moderada.
- Mantener iguales cámara, transformación del modelo, exposición, resolución y HDRI.
- Capturar vista frontal, tres cuartos y lateral; comparar brillo de mesa/corona, contraste de facetas, fuego cromático, zonas quemadas, estabilidad al orbitar y tiempo por frame.
- Probar primero con 3 rebotes; solo subir a 5 si el rendimiento es estable.
- Confirmar que la geometría tenga facetas/normales correctas y escala uniforme. No reconstruir ni suavizar las facetas CAD.
- Probar también la carga inicial y la exportación final; no asumir que el shader interactivo funciona en el trazador offline.

## Condiciones para activar

Solo considerar una activación tras confirmar:
- compilación/typecheck sin errores con la dependencia y su lockfile actualizados;
- ausencia de errores WebGL en el navegador;
- calidad igual o mejor en las capturas del mismo modelo;
- rendimiento aceptable en el equipo objetivo;
- fallback comprobado y selección limitada estrictamente a materiales cuya familia sea `Diamante`.

## Resultado de la inspección inicial

El proyecto ya usa Three.js 0.185.1 y `three-mesh-bvh` 0.9.16, versiones dentro del rango declarado por el candidato. Esto indica compatibilidad nominal, no garantiza que el shader compile ni que sea visualmente superior en el CAD de AURUM. La validación visual y de rendimiento sigue pendiente en un navegador con WebGL2.
