# Mapa maestro de dependencias — Aurum Lab

**Repositorio:** Midex09021993/tallerdeljoyero  
**Rama auditada:** main  
**Fecha:** 2026-10-09  
**Tipo:** auditoría estructural; no modifica lógica de aplicación ni base de datos.

## 1. Regla arquitectónica principal

La identidad operativa canónica es:

`auth.users → participante_cuentas → ecosistema_participantes → sedes`

- `participante_id` identifica al taller/organización dentro del Ecosistema.
- `sede_id` identifica la sede física y sigue siendo necesario para módulos operativos que trabajan por sede.
- `profiles.sede_id` queda como compatibilidad histórica y **no debe ser fuente de autorización**.
- Las autorizaciones nuevas deben resolver primero la pertenencia del usuario al `participante_id` y desde allí obtener `sede_id`.

## 2. Mapa maestro

| Dominio | Fuente de verdad | Tablas principales | RPC / funciones | RLS / autorización | Frontend | Rutas | Estado |
|---|---|---|---|---|---|---|---|
| Identidad | Ecosistema + cuenta | `auth.users`, `profiles`, `participante_cuentas`, `ecosistema_participantes`, `user_roles`, `user_areas` | resolución de sesión en frontend + funciones de cuentas | participante activo + roles | `src/lib/auth.ts` | `/auth`, `/_authenticated/*` | 🟡 Canónico en evolución |
| Acceso ERP | sesión + participante activo | `profiles`, `participante_cuentas`, `ecosistema_participantes` | — | `/_authenticated/route.tsx` + RLS | route guard | `/_authenticated/*` | 🟡 Compatible con legado |
| Capacidades | configuración de sede | `sedes`, `especialidades`, `sede_especialidades`, `sede_modalidades` | `guardar_configuracion_taller(uuid,uuid[],boolean,boolean)` | dueño / gerente de sede | `CapacidadesSedeAdmin.tsx` | `/gestion` | 🔴 Hay dos diseños de RPC en migraciones consecutivas |
| Comercial | cotización aprobada → pedido | `clientes`, `proyectos_joya`, `cotizaciones`, `cotizacion_detalles`, `pedidos` | `convertir_cotizacion_a_pedido(uuid)`, `convertir_cotizacion_a_pedido_contrato(uuid)` | admin + reglas comerciales | `cotizaciones.$id.tsx`, pedidos | `/cotizaciones`, `/pedidos` | 🔴 Históricamente hubo drift GitHub/producción |
| Catálogo interno | participante | `catalogo_configuracion`, `catalogo_colecciones`, `catalogo_productos`, `catalogo_productos_colecciones` | CRUD + `obtener_catalogo_publico(text)` | participante + admin | `catalogo.tsx`, `CatalogoModeloDialog.tsx` | `/catalogo` | 🟡 Canónico migrado a participante |
| Catálogo público | configuración pública del participante | mismas tablas | `obtener_catalogo_publico(text)` SECURITY DEFINER | ejecución pública controlada | `$slug.tsx` | `/:slug` | 🟡 Contrato DB/frontend debe quedar único |
| Producción | capacidades + pedido | `pedidos`, `trabajos`, `piezas`, tablas de áreas | varias funciones/consultas | sede + rol + área | hooks y rutas de producción | `/diseno-3d`, `/impresion-3d`, `/casting`, `/corte-laser`, `/taller` | 🟡 Funcional pero con legado |
| Servicios externos | modalidad de sede | `sede_modalidades` + pedidos/servicios | funciones de servicios | dueño / gerente / sede | componentes de servicios | `/servicios-externos` | 🟡 Separado de producción |
| Identidad comercial | participante | `identidades_comerciales` y configuración fiscal/comercial | funciones de configuración | participante + rol | configuración de Gestión | `/gestion` | 🟢 Diseño reciente, falta validación integral |
| Gestión | dos niveles | tablas del taller + configuración Aurum | varias consultas | dueño global / gerente sede | `gestion.tsx` | `/gestion` | 🟢 Separación conceptual correcta |
| AURUM Transfer | token de transferencia | tablas/funciones de transfer + storage/edge functions | `aurum-transfer-create`, `aurum-transfer-download` | token + expiración + uso | transfer UI | `/transfer`, `/transfer/:token` | 🟡 Requiere prueba E2E |
| AURUM Render | archivos/modelos | configuración + storage/visor | funciones de render según módulo | participante/usuario | `AurumRender*` | `/aurum-render`, `/aurum-render-public` | 🟡 Requiere prueba E2E |
| Herramientas | componentes independientes | según herramienta | según herramienta | normalmente pública o sesión | `HerramientasFlotantes`, calculadoras | `/herramientas` | 🟡 Falta definir catálogo definitivo |
| Marketing | contenido público | no debería depender del ERP para renderizar | analytics opcional | público | actualmente mezclado en `auth.tsx` | `/`, `/auth` | 🔴 Arquitectura pública sobrecargada |
| Seguimiento cliente | códigos/tokens | clientes/cotizaciones/pedidos | consultas/funciones de seguimiento | token/código | páginas públicas | `/cliente`, `/c/:codigo`, `/c/:codigo/pdf` | 🟡 Requiere E2E |
| Digital jewelry | token | datos de joya + publicación | QR/consulta | token | `QRJoya` | `/joya/:token` | 🟡 Requiere E2E |

## 3. Dependencias críticas

### A. Identidad

`auth.users`
→ `participante_cuentas`
→ `ecosistema_participantes`
→ `sede_id`
→ capacidades / comercial / catálogo / gestión.

**Riesgo actual:** algunos módulos todavía consultan directamente `profiles.sede_id` o mezclan `sede_id` y `participante_id`.

**Decisión:** no eliminar compatibilidad todavía. Primero inventariar cada uso y migrarlo a la fuente canónica uno por uno.

### B. Capacidades

`sede`
→ `sede_especialidades`
→ `sede_modalidades`
→ AppShell / inicio / rutas de producción / servicios externos.

**Riesgo actual:** las migraciones:
- `20261008145000_restaurar_guardado_capacidades_sin_diagnostico_invalido.sql`
- `20261008150000_guardar_capacidades_taller_canonico.sql`
- `20261008220000_guardar_configuracion_taller_atomico.sql`

redefinen la misma RPC con reglas de autorización diferentes.

**Decisión:** establecer una única implementación final antes de tocar frontend o RLS.

### C. Comercial

`cliente`
→ `proyecto_joya`
→ `cotizacion`
→ `cotizacion_detalles`
→ `pedido`
→ `contrato` (opcional)
→ `venta`.

**Riesgo actual:** existen varias generaciones de `convertir_cotizacion_a_pedido` y el snapshot de producción anterior demostró que GitHub y producción estuvieron desalineados.

**Decisión:** una función canónica, una firma, un retorno y una semántica idempotente. Contrato debe ser opcional, no requisito para crear pedido.

### D. Catálogo

`participante`
→ `catalogo_configuracion`
→ `colecciones`
→ `productos`
→ `productos_colecciones`
→ `obtener_catalogo_publico(slug)`
→ `/:slug`.

**Riesgo actual:** migraciones históricas usaron `sede_id`; la migración canónica usa `participante_id`. También cambió el shape de retorno de la RPC pública.

**Decisión:** `participante_id` es el dueño canónico del catálogo. El contrato de `obtener_catalogo_publico` debe coincidir exactamente con `types.ts` y `$slug.tsx`.

## 4. Rutas públicas

| Ruta | Función | Prioridad |
|---|---|---|
| `/` | entrada pública | P0 |
| `/auth` | autenticación | P0 |
| `/catalogo-publico` | landing del catálogo | P1 |
| `/:slug` | catálogo real de taller | P0 |
| `/aurum-render-public` | AURUM Render público | P1 |
| `/transfer` | subida AURUM Transfer | P1 |
| `/transfer/:token` | descarga | P1 |
| `/cliente` | seguimiento | P1 |
| `/c/:codigo` | seguimiento por código | P1 |
| `/c/:codigo/pdf` | PDF público | P1 |
| `/joya/:token` | joya digital | P1 |
| `/recuperar-contrasena` | recuperación | P1 |

**Hallazgo:** `/` redirige a `/auth`. `/auth` actualmente contiene login + alta inicial + marketing + herramientas + Comunidad + Conoce la Plataforma + solicitud de acceso. Esto debe separarse en una fase posterior, no con parches.

## 5. Rutas ERP

- Principal: `/inicio`, `/operario`
- Comercial: `/pedidos`, `/cotizaciones`, `/contratos`, `/clientes`, `/ventas`, `/catalogo`
- Producción: `/diseno-3d`, `/impresion-3d`, `/casting`, `/corte-laser`, `/taller`, `/servicios-externos`
- Inventario: `/inventario`, `/compras`
- AURUM: `/aurum-render`
- Herramientas: `/herramientas`
- Administración: `/gestion`, `/migracion`, `/perfil`

El AppShell ya condiciona navegación según capacidades/modalidades. Esto debe conservarse.

## 6. Riesgos técnicos transversales

1. **Migraciones acumulativas que redefinen funciones.**  
   Solución: dejar una única definición canónica y documentar la transición; no borrar histórico indiscriminadamente.

2. **GitHub vs producción.**  
   Solución: reconciliación efectiva del estado de producción antes de declarar una migración terminada.

3. **`@ts-nocheck` en módulos críticos.**  
   Impacta especialmente catálogo, gestión, pedidos, cotizaciones, contratos, cuentas y producción.  
   Solución: reducir progresivamente, empezando por contratos DB/RPC.

4. **Tipos Supabase desfasados.**  
   La evidencia actual muestra que `types.ts` no refleja todas las funciones que existen en migraciones recientes.

5. **Sin CI integral visible en el repositorio.**  
   `package.json` tiene build/lint/format pero no test integral; no se encontró workflow activo en `.github/workflows`.

6. **Sistema visual parcialmente divergente.**  
   La guía de FichaDorada exige paleta Aurum, componentes de librería, misma ficha y sin estilos de módulo. Hay módulos con `bg-ink` que deben clasificarse antes de corregir.

## 7. Orden correcto de saneamiento

### P0 — Seguridad y fuente de verdad
1. Cerrar arquitectura de identidad.
2. Cerrar RPC de capacidades.
3. Cerrar RPC comercial.
4. Cerrar contrato del catálogo público.
5. Comparar GitHub vs producción.

### P1 — Integridad de aplicación
6. Regenerar tipos Supabase desde el esquema real.
7. Eliminar `@ts-nocheck` de los módulos críticos, por lotes.
8. Probar RLS por rol y por taller.
9. Pruebas E2E de login → inicio → configuración → cotización → pedido → producción.

### P2 — Producto público
10. Separar landing de autenticación.
11. Convertir `/` en landing.
12. Fortalecer catálogo público.
13. Consolidar herramientas gratuitas y funnel.

### P3 — Monetización
14. Medición del funnel.
15. Registro/prueba.
16. Planes comerciales.
17. Conversión de herramientas/comunidad/catalogo/render a ERP.

## 8. Regla de implementación

No hacer cambios globales ni parches de síntomas.

Para cada P0:

**ANALIZAR → DETERMINAR ESTADO REAL → DEFINIR CONTRATO CANÓNICO → IMPLEMENTAR UNA SOLA VEZ → VERIFICAR EN PRODUCCIÓN → CONTINUAR.**

## 9. Resultado de esta auditoría

La aplicación **no necesita una reconstrucción**.

El problema principal es de **consolidación arquitectónica**: varias generaciones de decisiones siguen coexistiendo.

Los 7 focos raíz son:

1. `sede_id` vs `participante_id`.
2. Migraciones acumulativas/redefiniciones.
3. Drift GitHub ↔ producción.
4. `@ts-nocheck` y tipos desfasados.
5. Marketing mezclado con autenticación.
6. Sistema visual parcialmente no consolidado.
7. Falta de verificación integral automatizada.

**No se implementan correcciones de estos focos en este documento.** Este mapa es la base para aprobar cada cambio antes de tocar código o base de datos.
