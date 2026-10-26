# AURUM Render Bridge — prototipo Rhino 7

## Estado

Prueba de concepto local para validar el primer tramo del flujo desde Rhino 7: seleccionar geometría, exportar una copia .3dm y abrir AURUM Render en el navegador.

**Todavía no es una integración completa.** No carga el modelo automáticamente en el editor web ni sube archivos a la nube.

## Requisitos

- Rhino 7 para Windows.
- Script Editor de Rhino con IronPython.
- Acceso a https://www.tallerdeljoyero.com/ y sesión iniciada en AURUM LAB.

## Prueba manual

1. Abre una joya en Rhino 7.
2. Abre el editor de scripts de Rhino y carga AurumRenderBridge.py.
3. Ejecuta el script y selecciona los objetos que quieras preparar.
4. Comprueba que se crea una copia en la carpeta temporal AURUM-Render-Bridge y que el documento original no cambia.
5. Comprueba que se abre una pestaña del navegador con AURUM Render.

La ruta temporal se muestra al terminar. El script exporta únicamente los objetos seleccionados a un archivo nuevo; no guarda cambios sobre el archivo original.

## Limitaciones conocidas

- MatrixGold 3.1 no ha sido validado en esta prueba; el script se ejecuta desde Rhino 7.
- La transferencia web segura aún debe implementarse.
- El modelo no se importa automáticamente al renderizador en esta fase.
- No se deben incorporar claves de Supabase ni credenciales privadas al script del plugin.

## Siguiente fase

Implementar un flujo autenticado de carga temporal: el navegador o el servicio verifica la sesión del usuario, valida tamaño y tipo de archivo, recibe el modelo en almacenamiento temporal y genera un identificador de un solo uso y con vencimiento. La ruta autenticada de AURUM Render deberá consumir ese identificador y cargar el modelo mediante la lógica de carga existente, sin alterar shaders ni el motor de renderizado.

Antes de habilitarlo en producción, probar el script en una instalación real de Rhino 7 y ejecutar typecheck, lint y build para los cambios web de la fase siguiente.
