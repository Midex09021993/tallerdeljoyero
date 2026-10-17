# Auditoría de Comercial y límites de integración con Producción
Fecha: 2026-10-17
Rama auditada: `main`
Repositorio: `Midex09021993/tallerdeljoyero`

## Decisión arquitectónica obligatoria

**Los módulos y los talleres deben seguir siendo independientes. Integrar no significa fusionar sus modelos internos ni crear dependencias indiscriminadas.**

- Comercial mantiene la propiedad de clientes, cotizaciones, contratos, pagos/ventas y compromisos con el cliente.
- Cada taller mantiene su sede/participante, capacidades, usuarios, permisos, configuración y operaciones.
- Producción mantiene sus órdenes, trabajos, piezas y estados internos.
- Servicios externos mantiene su ciclo de salida, recepción y seguimiento.
- La integración ocurre mediante contratos de datos explícitos y puntos de entrada controlados. Un módulo no debe asumir ni modificar detalles internos de otro módulo.
- La incorporación de talleres es incremental: habilitar, probar y validar un taller sin exigir que los demás adopten la misma modalidad ni alterar sus datos.
- Las relaciones entre entidades deben incluir y validar el ámbito del taller (sede/participante según el modelo canónico). Nunca se debe confiar solo en filtros de interfaz.

## Flujo comercial observado en código

1. Cliente y proyecto de joya alimentan la cotización.
2. La cotización aprobada puede convertirse en pedido mediante `public.convertir_cotizacion_a_pedido(uuid)`.
3. El contrato es opcional en el flujo general, pero si se crea desde una cotización, la aplicación exige que la firma se reciba y sea validada antes de vincular un pedido a ese contrato.
4. El pedido es el punto de transferencia de requisitos a la operación: conserva `cotizacion_id`, `proyecto_joya_id`, los detalles comerciales y una instantánea de especificaciones.
5. La preparación de producción usa la ruta del pedido para generar una orden de producción, trabajos y piezas.
6. Ventas consulta pedidos, contratos y pagos para cartera, cobros, despacho y entrega.

Archivos de referencia revisados:
- `src/routes/_authenticated/cotizaciones.$id.tsx`
- `src/routes/_authenticated/contratos.nuevo.tsx`
- `src/routes/_authenticated/pedidos.nuevo.tsx`
- `src/routes/_authenticated/pedidos.index.tsx`
- `src/routes/_authenticated/ventas.tsx`
- `src/hooks/use-pedidos-area.ts`
- `src/lib/taller-db.ts`
- `supabase/migrations/20261009100000_p0_consolidar_capacidades_y_comercial.sql`
- `supabase/migrations/20261008203100_respetar_modalidades_produccion.sql`
- `supabase/migrations/20261010200000_firma_y_validacion_contratos.sql`
- `supabase/migrations/20261011010000_un_contrato_por_cotizacion.sql`

## Hallazgos y estado

### H1 — La conversión comercial tiene un contrato de retorno definido
La RPC canónica devuelve JSON con `pedido_id`, y la pantalla de detalle de cotización consume esa propiedad. La conversión guarda los detalles y las especificaciones en la información comercial del pedido.

**Pendiente de validación:** confirmar que la definición instalada en Supabase coincide con la migración canónica actual y que las reglas de acceso reales coinciden con el flujo de usuario previsto.

### H2 — La autorización de conversión es más restrictiva que la gestión comercial general
La RPC de conversión y el botón correspondiente comprueban `es_admin`. Otras políticas históricas permiten determinadas operaciones a usuarios del área de ventas de su sede.

**No se declara defecto sin confirmar la regla de negocio.** Antes de cambiar permisos hay que decidir explícitamente si convertir una cotización aprobada es una acción exclusiva de administración o también corresponde a ventas/gerencia, y verificarlo tanto en frontend como en RLS/RPC.

### H3 — La firma validada es una barrera de integridad del contrato
La migración de firma impide vincular un pedido a un contrato originado en cotización mientras la firma no esté recibida y validada. Este control debe mantenerse en la base de datos; no debe depender solo de deshabilitar un botón.

### H4 — Producción consulta directamente la entidad Pedido
Las áreas operativas consultan pedidos y su ruta; la RPC `preparar_produccion_pedido` crea la orden de producción, los trabajos y las piezas.

**Riesgo arquitectónico:** si cada área comienza a depender de columnas internas de Comercial o actualiza directamente sus datos, la independencia se erosiona. El pedido debe funcionar como un paquete de transferencia versionable, con campos comerciales de solo lectura para Producción y campos operativos de propiedad de Producción.

### H5 — Las modalidades de cada taller condicionan la derivación
La preparación de producción comprueba las modalidades configuradas para la sede y valida la ruta. Este comportamiento es coherente con la incorporación gradual, pero debe probarse con talleres que tengan Producción activa, desactivada y Servicios externos activados/desactivados.

### H6 — GitHub no acredita por sí solo el estado de la base de datos desplegada
El mapa de dependencias ya registra historial de redefiniciones de RPC y posibles diferencias entre GitHub y producción. La consulta de estado de checks para el último commit de `main` no devolvió checks; no se debe interpretar como Build/TypeScript aprobados. Tampoco se obtuvo evidencia directa del esquema/RPC que está instalado en Supabase.

## Contrato de integración propuesto

### Comercial → Pedido de fabricación
Transferir únicamente:
- identificadores de cotización, proyecto, cliente y taller;
- referencia del pedido y fecha comprometida;
- descripción de pieza, cantidad, metal, piedras, talla, peso y referencias visuales;
- especificaciones comerciales congeladas/versionadas necesarias para fabricar;
- ruta de trabajo solicitada y notas pertinentes;
- requisitos de calidad y entrega que correspondan.

Los precios, pagos, saldo, firma y documentos comerciales permanecen bajo control de Comercial. Producción no recalcula ni sobrescribe estos valores.

### Pedido → Producción
Una operación explícita y segura debe:
- validar que el pedido pertenece al taller actual;
- validar que la modalidad y la ruta estén habilitadas;
- crear como máximo una orden de producción por pedido;
- conservar trazabilidad de la versión de especificaciones recibida;
- generar trabajos de las áreas solicitadas sin crear dependencias entre sus pantallas;
- permitir que cada área gestione sus propios estados y registrar los eventos de transferencia;
- devolver errores claros sin dejar registros parciales.

### Producción → Comercial
Producción devuelve estados de operación y cumplimiento (en proceso, control de calidad, terminada, lista para entrega, incidencias y fechas). No modifica pagos ni cierra una venta por su cuenta. Comercial decide el cobro, despacho y entrega al cliente.

### Aislamiento entre talleres
Todas las lecturas y escrituras deben validarse en servidor contra el taller/participante autorizado. Las referencias entre tablas deben comprobar que ambas entidades pertenecen al mismo ámbito cuando corresponda. No se debe usar un selector de sede del frontend como mecanismo de seguridad.

## Plan incremental de verificación

1. **Congelar el contrato:** definir campos transferidos, propietario de cada campo, estados y reglas de edición.
2. **Reconciliar producción:** comparar migraciones con RPC, triggers, constraints, grants y políticas RLS realmente instaladas.
3. **Validar Comercial:** cliente → cotización → aprobación → contrato opcional/firma → pedido, incluyendo repetición de acciones y prevención de duplicados.
4. **Piloto de un taller:** activar una sola modalidad/ruta y comprobar que los demás talleres no cambian.
5. **Probar aislamiento:** usuario de taller A no puede leer, cambiar ni preparar pedidos del taller B.
6. **Probar fallos y reintentos:** ruta no disponible, modalidad desactivada, firma pendiente, doble clic, reintento de RPC y pedido ya preparado.
7. **Verificar CI:** Build, TypeScript, lint y pruebas disponibles; registrar explícitamente los checks ausentes.
8. **Expandir por etapas:** solo incorporar otra área/taller cuando el piloto pase las verificaciones.

## Límites de esta entrega

Esta entrega documenta el análisis de archivos y migraciones en GitHub. No se ejecutaron consultas contra la base de datos de producción ni pruebas visuales/E2E. No se modificaron funciones, permisos, tablas ni datos de la aplicación. La auditoría no se considera cerrada hasta reconciliar el esquema real y ejecutar las pruebas indicadas.
