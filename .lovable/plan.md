# Consolidación PDF cotizaciones y contratos

## Hallazgos verificados (antes de cambiar nada)
- `main` local = `3d9300d5` («Añadió PDF desde ficha A4»); no hay cambios sin guardar.
- La migración `20261009160000_fechas_cotizacion_zona_peru.sql` **no existe** en el repositorio y la base no contiene lógica `America/Lima`. No hay nada que retirar.
- La tabla `sedes` no tiene zona horaria (solo id, nombre, ciudad, modo, activa).
- `contratos` ya tiene `pdf_storage_path`, `pdf_sha256` y `pdf_generado_at`; la función `generar-contrato-pdf` está desplegada.
- `FichaContratoA4.tsx` es solo vista HTML, lleva `@ts-nocheck`, consulta la tabla inexistente `plantillas_contrato` y usa la identidad **actual** de la sede (no la histórica).
- 19 archivos tienen `@ts-nocheck` (añadidos en la versión anterior para ocultar ~190 errores de tipos).
- Última migración registrada en producción: `20260929050049`.

## Cambios propuestos

1. **Contrato A4 → PDF real**
   - Botón «Descargar PDF» en la vista A4 que imprime la misma ficha (igual que cotizaciones), con CSS A4.
   - Mantener el botón existente que genera, guarda y registra el PDF oficial (ruta + hash).
   - Quitar la consulta a `plantillas_contrato`; usar las cláusulas que ya maneja Configuración de Contratos.
   - Identidad: si el contrato guarda referencia histórica, usarla; si no, mostrar la actual con aviso.
   - Quitar `@ts-nocheck` y tipar el componente.

2. **Zona horaria por sede (internacional)**
   - Migración aditiva: columna `sedes.zona_horaria text` con valor por defecto `'America/Lima'` (solo para las sedes existentes) y validación de identificador IANA por trigger.
   - Campo editable en Gestión → Sedes.
   - Fichas A4 y funciones PDF formatean fechas con la zona de la sede. Instantes siguen en UTC; no se tocan fechas, importes ni numeraciones históricas.

3. **Cotización**: sin cambios visuales; solo confirmar que WhatsApp y enlace corto funcionan sin generar PDF.

4. **Tipos (`@ts-nocheck`)**: regenerar tipos y quitar `@ts-nocheck` de los archivos tocados aquí (`FichaContratoA4.tsx`). Retirarlo de los otros 18 es un trabajo grande (muchos créditos); propongo hacerlo después, por módulos.

## Verificación
- Typecheck y build; prueba de la regla de zona horaria.
- Abrir cotización y contrato reales, imprimir a PDF, revisar que no aparezcan costos ni notas internas.
- Confirmar en producción la migración y el despliegue de funciones.
- Entregar SHA final, archivos y pendientes.
