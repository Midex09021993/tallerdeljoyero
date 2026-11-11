# AURUM CONECT - compilación y publicación del complemento Rhino 7
# Ejecutar desde la carpeta del repositorio en Windows 10.
$ErrorActionPreference = "Stop"
$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path
$Project = Join-Path $PSScriptRoot "AurumConect.csproj"
$DownloadDir = Join-Path $RepoRoot "public\downloads"
$Expected = "AurumConect-Rhino7-1.0.0.rhp"

function Fail($Message) {
  Write-Host ""
  Write-Host "ERROR: $Message" -ForegroundColor Red
  Read-Host "Presiona Enter para cerrar"
  exit 1
}

Write-Host "AURUM CONECT | Rhino 7 + MatrixGold 3.1" -ForegroundColor Cyan
Write-Host "Repositorio: $RepoRoot"

if (-not (Test-Path $Project)) { Fail "No se encuentra el proyecto: $Project" }

$branch = (& git -C $RepoRoot branch --show-current 2>$null)
if ($LASTEXITCODE -ne 0) { Fail "Git no está instalado o esta carpeta no es un repositorio." }
if ($branch.Trim() -ne "main") { Fail "Por seguridad, este proceso solo publica desde la rama main. Rama actual: $branch" }

$status = (& git -C $RepoRoot status --porcelain)
if ($status) { Fail "Hay cambios locales sin guardar. Haz commit o guarda tus cambios antes de publicar." }

$dotnet = Get-Command dotnet -ErrorAction SilentlyContinue
if (-not $dotnet) {
  $winget = Get-Command winget -ErrorAction SilentlyContinue
  if (-not $winget) { Fail "Falta .NET SDK 8 y no se encontró winget. Instala .NET SDK 8 y vuelve a ejecutar." }
  Write-Host "Instalando .NET SDK 8..." -ForegroundColor Yellow
  & winget install --id Microsoft.DotNet.SDK.8 --exact --accept-package-agreements --accept-source-agreements
  if ($LASTEXITCODE -ne 0) { Fail "No se pudo instalar .NET SDK 8." }
  $env:PATH = [Environment]::GetEnvironmentVariable("PATH","Machine") + ";" + [Environment]::GetEnvironmentVariable("PATH","User")
  $dotnet = Get-Command dotnet -ErrorAction SilentlyContinue
  if (-not $dotnet) { Fail "Cierra esta ventana, abre una nueva y vuelve a ejecutar el lanzador para que Windows actualice PATH." }
}

Write-Host "Restaurando dependencias NuGet..."
& dotnet restore $Project
if ($LASTEXITCODE -ne 0) { Fail "Falló la restauración de dependencias." }

Write-Host "Compilando complemento .RHP..."
& dotnet build $Project --configuration Release --no-restore
if ($LASTEXITCODE -ne 0) { Fail "La compilación falló. No se publicó ningún archivo." }

$Built = Join-Path $PSScriptRoot "bin\Release\net48\AurumConect.rhp"
if (-not (Test-Path $Built)) { Fail "La compilación terminó, pero no apareció AurumConect.rhp en la salida esperada." }

$bytes = [System.IO.File]::ReadAllBytes($Built)
if ($bytes.Length -lt 4096) { Fail "El archivo generado es demasiado pequeño; se rechaza por seguridad." }
if ($bytes[0] -ne 0x4D -or $bytes[1] -ne 0x5A) { Fail "El archivo no tiene una cabecera PE válida (MZ)." }

New-Item -ItemType Directory -Force -Path $DownloadDir | Out-Null
$Published = Join-Path $DownloadDir $Expected
Copy-Item -Force $Built $Published
Write-Host "Validación correcta: $([Math]::Round($bytes.Length / 1KB, 1)) KB" -ForegroundColor Green

& git -C $RepoRoot add -- $Published
if ($LASTEXITCODE -ne 0) { Fail "No se pudo preparar el archivo para Git." }
& git -C $RepoRoot commit -m "Publish AURUM CONECT Rhino 7 plugin"
if ($LASTEXITCODE -ne 0) { Fail "No se pudo crear el commit de publicación." }
& git -C $RepoRoot push origin main
if ($LASTEXITCODE -ne 0) { Fail "El complemento se compiló, pero no se pudo subir a origin/main. Revisa la autenticación de Git y ejecuta git push origin main." }

Write-Host ""
Write-Host "PUBLICACIÓN ENVIADA A MAIN" -ForegroundColor Green
Write-Host "Archivo: public/downloads/$Expected"
Write-Host "La web podrá servirlo cuando termine de desplegar el commit."
Write-Host "URL: https://www.tallerdeljoyero.com/downloads/$Expected"
Read-Host "Presiona Enter para cerrar"
