# AURUM INTERSECTION 1.0

## Propósito

AURUM INTERSECTION añade detección de intersecciones entre triángulos de cuerpos distintos al diagnóstico de AURUM GEOMETRY, AURUM SURFACE y AURUM SOLID. Se ejecuta después de AURUM SOLID durante la importación y no modifica el modelo.

## Método

1. Actualiza matrices de mundo y construye triángulos a partir de las mallas visibles.
2. Construye una jerarquía BVH propia por cuerpo, mediante partición mediana sobre el eje de mayor extensión de centroides.
3. Utiliza cajas envolventes como broad phase.
4. Ejecuta una prueba de ejes separadores (SAT) entre pares de triángulos candidatos. Se consideran las normales de ambos triángulos y los productos cruzados de sus aristas; la tolerancia permite evaluar contacto coplanar y no coplanar.
5. Combina evidencia de frontera con muestras interiores ya calculadas por AURUM SOLID.

## Clasificaciones

- `surface-penetrates-solid`: intersección de frontera y muestras de la superficie dentro del sólido.
- `surface-boundary-intersection`: la superficie toca/intersecta la frontera, pero no hay evidencia interior suficiente para afirmar penetración.
- `solid-volume-overlap`: intersección de fronteras y muestras interiores en el otro volumen.
- `solid-boundary-intersection`: fronteras de dos sólidos se intersectan, sin muestras interiores concluyentes; puede ser tangencia o cruce estrecho.
- `surface-surface-intersection`: intersección de dos superficies abiertas.
- `disjoint`: no se detectaron pares triangulares intersectantes en una pareja con cajas solapadas o no se generó pareja candidata cuando las cajas están separadas.
- `unresolved`: se agotó el presupuesto de pruebas.

## Límites y seguridad

El SAT es una prueba geométrica sobre triángulos teselados, no una operación booleana exacta ni una prueba topológica de BREP Rhino. La tolerancia debe corresponder a las unidades y escala del archivo. El resultado de frontera por sí solo no diferencia tangencia exacta de penetración extremadamente fina; por eso se conserva una categoría separada y confianza media.

El BVH limita el número de pruebas de triángulos. El presupuesto predeterminado es 2.000.000 por importación; si se agota, el informe marca `truncated` y no presenta el resultado parcial como completo.

No se realizan boolean union/difference/intersection, soldaduras, recortes, cambios de material, cambios de normales ni alteraciones de transformaciones. El motor óptico de Aurum Render permanece intacto.

## Validación pendiente

Las pruebas sintéticas cubren una superficie que atraviesa un sólido, contacto coplanar, cuerpos separados, límite de pruebas y ausencia de mutación. La validación final requiere archivos 3DM reales con engastes, piedras, superficies auxiliares y sólidos de distintas escalas, y comparación de la exportación GLB reabierta.
