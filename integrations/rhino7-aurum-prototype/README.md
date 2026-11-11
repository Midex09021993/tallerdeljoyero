# AURUM CONECT — Rhino 7 / MatrixGold 3.1

Este directorio conserva fuentes de una integración anterior de AURUM CONECT. No es la fuente de publicación de la beta vigente.

## Distribución beta vigente

La beta se distribuye actualmente como un único archivo `.RHP`:

- Archivo: `AurumConect-Rhino7-1.0.9.rhp`
- Publicación oficial: https://github.com/Midex09021993/aurum-conect-build/releases/tag/v1.0.9
- Descarga directa: https://github.com/Midex09021993/aurum-conect-build/releases/download/v1.0.9/AurumConect-Rhino7-1.0.9.rhp

No utilizar el paquete ZIP ni los binarios 1.0.0 históricos de este prototipo. El flujo de empaquetado antiguo se desactivó para evitar que publique archivos obsoletos o contradiga las instrucciones de instalación beta.

## Instalación beta

1. Descarga el `.RHP` desde la publicación oficial.
2. Copia el archivo en `C:\\Program Files\\Rhino 7\\Plug-ins\\` (o en la carpeta `Plug-ins` de la instalación personalizada de Rhino). Windows puede solicitar permisos de administrador.
3. En Rhino 7 ejecuta `_PlugInManager` y registra el archivo `.RHP`.
4. Habilita el complemento si Rhino lo solicita y ejecuta `AurumConect`.

La guía detallada está en [INSTALADOR.md](./INSTALADOR.md).

## Requisitos

- Windows de 64 bits.
- Rhino 7 de 64 bits.
- Microsoft Edge WebView2 Evergreen Runtime x64.
- .NET Framework 4.8.
- MatrixGold 3.1 dentro de Rhino 7 si se utiliza ese flujo CAD.
- Conexión a Internet para iniciar sesión en AURUM LAB.

## Alcance de la beta

- Un solo archivo descargable `.RHP`; todavía no se distribuye un instalador completo `.EXE`.
- La transferencia envía una copia completa temporal del documento Rhino; no existe sincronización en vivo.
- El complemento no solicita ni almacena la contraseña.
- El canal local utiliza `127.0.0.1`, un token de un solo uso y una caducidad de tres minutos.
- La integración debe validarse en cada entorno Rhino 7 / MatrixGold antes de su uso productivo.

El instalador profesional completo se desarrollará para la versión final, después de cerrar la validación de la beta.
