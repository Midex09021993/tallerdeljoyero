@echo off
title AURUM CONECT - Rhino 7
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0Build-AurumConect.ps1"
if errorlevel 1 (
  echo.
  echo El proceso termino con errores. Revisa el mensaje anterior.
  pause
)
