# AURUM CONECT — Rhino 7 / MatrixGold 3.1

Complemento nativo para abrir un panel acoplable en Rhino 7 y preparar una copia temporal del diseño para AURUM Render.

## Estado de esta entrega

**Base nativa del complemento implementada; transferencia directa todavía pendiente.**

Incluye:
- Plugin Rhino 7 (.rhp) en C# / .NET Framework 4.8.
- Panel acoplable **AURUM CONECT**.
- Comando `AurumConect` para abrir el panel.
- Botón único **ACTUALIZAR DISEÑO**.
- Comando `AurumConectActualizar`: solicita la geometría seleccionada, crea una copia .3dm temporal y abre AURUM Render.
- El documento original de Rhino no se modifica.
- Cada actualización crea un archivo temporal nuevo; no sobrescribe transferencias anteriores.

La carga automática del archivo en el visor web aún no está conectada. El comando informa claramente de esta limitación y muestra la ruta del .3dm preparado. No se presenta esta fase como sincronización completa.

## Compilar

Requisitos:
- Windows.
- Rhino 7 instalado.
- Visual Studio 2022 o .NET Framework 4.8 Developer Pack.
- RhinoCommon.dll y Eto.dll de la carpeta de instalación de Rhino 7.

Desde esta carpeta:

```powershell
dotnet build .\AurumConect.csproj -c Release
```

Si Rhino 7 está instalado en otra ruta:

```powershell
dotnet build .\AurumConect.csproj -c Release -p:Rhino7SystemDir="D:\\Rhinoceros 7\\System"
```

El archivo resultante se genera en `bin/Release/net48/AurumConect.rhp`.

## Instalar y abrir

1. En Rhino 7 ejecuta `_PlugInManager` e instala `AurumConect.rhp`.
2. Ejecuta el comando `AurumConect` para abrir el panel.
3. Acopla el panel donde prefieras.
4. Selecciona las piezas del diseño y pulsa **ACTUALIZAR DISEÑO**.

## Transferencia directa — siguiente fase

El siguiente paso es conectar el plugin con el editor autenticado mediante un canal local seguro de un solo uso. El navegador deberá recibir el .3dm y pasarlo a la función de carga existente en AURUM Render, sustituyendo el modelo anterior sin duplicarlo. Esta fase requiere cambios web y pruebas en Chrome/Windows; no se simula ni se considera completada aquí.

No se incluyen claves de Supabase, tokens permanentes ni credenciales en el plugin.
