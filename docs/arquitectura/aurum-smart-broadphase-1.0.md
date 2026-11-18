# AURUM SMART BROADPHASE 1.0

## Objetivo
Reducir comparaciones de pares de cuerpos antes de los análisis de relación e intersección. Sweep-and-prune ordena AABB por minX en coordenadas de mundo y comprueba solapamiento Y/Z con tolerancia.

## Integración
- Solid Engine y Intersection Engine usan el mismo broadphase.
- Los límites se construyen a partir de triángulos transformados con matrixWorld.
- Solo los pares con AABB solapada pasan al análisis posterior.
- AABB vacíos o no finitos nunca sirven para descartar: todos sus pares se conservan como fallback.
- El narrowphase existente sigue determinando los resultados; el broadphase no afirma que exista una intersección.

## Métricas
totalPossiblePairs: n(n-1)/2.
candidatePairCount: pares enviados a las fases posteriores.
prunedPairCount: pares descartados por separación AABB.
fallbackPairCount: pares conservados por límites no fiables.

## Límites
El peor caso continúa siendo O(n²) si los AABB se solapan en X. No es una operación booleana Rhino BREP. No modifica geometría, materiales, shaders, BVH óptico, HDRI ni calibración.
