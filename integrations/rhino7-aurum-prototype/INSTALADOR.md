# AURUM CONECT — Complemento directo para Rhino 7

## Descarga

Paquete recomendado:

`AurumConect-Rhino7-1.0.0.zip`

Incluye el complemento `.RHP`, las bibliotecas administradas de WebView2 y `WebView2Loader.dll`. No separes estos archivos.

El complemento se compila para Rhino 7 mediante RhinoCommon 7.27 y .NET Framework 4.8. No distribuye bibliotecas propietarias de Rhino o MatrixGold.

## Instalación

1. Descarga `AurumConect-Rhino7-1.0.0.zip` y extrae todo su contenido en una carpeta permanente, por ejemplo `Documentos\\AurumLab\\Plugins\\AurumConect`.
2. Conserva el `.RHP`, `Microsoft.Web.WebView2.Core.dll`, `Microsoft.Web.WebView2.WinForms.dll` y `WebView2Loader.dll` juntos en esa carpeta.
3. Si Windows bloquea el `.RHP`, abre Propiedades y marca **Desbloquear**.
4. Abre Rhino 7 y ejecuta `_PlugInManager`.
5. Pulsa **Install / Instalar**, selecciona `AurumConect-Rhino7-1.0.0.rhp` desde la carpeta extraída y confirma.
6. Reinicia Rhino y ejecuta `AurumConect` para abrir el panel.

## Requisitos

- Windows de 64 bits.
- Rhino 7 actualizado (compilación dirigida a RhinoCommon 7.27).
- MatrixGold 3.1 instalado dentro de Rhino 7 para el flujo CAD.
- Microsoft Edge WebView2 Runtime (Evergreen) instalado en Windows.
- Conexión a Internet para acceder a AURUM LAB.

## Estado y validación

La descarga se publica únicamente después de compilar el complemento y validar que el archivo resultante es un ensamblado Windows válido. La carga real del .RHP, WebView2, el visor integrado y el ciclo completo de transferencia deben probarse en Rhino 7 + MatrixGold 3.1 antes de declarar la integración lista para producción.

AURUM CONECT continúa en beta. El visor Chromium se abre en una ventana modeless vinculada a la ventana principal de Rhino; no utiliza el WebView heredado de Eto/Internet Explorer de Rhino 7. El canal local de transferencia utiliza un token efímero y requiere verificar los permisos de red local del navegador. Esta compilación no modifica el documento original de Rhino: prepara una copia de la geometría seleccionada para el flujo de transferencia.
