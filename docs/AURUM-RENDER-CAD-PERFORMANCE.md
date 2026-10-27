# AURUM RENDER — Estabilidad con modelos CAD densos

## Objetivo

Conservar la geometría de origen y mantener la interacción utilizable con modelos Rhino/3DM de alta densidad, sin degradar intencionadamente la ruta de fotografía final.

## Cambios registrados en `main`

- `9a454dd` — se retiró el cálculo de profundidad de foco del bucle continuo de renderizado. La profundidad se calcula cuando se activa la función o cuando la captura lo requiere.
- `cc3dc5c` — se evita la construcción opcional de BVH de gemas en modelos de la categoría extrema, para no añadir un coste de preparación desproporcionado.
- `da2c7c9` — la limpieza del visor llama a la rutina existente que retira el modelo y libera geometrías/materiales asociados.
- `a0d7d6a` — se guardan los identificadores de la tarea diferida de precompilación de shaders y se cancelan al desmontar el visor cuando siguen pendientes.
- `954de2f` — la auditoría completa de estado de materiales pasa a ser opcional; se activa con `?aurumMaterialAudit=1`.
- `790b2fa` — el diagnóstico completo de selección pasa a ser opcional; se activa con `?aurumSelectionAudit=1`.
- `4b016ee` — la selección aplica un filtro previo con esferas delimitadoras antes del raycasting y omite generar `EdgesGeometry` para piezas de más de 30.000 triángulos.

## Diagnósticos opcionales

- `?aurumPerf=1`: métricas de renderizado y memoria reportadas por Three.js.
- `?aurumLoadAudit=1`: tiempos de las etapas de carga.
- `?aurumMaterialAudit=1`: inspección detallada de materiales después de aplicar un acabado.
- `?aurumSelectionAudit=1`: inspección detallada de la pieza seleccionada y sus metadatos.

Los dos últimos recorren el modelo y pueden ser costosos en CAD muy denso; deben permanecer desactivados durante el uso normal.

## Lista de regresión manual

Con un modelo pequeño y con un modelo CAD pesado, verificar:

1. Abrir y mostrar el modelo.
2. Seleccionar varias piezas en distintas zonas.
3. Cambiar entre plata, oro amarillo y oro rosa.
4. Rotar, hacer zoom y volver a seleccionar.
5. Activar la profundidad de campo y verificar su efecto en la vista y en la captura.
6. Exportar una fotografía de alta calidad y revisar nitidez, reflejos, encuadre y materiales.
7. Cerrar el visor o cambiar de modelo y volver a abrirlo.
8. Revisar la consola del navegador por errores y observar que no aumente continuamente el uso de memoria tras repetir el ciclo.

## Validación automatizada

El workflow `.github/workflows/quality.yml` define estos pasos para el job `quality`:

1. `npm run build`
2. `npm run typecheck`
3. `npm run lint`

El job `edge-functions` comprueba con `deno check` tres funciones de Supabase. No se debe declarar una validación automatizada como exitosa hasta que GitHub Actions muestre el resultado de esos trabajos para el commit correspondiente.

## Estado de verificación

El usuario probó manualmente la carga, selección y cambio de materiales con `CRISTO.3dm` y reportó que funciona bien. Esto confirma la prueba funcional comunicada por el usuario, pero no sustituye el build, TypeScript, ESLint ni la revisión de calidad de exportación. La consulta de estado de CI del commit `4b016ee` no devolvió checks disponibles en el momento de documentar este estado.

## Restricciones de mantenimiento

- Trabajar exclusivamente en `main`.
- No simplificar ni reemplazar la geometría de origen como arreglo de rendimiento.
- No cambiar los shaders ópticos o el perfil de fotografía sin un problema reproducible y una comparación de capturas.
- Mantener los diagnósticos costosos desactivados por defecto.
- Validar build, TypeScript, ESLint y la prueba manual de captura antes de dar por cerrada una optimización.
