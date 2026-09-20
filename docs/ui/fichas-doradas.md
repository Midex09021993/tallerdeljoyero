# Fichas doradas

## Fuente de verdad

La experiencia visual de las fichas doradas está centralizada en:

src/components/FichaDorada.tsx

El inventario debe consumir este componente en lugar de duplicar sus clases visuales.

## Comportamiento actual

- Borde dorado sutil en estado normal.
- Elevación de la tarjeta al pasar el cursor.
- Borde y sombra dorados más marcados en hover.
- Fondo dorado muy sutil en hover.
- Icono: desplazamiento vertical, escala y giro suave.
- Flecha: pequeño desplazamiento hacia la derecha y cambio a dorado.
- No utiliza el brillo diagonal que recorría la tarjeta.

## Regla para futuras actualizaciones

Si se modifica la apariencia de las fichas, primero se debe modificar FichaDorada.tsx. No copiar las clases directamente a cada módulo.

La configuración administrativa en Gestión puede añadirse después si queremos que el dueño pueda activar/desactivar o ajustar esta experiencia desde la interfaz. Por ahora, el componente es la fuente de verdad del diseño.

## Respaldo

Existe una rama de respaldo específica:

backup/ficha-dorada-inventario-2026-09-19

Esa rama apunta al estado de main justo antes de centralizar la implementación.