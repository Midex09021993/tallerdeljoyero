# AURUM CONECT 8

Complemento nativo para Rhinoceros 8 que replica el flujo de AURUM CONECT para Rhino 7.

## Diseño

- Ensamblado independiente: `AurumConect8.rhp`.
- GUID propio, sin colisionar con el complemento Rhino 7.
- Destino .NET 8 para el runtime moderno de Rhino 8.20 o posterior (el runtime .NET 7 predeterminado de Rhino 8.19 y anteriores no es compatible con este binario).
- Referencias a RhinoCommon, Eto y Rhino.UI desde la instalación local de Rhino 8.
- Comparte deliberadamente los cuatro archivos de lógica estable con Rhino 7: panel, comandos, servidor local y ventana WebView2. El instalador descarga esos archivos junto al proyecto para compilar sin depender de una copia local del repositorio.
- El comando exporta un .3dm versión 7 para que el receptor actual de AURUM RENDER siga siendo compatible.

## Flujo conservado

Selección de geometría -> copia temporal .3dm -> servidor local loopback -> token temporal de un solo uso -> recepción en AURUM RENDER -> `cargarArchivo(file, { preserveScene: true })`.

Límite de transferencia: 500 MiB. No utiliza Supabase ni almacenamiento público.

## Instalación

Ejecutar `Instalar-AURUM-CONECT-Rhino8.ps1` en Windows con Rhino 8.20 o posterior, .NET SDK 8 y Microsoft Edge WebView2 Evergreen Runtime instalados. El instalador verifica la versión de Rhino antes de compilar. El instalador compila contra las DLL de la instalación detectada y copia el .rhp y sus dependencias privadas.

## Validación pendiente

La compilación y carga real del .rhp deben verificarse en un equipo Windows con Rhino 8 instalado. La creación de los archivos en GitHub no equivale a una prueba de ejecución dentro de Rhino.
