# Auditoría profunda del área Pedidos
Fecha: 2026-10-17
Rama: main
Repositorio: Midex09021993/tallerdeljoyero

## Objetivo
Reducir pasos innecesarios sin debilitar trazabilidad, permisos, controles financieros ni independencia de los talleres. Esta es una auditoría del código de GitHub; no certifica el esquema o los datos de Supabase desplegado.

## Resumen
Pedidos concentra recepción del trabajo, identificación del cliente, especificaciones, ruta, archivos y condición comercial. Después, el detalle vuelve a coordinar preparación de producción, asignaciones externas, responsables, estados, calidad, documentos, información comercial e historial. Hay oportunidades reales de simplificar el camino feliz, pero no se deben eliminar controles que protegen dinero, firma, calidad o aislamiento entre talleres.

## Archivos revisados
- src/routes/_authenticated/pedidos.index.tsx
- src/routes/_authenticated/pedidos.nuevo.tsx
- src/routes/_authenticated/pedidos.$id.tsx
- src/lib/taller-db.ts
- src/hooks/use-pedidos-area.ts
- src/routes/_authenticated/ventas.tsx
- src/routes/_authenticated/ventas.$id.tsx
- supabase/migrations/20261009100000_p0_consolidar_capacidades_y_comercial.sql
- supabase/migrations/20261008203100_respetar_modalidades_produccion.sql
- migraciones de firma de contratos y transición de entrega

## 1. Flujo actual

### Bandeja /pedidos
Tiene contadores de activos, atención, producción y entrega, búsqueda y detalle. “Requieren atención” mezcla autorización pendiente y fechas vencidas, que requieren acciones distintas. La creación se muestra a administradores; el borrado está disponible para dueños con confirmación.

### Crear pedido
El formulario agrupa identificación (cliente, trabajo, material, piedras, talla, cantidad, peso, teléfono), ruta de producción, fechas/documentación, referencias visuales, taller responsable y condición comercial. Para fabricación exige ruta y disponibilidad de capacidades; si viene de cotización, la cotización debe estar aprobada y pertenecer al cliente y sede seleccionados. En venta directa exige importe positivo y anticipo no superior al total.

Si se escribió un cliente sin seleccionar uno existente, el formulario intenta encontrarlo por teléfono o nombre; si no lo encuentra, crea el cliente y luego crea el pedido. Las referencias visuales se suben después de crear el pedido, en operaciones separadas.

### Persistencia
useCrearPedido separa datos operativos y comerciales. En venta directa asegura un documento financiero antes de insertar el pedido, y después actualiza pedido_comercial. El proceso de cliente/documento/pedido/datos comerciales/archivos no es una sola transacción. Un fallo parcial puede dejar un documento sin pedido o un pedido sin todas las referencias. El código informa que el pedido sí se creó cuando fallan referencias, pero requiere recuperación manual.

### Detalle
Tiene pestañas Resumen, Producción, Comercial, Archivos e Historial. La preparación de producción puede reconciliar servicios externos, crear la OP y los trabajos, asignar proveedores, revisar los trabajos y liberar la OP si no quedan asignaciones externas pendientes. Esta lógica protege la operación, pero la secuencia técnica resulta poco clara para el usuario. Hay varias acciones posibles para avanzar desde “pedido recibido” a “producción iniciada”.

### Producción y entrega
Las transiciones usan RPC. La inspección final exige piezas verificadas/liberadas. Ventas controla listo para entrega, packing, despacho y entrega, además de sede, permisos, medio de envío, receptor y saldo pendiente. Estos controles no deben eliminarse.

## 2. Simplificaciones recomendadas

### P1 — Formulario adaptativo
- Desde cotización aprobada, heredar cliente, proyecto, importe y especificaciones fiables; evitar volver a capturarlos.
- Fabricación: mostrar ruta y datos de fabricación.
- Reparación: priorizar recepción/diagnóstico; no exigir ruta estándar de fabricación sin necesidad.
- Venta de stock: omitir ruta si no hay fabricación.
- Mostrar precio/anticipo directos solo en el camino comercial correspondiente. Los valores provenientes de cotización deben mostrarse como heredados y no recalcularse silenciosamente.
- No borrar campos ni cambiar el esquema hasta demostrar que no los necesitan otros módulos.

### P2 — Ruta sugerida por taller
Sugerir una ruta a partir de capacidades activas de ese taller. Permitir confirmar o modificar. No seleccionar un proveedor externo automáticamente si hay varias opciones o si se necesita decisión comercial. Ocultar/deshabilitar capacidades no disponibles con explicación.

### P3 — Una acción principal para preparar producción
Unificar “Preparar producción”, “Generar operaciones” y “Reconciliar servicios externos” en una acción contextual. Mostrar pasos adicionales solo si hay una excepción real. No saltar la validación de modalidad, capacidad, proveedor externo, idempotencia o calidad.

### P4 — Próxima acción en la bandeja
Mostrar por pedido el paso pendiente: completar ruta, asignar servicio externo, iniciar producción, control de calidad o preparar entrega. Separar “Autorización pendiente” de “Atrasado”. Mantener Comercial, Producción, Archivos e Historial como áreas distintas, sin duplicar editores financieros.

### P5 — Guardado recuperable
Diseñar una operación de servidor transaccional para pedido y snapshot comercial, con idempotencia contra doble clic/reintentos. Para archivos, conservar subida con progreso, confirmación de metadata, limpieza de huérfanos y reintento sin recrear pedido. No subir archivos grandes dentro de una transacción SQL.

## 3. Riesgos por verificar

1. **Permisos de creación:** pedidos.nuevo.tsx requiere sesion.esAdmin. Confirmar si ventas/recepción autorizada debe crear pedidos en su sede. No ampliar acceso sin alinear interfaz, RLS y RPC.
2. **Conversión de cotización:** evitar que la creación manual y la conversión desde cotización generen pedidos duplicados.
3. **Documento financiero:** la venta directa crea un documento antes del pedido; probar recuperación si falla el insert posterior.
4. **Cliente duplicado:** teléfono exacto/nombre único ayuda, pero no evita carreras ni formatos diferentes. No fusionar clientes automáticamente con coincidencias difusas.
5. **Referencias:** la subida posterior puede fallar; permitir reintentar adjuntos sin duplicar pedido.
6. **Ruta/modalidades:** validar capacidad y configuración en servidor para cada sede. Ausencia de configuración debe bloquear con seguridad.
7. **Servicios externos:** no liberar la orden mientras falte una asignación externa obligatoria.
8. **Estados:** pedido, OP y ventas tienen responsabilidades distintas; no unificarlos en una columna ni sincronizarlos sin reglas explícitas.
9. **TypeScript:** pedidos.$id.tsx contiene @ts-nocheck; evitar refactor grande junto con simplificación.
10. **Borrado:** un pedido con contratos, pagos, OP, trabajos o archivos puede tener efectos laterales. Comprobar restricciones y preferir anulación trazable después de iniciar operaciones.
11. **Aislamiento:** toda lectura/escritura debe validar sede en servidor, no solo en filtros visuales.
12. **Entorno:** no hay evidencia de CI ejecutado ni acceso confirmado al esquema Supabase desplegado; no afirmar prueba en producción.

## 4. Flujo objetivo

### Desde cotización aprobada
1. Abrir “Crear pedido” desde la cotización con cliente/origen ya fijados.
2. Revisar especificaciones heredadas y fecha prometida.
3. Confirmar ruta sugerida para las capacidades del taller.
4. Añadir referencias solo si hacen falta.
5. Crear pedido y mostrar el siguiente paso operativo.

### Pedido directo
1. Seleccionar cliente existente o registrar uno nuevo en el mismo flujo.
2. Capturar descripción y solo las especificaciones necesarias según fabricación, reparación o stock.
3. Capturar precio/anticipo cuando corresponda.
4. Sugerir ruta solo si hay fabricación.
5. Crear pedido/documento financiero de forma consistente y permitir recuperar archivos fallidos.

### Operación
El área abre el pedido asignado y ve la siguiente acción permitida. El sistema realiza tareas deterministas, registra historial y muestra decisiones humanas solo ante excepciones: proveedor externo, capacidad apagada, dato faltante o rechazo de calidad.

## 5. Implementación por lotes
1. **Lote 0:** pruebas de regresión para fabricación, reparación, stock, cotización, venta directa, archivos, servicios externos, sede sin modalidad y reintentos.
2. **Lote 1:** simplificación visual/formulario condicional y datos heredados de cotización, sin cambiar permisos ni SQL.
3. **Lote 2:** sugerencias de ruta según capacidades propias del taller.
4. **Lote 3:** acción contextual de preparación.
5. **Lote 4:** persistencia transaccional/idempotente y recuperación de adjuntos.
6. **Lote 5:** pruebas por rol/sede, concurrencia, Build, TypeScript, lint y regresión de otros módulos.

## Criterios de aceptación
- Menos campos/pasos en casos sencillos, sin pérdida de información.
- Cotización no se vuelve a transcribir ni genera pedidos duplicados.
- Pedido directo conserva una fuente financiera coherente.
- Fabricación, reparación y stock conservan flujos adecuados.
- Ruta respeta capacidades y modalidades del taller.
- Archivos se pueden reintentar sin recrear pedido.
- Un taller no puede consultar/modificar pedidos de otro.
- Producción no modifica pagos, firma o compromisos comerciales.
- Calidad, packing, despacho, entrega y saldo mantienen controles.
- Build/TypeScript y pruebas disponibles pasan; checks no disponibles se identifican claramente.

## Estado
Auditoría de código completada y documentada. No se cambió comportamiento funcional en esta entrega: antes de eliminar pasos hay que proteger los casos de regresión y definir una ruta de implementación pequeña. El siguiente cambio recomendado es el Lote 1, sin tocar permisos ni RPC de producción.