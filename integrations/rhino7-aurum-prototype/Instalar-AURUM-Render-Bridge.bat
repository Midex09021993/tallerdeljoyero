@echo off
setlocal
title Instalador AURUM Render Bridge - Rhino 7
powershell.exe -NoProfile -ExecutionPolicy Bypass -Command "$u='https://raw.githubusercontent.com/Midex09021993/tallerdeljoyero/main/integrations/rhino7-aurum-prototype/Instalar-AURUM-Render-Bridge.ps1'; $p=Join-Path $env:TEMP 'Instalar-AURUM-Render-Bridge.ps1'; try { Invoke-WebRequest -Uri $u -OutFile $p -UseBasicParsing; if ((Get-Item $p).Length -lt 1000) { throw 'El instalador descargado esta incompleto.' }; & powershell.exe -NoProfile -ExecutionPolicy Bypass -File $p } catch { Write-Host ('Error: ' + $_.Exception.Message) -ForegroundColor Red; Read-Host 'Presiona Enter para cerrar'; exit 1 }"
endlocal
