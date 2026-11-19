$ErrorActionPreference = "Stop"
$ProgressPreference = "SilentlyContinue"

$repoRoot = "https://raw.githubusercontent.com/Midex09021993/tallerdeljoyero/main/integrations"
$sourceRoot = Join-Path $env:TEMP "AurumConect-Rhino8-Source"
$projectDir = Join-Path $sourceRoot "rhino8-aurum-conect"
$sharedDir = Join-Path $sourceRoot "rhino7-aurum-prototype"
$installDir = Join-Path $env:LOCALAPPDATA "AurumLab\AurumConect\Rhino8"

function Find-Rhino8System {
    $candidates = @(
        (Join-Path $env:ProgramFiles "Rhino 8\System"),
        "C:\Program Files\Rhino 8\System",
        "C:\Program Files\Rhinoceros 8\System"
    ) | Select-Object -Unique
    foreach ($candidate in $candidates) {
        if ((Test-Path (Join-Path $candidate "RhinoCommon.dll")) -and
            (Test-Path (Join-Path $candidate "Eto.dll")) -and
            (Test-Path (Join-Path $candidate "Rhino.UI.dll"))) {
            return $candidate
        }
    }
    return $null
}

try {
    Write-Host ""
    Write-Host "AURUM LAB | AURUM CONECT - Rhino 8" -ForegroundColor Yellow
    Write-Host "Preparando el complemento nativo para .NET 8..." -ForegroundColor Gray

    $rhinoSystem = Find-Rhino8System
    if (-not $rhinoSystem) {
        throw "No se encontraron RhinoCommon.dll, Eto.dll y Rhino.UI.dll. Instala Rhino 8 o verifica su carpeta System."
    }
    $rhinoExe = Join-Path $rhinoSystem "Rhino.exe"
    if (-not (Test-Path $rhinoExe)) { throw "No se encontró Rhino.exe en la carpeta System de Rhino 8." }
    $rhinoVersion = [version](Get-Item $rhinoExe).VersionInfo.FileVersion
    if ($rhinoVersion.Major -ne 8 -or $rhinoVersion.Minor -lt 20) {
        throw "AURUM CONECT 8 requiere Rhino 8.20 o posterior para usar el runtime .NET 8 predeterminado. Versión detectada: $rhinoVersion"
    }
    $dotnet = Get-Command "dotnet" -ErrorAction SilentlyContinue
    if (-not $dotnet) { throw "No se encontró .NET SDK 8. Instala el SDK y vuelve a ejecutar este instalador." }

    $sdkList = & dotnet --list-sdks 2>&1
    $hasNet8 = $false
    foreach ($sdk in $sdkList) { if ($sdk -match '^8\.') { $hasNet8 = $true } }
    if (-not $hasNet8) { throw "Se requiere .NET SDK 8 o superior compatible con el destino net8.0-windows." }

    New-Item -ItemType Directory -Path $projectDir -Force | Out-Null
    New-Item -ItemType Directory -Path $sharedDir -Force | Out-Null
    New-Item -ItemType Directory -Path $installDir -Force | Out-Null

    $projectFiles = @("AurumConect.Rhino8.csproj", "AurumConectPlugin.cs", "AurumConectPanel.cs")
    foreach ($file in $projectFiles) {
        Invoke-WebRequest -Uri "$repoRoot/rhino8-aurum-conect/$file" -OutFile (Join-Path $projectDir $file) -UseBasicParsing
    }
    $sharedFiles = @("AurumConectPanel.cs", "AurumConectCommands.cs", "AurumConectLocalServer.cs", "AurumConectRenderWindow.cs")
    foreach ($file in $sharedFiles) {
        Invoke-WebRequest -Uri "$repoRoot/rhino7-aurum-prototype/$file" -OutFile (Join-Path $sharedDir $file) -UseBasicParsing
    }

    foreach ($file in (@($projectFiles + $sharedFiles))) {
        $path = if ($projectFiles -contains $file) { Join-Path $projectDir $file } else { Join-Path $sharedDir $file }
        if (-not (Test-Path $path) -or (Get-Item $path).Length -lt 40) { throw "Descarga incompleta o inválida: $file" }
    }

    $project = Join-Path $projectDir "AurumConect.Rhino8.csproj"
    $buildOutput = & dotnet build $project -c Release "-p:Rhino8SystemDir=$rhinoSystem" --nologo 2>&1
    $buildOutput | ForEach-Object { Write-Host $_ }
    if ($LASTEXITCODE -ne 0) { throw "La compilación falló. No se instaló ningún complemento." }

    $builtPlugin = Join-Path $projectDir "bin\Release\net8.0-windows\AurumConect8.rhp"
    if (-not (Test-Path $builtPlugin)) { throw "La compilación terminó sin generar AurumConect8.rhp." }

    Get-ChildItem -LiteralPath (Split-Path $builtPlugin) -File | Where-Object {
        $_.Extension -ne ".pdb" -and $_.Name -notin @("RhinoCommon.dll", "Eto.dll", "Rhino.UI.dll")
    } | Copy-Item -Destination $installDir -Force

    $guide = @"
AURUM CONECT 8 | Rhinoceros 8

Complemento nativo compilado para Rhino 8.20+ / .NET 8.
Archivo: $(Join-Path $installDir "AurumConect8.rhp")

INSTALACIÓN:
1. Abre Rhino 8.
2. Ejecuta _PlugInManager.
3. Pulsa Install y selecciona AurumConect8.rhp.
4. Ejecuta AurumConect para abrir el panel AURUM CONECT 8.

USO:
Selecciona las piezas en Rhino/MatrixGold y pulsa ENVIAR DISEÑO.
Se genera una copia temporal .3dm versión 7 para conservar compatibilidad
con el receptor existente de AURUM RENDER.

SEGURIDAD Y LÍMITES:
Canal local 127.0.0.1, token criptográfico de un solo uso,
origen web autorizado, expiración de 3 minutos y máximo 500 MiB.
El archivo no se envía a Supabase ni a almacenamiento público.
Se requiere Microsoft Edge WebView2 Evergreen Runtime.
"@
    Set-Content -LiteralPath (Join-Path $installDir "LEEME.txt") -Value $guide -Encoding UTF8

    Write-Host ""
    Write-Host "Compilación correcta. Complemento preparado:" -ForegroundColor Green
    Write-Host (Join-Path $installDir "AurumConect8.rhp") -ForegroundColor Cyan
    Start-Process explorer.exe -ArgumentList $installDir
    Read-Host "Presiona Enter para cerrar"
}
catch {
    Write-Host ""
    Write-Host "AURUM CONECT 8 no se instaló." -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    Read-Host "Presiona Enter para cerrar"
    exit 1
}
