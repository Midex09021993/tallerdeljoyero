# Instalador AURUM Render Bridge — Rhino 7

## Instalación
1. Descarga Instalar-AURUM-Render-Bridge.bat.
2. Haz doble clic. Windows abrirá PowerShell para descargar el instalador oficial y el script.
3. El instalador coloca AurumRenderBridge.py en %APPDATA%\\AurumLab\\Rhino7\\AURUM-Render-Bridge, crea una guía y un acceso directo en el Escritorio.

## Uso
En Rhino 7 / MatrixGold, ejecuta _RunPythonScript y elige el archivo instalado. Selecciona los objetos que deseas preparar.

## Alcance real
El instalador instala el prototipo local. El script copia los objetos seleccionados a un archivo temporal .3dm y abre AURUM Render. No sube ni carga automáticamente el modelo en el editor web. Esa integración requiere una siguiente fase de desarrollo y pruebas en una instalación real de Rhino 7 / MatrixGold 3.1.

## Requisitos
Windows, conexión a Internet, Rhino 7 y permisos de ejecución de PowerShell para este instalador. Revisa el código fuente antes de ejecutarlo si tu política de seguridad lo requiere.
