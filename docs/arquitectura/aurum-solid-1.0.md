# AURUM SOLID 1.0

## Propósito

AURUM SOLID amplía el diagnóstico geométrico de importación para clasificar mallas cerradas y superficies abiertas y estimar relaciones entre cuerpos. Se ejecuta después de AURUM GEOMETRY y AURUM SURFACE, sin intervenir el motor óptico de Aurum Render.

## Qué inspecciona

- **Clasificación de cuerpo:** sólido cerrado candidato, superficie abierta o malla inválida.
- **Topología:** aristas de borde y no-manifold, usando cuantización espacial con tolerancia configurable.
- **Volumen:** volumen firmado de la triangulación, informado únicamente cuando la malla supera los controles básicos de cierre.
- **Relaciones:** cuerpos separados, contención probable, solapamiento volumétrico probable, superficie contenida, superficie que penetra un sólido y solapamiento de cajas aún no resuelto.
- **Familia y origen:** pistas conservadoras de metal/gema/otro y metadatos de tipo de geometría disponibles en el objeto.

## Límites deliberados de 1.0

Este módulo trabaja sobre las mallas trianguladas disponibles en Three.js. No dispone de una prueba exacta del BREP nativo de Rhino. La condición de sólido cerrado se infiere a partir del grafo de aristas y volumen firmado; por ello se informa como diagnóstico de malla, no como certificación CAD.

La relación espacial usa cajas envolventes como filtro inicial y muestras de vértices/centroides con pruebas punto-en-sólido. Cuando las cajas se solapan pero las muestras no demuestran interioridad, el resultado es `aabb-overlap-unresolved`. Esto evita confundir una caja coincidente con una intersección real. Una intersección de triángulos que no contenga muestras interiores puede quedar sin resolver en esta versión.

Las etiquetas de contención/penetración tienen confianza media porque son inferencias muestreadas. El siguiente incremento debe incorporar intersección triángulo-triángulo acelerada por BVH y, cuando el importador lo permita, conservar/consultar las propiedades BREP nativas de Rhino para clasificar contactos de cara, arista y punto con mayor certeza.

## Seguridad geométrica

- No realiza boolean union, difference ni intersection.
- No suelda ni elimina vértices.
- No cambia geometría, normales, transformaciones, materiales, nombres ni metadatos.
- No modifica gemas ni calibraciones ópticas.
- Limita pares y muestras para controlar el coste de importación; el informe marca si se truncó.

## Siguiente paso de validación

Ejecutar pruebas sintéticas y, antes de habilitar cualquier reparación, contrastar el informe con archivos 3DM reales que incluyan sólidos intersectados, superficies guía, engastes, gemas, cuerpos tangentes y cuerpos separados. La tolerancia debe calibrarse según unidades y escala del modelo.
