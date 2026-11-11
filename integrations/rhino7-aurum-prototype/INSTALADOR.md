# AURUM CONECT — Complemento directo para Rhino 7

## Descarga

Archivo único:

`AurumConect-Rhino7-1.0.0.rhp`

El complemento se compila para Rhino 7 mediante RhinoCommon 7.27 y .NET Framework 4.8. No distribuye bibliotecas propietarias de Rhino o MatrixGold.

## Instalación

1. Descarga `AurumConect-Rhino7-1.0.0.rhp` y guárdalo en una carpeta permanente, por ejemplo `Documentos\\AurumLab\\Plugins`.
2. Abre Rhino 7.
3. Ejecuta el comando `_PlugInManager`.
4. Pulsa **Install / Instalar**, selecciona el archivo `.rhp` y confirma.
5. En el administrador, verifica que AURUM CONECT figure como cargado. Activa la carga automática si Rhino ofrece esa opción.
6. Reinicia Rhino y ejecuta el comando `AurumConect` para abrir el panel.

## Requisitos

- Windows de 64 bits.
- Rhino 7 actualizado (compilación dirigida a RhinoCommon 7.27).
- MatrixGold 3.1 instalado dentro de Rhino 7 para el flujo CAD.
- Conexión a Internet para acceder a AURUM LAB.

## Estado y validación

La descarga se publica únicamente después de compilar el complemento y validar que el archivo resultante es un ensamblado Windows válido. La carga real del .RHP y el ciclo completo de transferencia deben probarse en Rhino 7 + MatrixGold 3.1 + navegador antes de declarar la integración lista para producción.

AURUM CONECT continúa en beta. El canal local de transferencia utiliza un token efímero y requiere verificar los permisos de red local del navegador. Esta compilación no modifica el documento original de Rhino: prepara una copia de la geometría seleccionada para el flujo de transferencia.
