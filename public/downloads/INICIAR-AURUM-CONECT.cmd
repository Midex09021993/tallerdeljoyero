@echo off
setlocal
title AURUM CONECT - Preparar y publicar
set "ROOT=%USERPROFILE%\AURUM-LAB"
set "REPO=%ROOT%\tallerdeljoyero"
echo ==========================================
echo   AURUM CONECT - Rhino 7 / MatrixGold 3.1
echo ==========================================
where winget >nul 2>&1
if errorlevel 1 (echo ERROR: winget no esta disponible. Actualiza App Installer desde Microsoft Store.& pause& exit /b 1)
where git >nul 2>&1
if errorlevel 1 (
  echo Instalando Git...
  winget install --id Git.Git -e --source winget --accept-package-agreements --accept-source-agreements
  if errorlevel 1 (echo No se pudo instalar Git. Instala Git for Windows y vuelve a ejecutar.& pause& exit /b 1)
  echo Git instalado. Cierra esta ventana y vuelve a ejecutar este archivo.
  pause
  exit /b 0
)
if not exist "%REPO%\.git" (
  if not exist "%ROOT%" mkdir "%ROOT%"
  git clone https://github.com/Midex09021993/tallerdeljoyero.git "%REPO%"
  if errorlevel 1 (echo No se pudo clonar el repositorio. Comprueba acceso a GitHub y autenticacion.& pause& exit /b 1)
) else (
  git -C "%REPO%" switch main
  if errorlevel 1 goto error
  git -C "%REPO%" pull --ff-only origin main
  if errorlevel 1 goto error
)
call "%REPO%\integrations\rhino7-aurum-prototype\COMPILAR-Y-PUBLICAR.cmd"
exit /b %errorlevel%
:error
echo No se pudo actualizar main. Revisa conexion o cambios locales.
pause
exit /b 1
