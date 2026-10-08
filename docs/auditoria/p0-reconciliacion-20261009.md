# Reconciliación P0 — 2026-10-09

## Resultado

Se cerró el diseño P0 en GitHub sin modificar directamente Supabase.

### 1. Identidad — 🟡 CONSERVAR + MIGRAR PROGRESIVAMENTE

Fuente canónica confirmada:

`auth.users → participante_cuentas → ecosistema_participantes → sede`

`profiles.participante_id` funciona como compatibilidad y `profiles.sede_id` todavía aparece como fallback visual/histórico.

**No se elimina todavía** porque hacerlo sin inventario completo de consumidores podría romper cuentas antiguas.

### 2. Capacidades — 🟢 CONTRATO CANÓNICO DEFINIDO

La nueva migración `20261009100000_p0_consolidar_capacidades_y_comercial.sql` deja como única definición final:

`guardar_configuracion_taller(uuid, uuid[], boolean, boolean) → jsonb`

Autorización:
- Dueño: cualquier sede.
- Gerente: únicamente una sede perteneciente a su participante activo.
- Sin dependencia de `profiles.sede_id`.
- Guardado de `sede_especialidades` + `sede_modalidades` centralizado en la RPC.

### 3. Comercial — 🟢 CONTRATO CANÓNICO DEFINIDO

Se detectó el conflicto real:
- versiones antiguas devolvían `uuid`;
- la implementación reciente devuelve `jsonb`;
- el wrapper de contrato todavía intentaba recibir `uuid`;
- migraciones históricas insertaban `contratos.saldo`, mientras el contrato actual de tipos no contiene esa columna.

La nueva definición final establece:

`convertir_cotizacion_a_pedido(uuid) → jsonb`

Respuesta:
`pedido_id`, `contrato_id`, `contrato_numero`, `creado`.

Contrato opcional:

`convertir_cotizacion_a_pedido_contrato(uuid) → jsonb`

El saldo comercial se mantiene en `pedido_comercial`, no en `contratos`.

La conversión es idempotente por cotización.

### 4. Catálogo — 🟢 MODELO CANÓNICO YA PRESENTE

La migración `20260928130000_catalogo_joyas_participante_canonico.sql` ya establece:

`participante_id` como dueño del catálogo.

La RPC pública devuelve el contrato esperado por `src/routes/$slug.tsx` y `src/integrations/supabase/types.ts`.

No se agrega otra migración de catálogo para evitar volver a generar capas duplicadas.

## Migración creada

`supabase/migrations/20261009100000_p0_consolidar_capacidades_y_comercial.sql`

Commit de corrección final:
`8347fabad928fc13db7effbf4b1af894de23624c`

## Verificación realizada

Se verificó en GitHub:
- orden correcto de eliminación/recreación de las RPC comerciales;
- retorno `jsonb`;
- wrapper recreado después de la RPC base;
- contrato sin referencia a `contratos.saldo`;
- autorización canónica de capacidades;
- `notify pgrst` incluido.

## Lo que todavía NO está verificado

No se puede afirmar que Supabase/Lovable Cloud ya ejecutó esta migración. La verificación de producción requiere que Lovable Cloud aplique la migración y después consultar el esquema efectivo.

Por eso el siguiente paso no es otro cambio de código: es **verificar producción** y comprobar las firmas reales de las tres RPC y sus permisos.
