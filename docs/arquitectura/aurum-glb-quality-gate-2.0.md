# AURUM GLB QUALITY GATE 2.0

## Objetivo

Validar la escena posterior a AURUM METAL UNION contra el GLB reabierto y conservar trazabilidad de cada fusión metálica aceptada.

## Orden correcto del pipeline

1. Se prepara el modelo Rhino y se aplica la política de visibilidad.
2. AURUM METAL UNION intenta únicamente uniones CSG compatibles; conserva ocultos los originales y registra `aurumUnionSource`.
3. Se captura el snapshot de origen **después** de la soldadura.
4. GLTFExporter genera el GLB y GLTFLoader lo reabre.
5. El Quality Gate compara la escena posterior a la unión con la escena reabierta.

## Qué valida

- Cantidad de mallas visibles y triángulos.
- Geometría vacía o con posiciones no finitas.
- Materiales asignados y nombres de materiales recuperados.
- Conteo de mallas clasificadas como gemas.
- Bounds mundiales.
- Cantidad de mallas de unión y cantidad/identidad de cuerpos de origen registrados en `aurumUnionSource`.

## Política de fusiones

La reducción de mallas causada por una unión CSG **no es una pérdida frente al Quality Gate**, porque el snapshot se toma después de la unión. La escena fusionada es la referencia que debe conservar el GLB.

Si durante la serialización GLB desaparecen más mallas respecto de esa escena posterior a la unión, se mantiene el error `MESH_COUNT_REDUCED`.

Si el GLB no conserva los registros de procedencia de una unión, se bloquea con `METAL_UNION_PROVENANCE_LOSS`. Así podemos comprobar que cada malla soldada representa los cuerpos originales esperados.

La trazabilidad no prueba por sí sola la equivalencia geométrica exacta del CSG. El gate continúa validando triángulos, bounds, gemas y materiales por separado.

## Umbrales

- Retención mínima de triángulos: 98%.
- Desviación máxima relativa de bounds: 0.5%.

Son umbrales de control de malla triangulada, no una prueba exacta de equivalencia Rhino BREP/NURBS.

## Límites conocidos

- AURUM METAL UNION es una unión visual de malla mediante CSG, no una operación booleana BREP nativa de Rhino.
- La superficie abierta que penetra un sólido no queda automáticamente reparada por esta versión.
- La trazabilidad GLB depende de que GLTFExporter/GLTFLoader preserven los extras de usuario; la prueba automatizada cubre el contrato de metadatos, pero falta verificar un 3DM complejo real.
- No modifica shaders, HDRI, BVH ni el motor óptico de Aurum Render.
