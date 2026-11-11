# AURUM CONECT - compilación y publicación del complemento Rhino 7
# Ejecutar desde la carpeta del repositorio en Windows 10.
$ErrorActionPreference = "Stop"
$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path
$Project = Join-Path $PSScriptRoot "AurumConect.csproj"
$DownloadDir = Join-Path $RepoRoot "public\downloads"
$Expected = "AurumConect-Rhino7-1.0.0.rhp"
$BundleName = "AurumConect-Rhino7-1.0.0.zip"
$BundleDir = Join-Path $PSScriptRoot "bundle"

function Fail($Message) {
  Write-Host ""
  Write-Host "ERROR: $Message" -ForegroundColor Red
  Read-Host -Prompt 'Presiona Enter para cerrar'
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
$sdkList = @()
if ($dotnet) {
  $sdkList = @(& dotnet --list-sdks 2>$null)
}
if (-not $dotnet -or $sdkList.Count -eq 0) {
  $winget = Get-Command winget -ErrorAction SilentlyContinue
  if (-not $winget) { Fail "Falta .NET SDK 8 y no se encontró winget. Instala .NET SDK 8 y vuelve a ejecutar." }
  Write-Host "No se encontró .NET SDK. Instalando .NET SDK 8..." -ForegroundColor Yellow
  & winget install --id Microsoft.DotNet.SDK.8 --exact --accept-package-agreements --accept-source-agreements
  if ($LASTEXITCODE -ne 0) { Fail "No se pudo instalar .NET SDK 8." }
  $machinePath = [Environment]::GetEnvironmentVariable("PATH","Machine")
  $userPath = [Environment]::GetEnvironmentVariable("PATH","User")
  $env:PATH = "$machinePath;$userPath"
  $dotnet = Get-Command dotnet -ErrorAction SilentlyContinue
  if (-not $dotnet) {
    $dotnetExe = Join-Path $env:ProgramFiles "dotnet\dotnet.exe"
    if (Test-Path $dotnetExe) { $env:PATH = "$(Split-Path $dotnetExe);$env:PATH" }
    $dotnet = Get-Command dotnet -ErrorAction SilentlyContinue
  }
  if (-not $dotnet) { Fail "Se instaló .NET SDK, pero Windows no encuentra dotnet. Reinicia Windows y vuelve a ejecutar." }
  $sdkList = @(& dotnet --list-sdks 2>$null)
  if ($sdkList.Count -eq 0) { Fail "No se detectó ningún SDK de .NET. Reinicia Windows y vuelve a ejecutar." }
}
Write-Host "SDK detectado: $($sdkList -join ', ')" -ForegroundColor Green

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
$peOffset = [BitConverter]::ToInt32($bytes, 0x3C)
if ($peOffset -lt 0x40 -or $peOffset + 6 -gt $bytes.Length) { Fail "El desplazamiento de la cabecera PE no es válido." }
if ($bytes[$peOffset] -ne 0x50 -or $bytes[$peOffset + 1] -ne 0x45 -or $bytes[$peOffset + 2] -ne 0 -or $bytes[$peOffset + 3] -ne 0) { Fail "La firma PE del complemento no es válida." }
$machine = [BitConverter]::ToUInt16($bytes, $peOffset + 4)
if ($machine -ne 0x8664) { Fail ("El complemento no es x64. Arquitectura PE detectada: 0x{0:X4}" -f $machine) }

New-Item -ItemType Directory -Force -Path $DownloadDir | Out-Null

# El visor Chromium necesita las bibliotecas administradas de WebView2 y su loader nativo.
# Se distribuyen juntas con el .RHP para que Rhino pueda resolverlas desde la misma carpeta.
if (Test-Path $BundleDir) { Remove-Item -Recurse -Force $BundleDir }
New-Item -ItemType Directory -Force -Path $BundleDir | Out-Null
Copy-Item -Force $Built (Join-Path $BundleDir $Expected)

$webViewAssemblies = Get-ChildItem (Join-Path $PSScriptRoot "bin\Release\net48") -File -Filter "Microsoft.Web.WebView2*.dll"
if (-not $webViewAssemblies -or $webViewAssemblies.Count -lt 2) {
  Fail "No se encontraron las bibliotecas administradas WebView2 en la salida de compilación."
}
foreach ($assembly in $webViewAssemblies) {
  Copy-Item -Force $assembly.FullName $BundleDir
}

$nativeLoaders = @(Get-ChildItem (Join-Path $PSScriptRoot "bin\Release\net48") -Recurse -File -Filter "WebView2Loader.dll")
$nativeLoader = $nativeLoaders | Where-Object { $_.FullName -match "[\\/]win-x64[\\/]native[\\/]" } | Select-Object -First 1
if (-not $nativeLoader) {
  $nativeLoader = $nativeLoaders | Where-Object { $_.FullName -match "[\\/]x64[\\/]" } | Select-Object -First 1
}
if (-not $nativeLoader) {
  Fail "No se encontró WebView2Loader.dll para Windows x64. No se publicará un paquete incompleto."
}
Copy-Item -Force $nativeLoader.FullName (Join-Path $BundleDir "WebView2Loader.dll")

$BundlePath = Join-Path $DownloadDir $BundleName
if (Test-Path $BundlePath) { Remove-Item -Force $BundlePath }
Compress-Archive -Path (Join-Path $BundleDir "*") -DestinationPath $BundlePath -CompressionLevel Optimal

$bundleFiles = Get-ChildItem $BundleDir -File
$requiredBundleFiles = @("AurumConect-Rhino7-1.0.0.rhp", "Microsoft.Web.WebView2.Core.dll", "Microsoft.Web.WebView2.WinForms.dll", "WebView2Loader.dll")
foreach ($requiredFile in $requiredBundleFiles) {
  if (-not ($bundleFiles.Name -contains $requiredFile)) {
    Fail "El paquete de instalación no contiene el archivo requerido: $requiredFile"
  }
}
$zipCheck = Join-Path $env:TEMP ("AurumConect-ZipCheck-" + [Guid]::NewGuid().ToString("N"))
Expand-Archive -LiteralPath $BundlePath -DestinationPath $zipCheck -Force
foreach ($requiredFile in $requiredBundleFiles) {
  if (-not (Test-Path (Join-Path $zipCheck $requiredFile))) {
    Remove-Item $zipCheck -Recurse -Force
    Fail "El ZIP final no contiene el archivo requerido: $requiredFile"
  }
}
Remove-Item $zipCheck -Recurse -Force

Write-Host "Validación correcta: .RHP x64 $([Math]::Round($bytes.Length / 1KB, 1)) KB; ZIP completo $([Math]::Round((Get-Item $BundlePath).Length / 1KB, 1)) KB" -ForegroundColor Green

& git -C $RepoRoot add -- $BundlePath
if ($LASTEXITCODE -ne 0) { Fail "No se pudo preparar el archivo para Git." }
& git -C $RepoRoot commit -m "Publish AURUM CONECT Rhino 7 plugin"
if ($LASTEXITCODE -ne 0) { Fail "No se pudo crear el commit de publicación." }
& git -C $RepoRoot push origin main
if ($LASTEXITCODE -ne 0) { Fail "El complemento se compiló, pero no se pudo subir a origin/main. Revisa la autenticación de Git y ejecuta git push origin main." }

Write-Host ""
Write-Host 'PUBLICACION ENVIADA A MAIN' -ForegroundColor Green
Write-Host "Paquete recomendado: public/downloads/$BundleName"
Write-Host 'La web podra servirlo cuando termine de desplegar el commit.'
Write-Host "URL: https://www.tallerdeljoyero.com/downloads/$BundleName"
Read-Host -Prompt 'Presiona Enter para cerrar'
