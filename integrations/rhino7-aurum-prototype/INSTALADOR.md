# AURUM CONECT — Beta para Rhino 7

## Descarga oficial

La distribución beta vigente es un único archivo:

`AurumConect-Rhino7-1.0.9.rhp`

Descárgalo desde la publicación oficial:
https://github.com/Midex09021993/aurum-conect-build/releases/download/v1.0.9/AurumConect-Rhino7-1.0.9.rhp

No utilices los binarios 1.0.0 ni los paquetes ZIP históricos de este prototipo. Este directorio contiene fuentes de una integración anterior y no es la fuente de publicación de la beta vigente.

## Instalación manual beta

1. Descarga el archivo `.RHP` desde el enlace oficial anterior.
2. Copia el archivo en la carpeta de complementos de Rhino 7: `C:\\Program Files\\Rhino 7\\Plug-ins\\`. Si Windows solicita autorización, acepta el permiso de administrador.
3. Abre Rhino 7 y ejecuta `_PlugInManager`.
4. Selecciona la opción para instalar un complemento y registra `AurumConect-Rhino7-1.0.9.rhp` desde esa carpeta.
5. Habilita el complemento si Rhino lo solicita y ejecuta `AurumConect`.

Si Rhino 7 está instalado en otra unidad o carpeta personalizada, utiliza la carpeta `Plug-ins` de esa instalación.

## Requisitos

- Windows de 64 bits.
- Rhino 7 de 64 bits.
- Microsoft Edge WebView2 Evergreen Runtime x64.
- .NET Framework 4.8.
- MatrixGold 3.1 dentro de Rhino 7 si se utilizará ese flujo CAD.
- Conexión a Internet e inicio de sesión en AURUM LAB.

## Estado beta y límites

- La beta se distribuye como un único `.RHP`; todavía no es un instalador completo `.EXE`.
- No requiere que el usuario instale SDK ni compile el código.
- La transferencia actual envía una copia completa temporal del documento Rhino; no es sincronización en vivo.
- El complemento no solicita ni almacena la contraseña del usuario.
- El canal local utiliza `127.0.0.1`, un token de un solo uso y una caducidad de tres minutos.
- La integración debe validarse en cada entorno Rhino 7 / MatrixGold antes de su uso productivo.

El instalador profesional completo queda reservado para la versión final. La publicación oficial de la beta se mantiene en el repositorio `Midex09021993/aurum-conect-build`.
