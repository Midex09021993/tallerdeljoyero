# AURUM VISUAL WELD 1.0

## Propósito

Etapa posterior a AURUM Metal Union que mejora la continuidad de normales en vértices coincidentes de la malla CSG. Conserva las posiciones, UV, colores y atributos existentes y mantiene aristas cuyo ángulo supera el umbral de pliegue.

## Alcance real

- Recalcula normales por esquina usando coincidencia espacial dentro de una tolerancia derivada de la escala del resultado.
- Suaviza únicamente caras cuya diferencia angular está dentro del crease angle (38° por defecto).
- No desplaza vértices, no cierra huecos, no une volúmenes separados y no cambia la topología.
- No sustituye una unión booleana ni certifica manifold/BREP.
- Se ejecuta solo sobre la geometría nueva que produjo CSG; nunca sobre gemas ni sobre el motor óptico.

## Pipeline

3DM → preflight original → AURUM Metal Union (si CSG tiene éxito) → AURUM Visual Weld → GLB Quality Gate → GLB.

Los cuerpos fuente se conservan ocultos y recuperables según el comportamiento previo de Metal Union. Si CSG falla, la geometría original permanece visible y Visual Weld no se ejecuta.

## Criterios de seguridad

- No se sueldan posiciones ni se cierra ninguna separación física.
- Se preservan UV y atributos de vértice.
- El umbral de pliegue evita promediar normales a través de aristas agudas.
- El resultado requiere validación visual con un 3DM real; los tests sintéticos no sustituyen esa prueba.

## Limitación

La continuidad de normales mejora reflejos, pero no garantiza una única superficie NURBS ni elimina defectos de topología que el evaluador CSG no haya resuelto.
