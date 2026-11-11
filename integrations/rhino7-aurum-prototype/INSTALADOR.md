# Instalación de AURUM CONECT — Rhino 7 / MatrixGold 3.1

## Instalador recomendado

Ejecuta `Instalar-AURUM-Render-Bridge.bat`. El instalador detecta Rhino 7, descarga el código C# desde `main`, compila el complemento y copia el archivo `.rhp` únicamente si la compilación finaliza correctamente.

Requisitos: Rhino 7 instalado, RhinoCommon.dll y Eto.dll disponibles en su carpeta System, y .NET SDK con soporte para .NET Framework 4.8.

## Instalar el complemento

1. Abre Rhino 7.
2. Ejecuta `_PlugInManager`.
3. Pulsa **Install** y selecciona `AurumConect.rhp` en `%LOCALAPPDATA%\AurumLab\AurumConect\Rhino7`.
4. Ejecuta el comando `AurumConect`.
5. Acopla el panel donde prefieras.

## Uso actual

1. Abre el diseño en MatrixGold 3.1.
2. Selecciona la geometría que quieras enviar.
3. Pulsa **ACTUALIZAR DISEÑO**.
4. El complemento prepara una copia temporal .3dm y abre AURUM Render. En esta versión todavía debes seleccionar manualmente el archivo desde el visor.

## Estado y limitaciones

El instalador no genera un .rhp ficticio: se detiene si no encuentra las DLL de Rhino 7 o si `dotnet build` falla. La compilación debe verificarse también dentro de Rhino 7 en el equipo de destino.

La transferencia automática directa al visor web sigue pendiente. No se debe confundir esta versión con una integración de un solo clic ya terminada.
