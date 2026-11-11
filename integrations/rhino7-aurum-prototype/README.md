# AURUM CONECT — Rhino 7 / MatrixGold 3.1

Complemento nativo para Rhino 7. Esta integración se mantiene separada del prototipo de Rhino 8.

## Estado verificado del código

La base del complemento contiene:
- Proyecto C# para .NET Framework 4.8, con referencias a RhinoCommon y Eto de Rhino 7.
- Panel acoplable **AURUM CONECT**.
- Comando `AurumConect` para abrir el panel.
- Botón **CONECTAR CON AURUM LAB**, que abre el inicio de sesión oficial en el navegador.
- Botón **ACTUALIZAR DISEÑO**, que prepara la copia temporal y solicita el acceso al visor.
- Comando `AurumConectActualizar`, que copia la geometría seleccionada a un archivo .3dm temporal y abre AURUM Render.
- El documento original de Rhino no se modifica.

**Limitación funcional actual:** el inicio de sesión ya reutiliza la autenticación oficial de AURUM LAB y devuelve al usuario directamente a Aurum Render. El complemento no almacena contraseñas. Todavía no existe transferencia directa del .3dm al visor; el archivo temporal debe cargarse manualmente. No se debe presentar esta versión como sincronización automática.

La compilación contra RhinoCommon/Eto y la prueba dentro de Rhino 7 deben ejecutarse en un equipo Windows que tenga Rhino 7 instalado. No se declara el complemento compilado ni probado hasta completar esas comprobaciones.

## Instalación asistida

Ejecuta `Instalar-AURUM-Render-Bridge.bat`. El instalador:
1. Detecta la carpeta System de Rhino 7 y comprueba RhinoCommon.dll y Eto.dll.
2. Comprueba que exista el comando `dotnet`.
3. Descarga los cuatro archivos fuente del complemento desde la rama `main`.
4. Compila el proyecto en Release.
5. Solo si la compilación termina correctamente, copia `AurumConect.rhp` a `%LOCALAPPDATA%\AurumLab\AurumConect\Rhino7`.

Requisitos: Windows, Rhino 7 instalado y .NET SDK con soporte para compilar .NET Framework 4.8. Si faltan dependencias o la compilación falla, el instalador se detiene y no copia un complemento incompleto.

## Instalación en Rhino

1. Abre Rhino 7.
2. Ejecuta `_PlugInManager`.
3. Pulsa **Install** y selecciona `AurumConect.rhp` en la carpeta indicada por el instalador.
4. Ejecuta `AurumConect` para abrir el panel.
5. Pulsa **CONECTAR CON AURUM LAB** e inicia sesión en el navegador oficial (si aún no tienes una sesión activa).
6. Regresa a Rhino, selecciona las piezas del diseño y pulsa **ACTUALIZAR DISEÑO**.

## Compilación manual

Desde esta carpeta:

```powershell
dotnet build .\AurumConect.csproj -c Release
```

Si Rhino 7 está en otra ruta:

```powershell
dotnet build .\AurumConect.csproj -c Release -p:Rhino7SystemDir="D:\Rhinoceros 7\System"
```

El resultado esperado es `bin/Release/net48/AurumConect.rhp`.

## Siguiente fase: transferencia directa

La siguiente fase debe conectar el plugin con la sesión autenticada del editor mediante un canal local de un solo uso. El navegador recibirá el .3dm y lo entregará a la función de carga existente de AURUM Render, reemplazando el modelo anterior en lugar de duplicarlo.

Ese canal requiere validación de origen, token efímero, límite de tamaño, consumo único y pruebas reales en Chrome/Windows. No se deben introducir secretos permanentes ni exponer archivos 3DM públicamente.
