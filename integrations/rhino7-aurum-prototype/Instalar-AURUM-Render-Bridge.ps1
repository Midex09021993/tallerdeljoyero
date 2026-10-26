$ErrorActionPreference = "Stop"
$ProgressPreference = "SilentlyContinue"
$scriptUrl = "https://raw.githubusercontent.com/Midex09021993/tallerdeljoyero/main/integrations/rhino7-aurum-prototype/AurumRenderBridge.py"
$installDir = Join-Path $env:APPDATA "AurumLab\Rhino7\AURUM-Render-Bridge"
$scriptPath = Join-Path $installDir "AurumRenderBridge.py"
$guidePath = Join-Path $installDir "LEEME.txt"
try {
    Write-Host "AURUM LAB - Instalador de AURUM Render Bridge" -ForegroundColor Yellow
    New-Item -ItemType Directory -Path $installDir -Force | Out-Null
    $tempPath = Join-Path $installDir "AurumRenderBridge.download"
    Invoke-WebRequest -Uri $scriptUrl -OutFile $tempPath -UseBasicParsing
    $downloaded = Get-Content -LiteralPath $tempPath -Raw
    if (-not $downloaded.StartsWith("# -*- coding: utf-8 -*-")) {
        Remove-Item -LiteralPath $tempPath -Force -ErrorAction SilentlyContinue
        throw "El archivo descargado no parece ser el script oficial."
    }
    Move-Item -LiteralPath $tempPath -Destination $scriptPath -Force
    $guide = @"
AURUM Render Bridge - Rhino 7

INSTALADO EN:
$scriptPath

COMO EJECUTAR:
1. Abre Rhino 7 / MatrixGold.
2. En Rhino, ejecuta _RunPythonScript.
3. Selecciona AurumRenderBridge.py en esta carpeta.
4. Selecciona los objetos que deseas preparar.

LIMITACIONES:
El prototipo crea una copia temporal .3dm y abre AURUM Render.
No transfiere ni carga el modelo automáticamente en el editor web.
"@
    Set-Content -LiteralPath $guidePath -Value $guide -Encoding UTF8
    $desktop = [Environment]::GetFolderPath("Desktop")
    $shortcutPath = Join-Path $desktop "AURUM Render Bridge - Rhino 7.lnk"
    $shell = New-Object -ComObject WScript.Shell
    $shortcut = $shell.CreateShortcut($shortcutPath)
    $shortcut.TargetPath = $installDir
    $shortcut.WorkingDirectory = $installDir
    $shortcut.Description = "Carpeta instalada de AURUM Render Bridge para Rhino 7"
    $shortcut.Save()
    Write-Host "Instalacion completada." -ForegroundColor Green
    Write-Host "Script: $scriptPath"
    Write-Host "Guia: $guidePath"
    Write-Host "La transferencia automatica al editor web aun no esta implementada." -ForegroundColor Yellow
    Start-Process explorer.exe -ArgumentList $installDir
    Read-Host "Presiona Enter para cerrar"
}
catch {
    Write-Host "No se pudo completar la instalacion: $($_.Exception.Message)" -ForegroundColor Red
    Read-Host "Presiona Enter para cerrar"
    exit 1
}
