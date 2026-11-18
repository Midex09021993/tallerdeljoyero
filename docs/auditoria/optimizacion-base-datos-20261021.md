# AURUM LAB — rendimiento y créditos de base de datos

## Alcance y ventana

Revisión del 21 de octubre de 2026. Uso registrado desde el 8 de octubre de 2026 a las 00:00 UTC hasta el 21 de octubre a las 15:08 UTC; el último día es parcial y el registro puede llegar con retraso. Los importes siguientes son **créditos solicitados**, no una conciliación de deducciones ni dinero pagado. No se efectuaron cambios SQL, de permisos, datos, frecuencia de actualización, alojamiento ni tamaño de instancia.

## Línea base económica

| Recurso | Cantidad registrada | Créditos solicitados |
| --- | ---: | ---: |
| Instancia de base de datos Pico | 126,98 horas | 9,830690016 |
| Alojamiento: `cloud_worker_days` | 2.653 unidades `worker_day` | 26,530000000 |
| Solicitudes de alojamiento | 348 solicitudes | 0,000522000 |
| Funciones | 1.487 invocaciones | 0,014870000 |
| Transferencia sin caché | 7,765083996 GB | 3,494287831 |
| Transferencia con caché | 5,728128146 GB | 0,859219238 |
| Archivos almacenados | 184,484521143 GB-hora | 0,026536258 |
| IA | Cantidad no disponible | 0,012222000 |

Total de ejecución registrado: **40,768347343 créditos solicitados**. Desarrollo y chat, separados de ejecución: **130,996 créditos solicitados**. Total del proyecto en esta ventana: **171,764347343**.

No apareció un ítem de almacenamiento de base de datos en la respuesta; esto no demuestra que sea gratuito. GB-hora no es el tamaño actual de archivos.

La cotización actual Pico es 0,0774192 créditos por hora activa: 1,8580608 por 24 horas y 55,741824 por 720 horas continuas. Son escenarios antes de cobertura, no un pronóstico del consumo de este proyecto. Acelerar una consulta no modifica esa tarifa: el ahorro de cómputo requiere menos horas facturadas o un tamaño menor. No se verificó soporte de hibernación automática ni activación por visitantes.

El medidor `worker_day` está confirmado por el registro, pero no su atribución a rutas, funciones o entornos ni su equivalencia interna. No convertir sus unidades en bloques de diez minutos o días naturales ni atribuirlas a consultas SQL. Faltan inventario desplegado y mediciones del alojamiento para proponer una reducción de ese medidor.

## Salud y almacenamiento actuales

- Base de datos y agrupador de conexiones disponibles.
- Memoria: 56%; disco de datos: 14%.
- Conexiones: 12/60; clientes del agrupador: 1/200.
- Sin alertas de agotamiento recientes; cero reinicios desde el arranque.
- Dos transacciones revertidas desde el arranque: contador acumulado, no una tasa de fallo.
- Tamaño exacto consultado: **20.491.411 bytes**, aproximadamente **19,54 MiB**.
- 70 tablas públicas; relaciones públicas, incluidos índices y almacenamiento auxiliar: 4.857.856 bytes.
- Datos principales de tablas públicas: 917.504 bytes; índices públicos: 2.826.240 bytes. Son medidas físicas, no capacidad asignada facturable.
- Registro de escritura WAL: 80 MB en la instantánea de salud; no equivale a almacenamiento permanente de tablas.
- Archivos: **222 objetos**, con tamaños conocidos que suman **1.258.888.764 bytes**, aproximadamente **1,172 GiB**. No se descargaron contenidos privados.

Los valores de registros vivos de `pg_stat_user_tables` son estimaciones y varios eran cero a pesar de que `SELECT count(*) FROM public.pedidos` devolvió **12**. No usarlos como recuentos exactos. El campo `stats_reset` de esta base devolvió NULL: la ventana de acumulación de estadísticas no quedó establecida.

## Consultas e índices

Muestra inicial de consultas normalizadas, ordenada por tiempo total:

| Consulta | Llamadas | Media | Total |
| --- | ---: | ---: | ---: |
| Selector de pedidos con nombre de sede | 1 | 18,63 ms | 18,63 ms |
| Inserciones analíticas, un grupo normalizado | 2 | 8,64 ms | 17,28 ms |
| Especialidades de sede con relación | 1 | 8,97 ms | 8,97 ms |
| Identificadores de especialidades de sede | 1 | 7,91 ms | 7,91 ms |
| Identidad de participantes | 3 | 1,23 ms | 3,70 ms |
| Roles del usuario | 3 | 0,54 ms | 1,63 ms |

La muestra es pequeña y no representa una carga mensual ni permite asignar créditos por tabla. El tiempo transcurrido SQL no mide consumo de CPU.

Se revisaron índices de pedidos, información comercial, especialidades, roles, cuentas y analítica. Las búsquedas por usuario y sede ya disponen de índices con esas columnas al inicio. Los pedidos carecen de un índice específico de ordenación por `created_at`, pero con 12 filas no hay evidencia para añadirlo.

Prueba acotada, representativa de la relación y ordenación del selector:

```sql
EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON)
SELECT p.id, p.referencia, p.pieza, p.cliente, p.estado, p.sede_id, s.nombre
FROM public.pedidos p
LEFT JOIN public.sedes s ON s.id = p.sede_id
ORDER BY p.created_at DESC
LIMIT 100;
```

Resultado: **1,009 ms de ejecución**, 12 filas, ordenación en memoria de 27 KB, diez bloques encontrados en caché y cero lecturas de disco. La relación con sedes usó `sedes_pkey` y memorización de sedes repetidas. La prueba administrativa no equivale al flujo autenticado con políticas RLS; no se compararon tiempos de distinta identidad como una mejora.

## Código y trabajos programados

- `src/lib/taller-db.ts`: `usePedidos` ya selecciona columnas explícitas, limita enriquecimientos a identificadores cargados y consulta los tres enriquecimientos en paralelo. `usePedidosSelector` mantiene una selección menor separada. Ambos conservan 120 segundos de frescura; las mutaciones revisadas invalidan el prefijo `pedidos`. La sospecha inicial de invalidaciones duplicadas no se confirmó: no se eliminó ninguna.
- `src/hooks/use-pedidos-area.ts`: bandejas con caché de 60 segundos; operarios con revisión cada 120 segundos, solo habilitada para su rol y sin revisión periódica en segundo plano. Su autorreparación de producción es comportamiento operativo existente: no se eliminó ni se cambió su frecuencia.
- `src/lib/auth.ts`: datos de sesión/roles reutilizados 60 segundos y revalidados por eventos y foco. No se amplió esa ventana, para no retrasar restricciones de acceso.
- `src/router.tsx`: caché global de 60 segundos y sin recarga global por foco; se conserva.
- `src/lib/analytics.ts`: una inserción por evento; no se descartaron eventos ni se introdujo un lote que alterase su entrega.
- `vite.config.ts`, `src/server.ts`, `src/start.ts`: aplicación con renderizado de servidor y funciones autenticadas. No se cambió a publicación estática ni se aplicó caché compartida a respuestas privadas.
- La interfaz administrativa de trabajos programados devolvió una lista vacía. No se detectaron trabajos mediante esa interfaz; no se consultaron tablas de comandos ni credenciales. Su historial de ejecuciones no estuvo disponible.

## Resultado y próximos pasos

1. **No añadir índices ni ampliar cachés indiscriminadamente.** La carga medida no muestra un cuello de botella; añadir índices aumentaría almacenamiento y trabajo de escritura sin beneficio demostrado. Repetir la misma carga con un volumen representativo y sesión autenticada antes de una migración.
2. **Investigar primero el alojamiento**, que es el mayor recurso de ejecución registrado. Confirmar atribución del medidor, recursos desplegados y carga por ruta antes de cambiar la forma de publicar. Su consumo no puede corregirse mediante un índice SQL.
3. **Comparar horas activas y uso tras una ventana representativa.** No se recomienda reducir la instancia desde una sola instantánea tranquila. Pausar impediría acceso a autenticación, archivos y datos y requiere decisión explícita; no se realizó.

No hubo un ajuste de base de datos justificado por las mediciones. **Ahorro observado: no medido; reducción de créditos: no verificada.** No se ejecutó una operación comercial autenticada ni se modificó el flujo de pedidos. La última comprobación del registro automático del proyecto indicó `build OK` (15:08:58 UTC). No se publicaron cambios.

Revisar los registros posteriores en Configuración del espacio de trabajo → Planes y uso de créditos → Detalles de uso, comparando ventanas equivalentes y dejando margen para retraso de registro.