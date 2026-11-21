
## Correo
- [x] Envío de correos configurado para notify.tallerdeljoyero.com (esperando verificación DNS)

## Visualizador 3D
- [x] Mejorar iluminación, reflejos, exposición y sombra de exhibición

- [x] Perfil fotográfico (environment + metal calibrado) como predeterminado en Aurum Render

## Optimización de base de datos
- [x] Medir créditos, carga, consultas, índices y trabajos programados.
- [x] Evaluar ajustes: no aplicar cambios especulativos; consulta probada de 1,009 ms con 12 pedidos y sin saturación.
- [x] Documentar mediciones y límites del ahorro en docs/auditoria/optimizacion-base-datos-20261021.md; sin cambios operativos que requieran prueba comercial.

## AURUM Render
- [x] Quitar el bloqueo de AURUM Render para siempre

## Seguridad de dependencias
- [x] Actualizar zod (4.6.7) y renovar seroval (1.8.2) del enrutador; escaneo sin vulnerabilidades

## AURI interno (correcciones de la auditoría del commit 618772aa)
- [ ] Aplicar los 10 puntos de la auditoría (privacidad hacia Gemini, sesión verificada, lógica compartida sin contexto MCP falso, pruebas)
