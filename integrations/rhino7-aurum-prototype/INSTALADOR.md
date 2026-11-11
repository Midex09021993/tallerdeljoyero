# AURUM CONECT — Instalador único para Rhino 7

## Experiencia del usuario

Descarga un solo archivo:

`AURUM-CONECT-Setup-Rhino7-1.0.0.exe`

El asistente detecta Rhino 7 de 64 bits, instala el complemento `.RHP` ya compilado en el perfil del usuario y registra el complemento en la vista de 64 bits del registro del usuario (`HKCU64`). No pide SDK, no compila en el ordenador del cliente y no requiere que el usuario abra PlugInManager para registrar el archivo.

Al finalizar:
1. Cierra Rhino 7 si estaba abierto y vuelve a iniciarlo.
2. Ejecuta el comando `AurumConect` para abrir el panel.
3. Pulsa **CONECTAR CON AURUM LAB** e inicia sesión en el navegador.
4. Selecciona la geometría en MatrixGold y pulsa **ACTUALIZAR DISEÑO**.
5. Completa la recepción desde AURUM RENDER.

## Requisitos

- Windows de 64 bits.
- Rhino 7 actualizado (compilación dirigida a RhinoCommon 7.27).
- MatrixGold 3.1 instalado en Rhino 7 para el flujo CAD.
- Acceso a Internet para AURUM LAB.

No requiere SDK ni Developer Pack en el equipo del usuario. El instalador no distribuye DLL propietarias de Rhino o MatrixGold.

## Validación pendiente

El pipeline genera el instalador y registra el complemento, pero la carga efectiva del .RHP y el ciclo completo de transferencia necesitan una prueba física en Rhino 7 + MatrixGold 3.1 + Chrome. El instalador es beta y no está firmado digitalmente; SmartScreen puede advertir que el editor no está verificado.

La recepción directa utiliza un canal local efímero. La compatibilidad de permisos de red local de Chrome y la conservación de todos los materiales/ajustes del render deben verificarse antes de declarar la integración lista para producción.
