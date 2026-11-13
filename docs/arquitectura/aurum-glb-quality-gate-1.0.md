# AURUM GLB QUALITY GATE 1.0

## Objetivo

Comprobar que el GLB binario generado por AURUM conserva los elementos esenciales del modelo antes de aceptar el resultado para el visor. La validación se ejecuta después de GLTFExporter y de una reapertura real mediante GLTFLoader, y antes de la compresión Draco.

## Qué compara

- Mallas visibles y cantidad de triángulos.
- Geometría vacía o con posiciones no finitas.
- Asignación de materiales.
- Nombres de materiales recuperados.
- Mallas clasificadas como gemas mediante metadatos o nombres.
- Límites espaciales mundiales (bounds), incluyendo transformaciones.

## Política

- **failed**: pérdida grave de triángulos, pérdida de mallas de gema, geometría inválida, ausencia de mallas o cambio significativo de bounds. El exportador rechaza el GLB y comunica el diagnóstico.
- **warning**: cambios de nombres de materiales o reducción del número de nodos de malla. La agrupación de primitivas puede ser intencional, por lo que no se bloquea únicamente por ese recuento.
- **passed**: no se detectan pérdidas en los criterios anteriores.

Los valores iniciales son 98% de retención de triángulos y 0.5% de desviación máxima relativa de bounds. Son umbrales de control de calidad para la malla triangulada, no una prueba exacta de equivalencia BREP.

## Límites conocidos

- La comparación se hace sobre la escena Three.js previa a exportación y la escena reabierta desde el GLB; no inspecciona el archivo Rhino 3DM nativo ni demuestra equivalencia NURBS/BREP.
- El número de mallas puede cambiar por la división o agrupación de primitivas; se informa como advertencia, no como fallo.
- Los nombres de materiales se advierten cuando no se recuperan, pero la validación no pretende demostrar igualdad física exacta de todos los parámetros PBR.
- No fusiona sólidos, no repara geometría, no cambia materiales, normales, shaders, HDRI, BVH ni el motor óptico de Aurum Render.
- Debe complementarse con pruebas de 3DM reales, especialmente modelos con múltiples cuerpos metálicos, gemas, materiales por cara y cuerpos solapados.

## Integración

La validación se ejecuta dentro de `convertAurumToGlb`, inmediatamente después de `GLTFExporter.parse`. Si falla, la promesa de exportación se rechaza y el flujo no continúa a la normalización/compresión del GLB defectuoso.
