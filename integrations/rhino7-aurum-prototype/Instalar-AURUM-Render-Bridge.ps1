$ErrorActionPreference = "Stop"
$ProgressPreference = "SilentlyContinue"

$repoRoot = "https://raw.githubusercontent.com/Midex09021993/tallerdeljoyero/main/integrations/rhino7-aurum-prototype"
$sourceDir = Join-Path $env:TEMP "AurumConect-Rhino7-Source"
$installDir = Join-Path $env:LOCALAPPDATA "AurumLab\AurumConect\Rhino7"
$files = @(
    "AurumConect.csproj",
    "AurumConectPlugin.cs",
    "AurumConectPanel.cs",
    "AurumConectCommands.cs",
    "AurumConectLocalServer.cs"
)

function Find-Rhino7System {
    $candidates = @(
        (Join-Path $env:ProgramFiles "Rhino 7\System"),
        (Join-Path ${env:ProgramFiles(x86)} "Rhino 7\System"),
        "C:\Program Files\Rhino 7\System",
        "C:\Program Files\Rhinoceros 7\System"
    ) | Select-Object -Unique

    foreach ($candidate in $candidates) {
        if ((Test-Path (Join-Path $candidate "RhinoCommon.dll")) -and
            (Test-Path (Join-Path $candidate "Eto.dll"))) {
            return $candidate
        }
    }
    return $null
}

try {
    Write-Host ""
    Write-Host "AURUM LAB | AURUM CONECT - Rhino 7" -ForegroundColor Yellow
    Write-Host "Preparando el complemento nativo C#..." -ForegroundColor Gray

    $rhinoSystem = Find-Rhino7System
    if (-not $rhinoSystem) {
        throw "No se encontraron RhinoCommon.dll y Eto.dll. Instala Rhino 7 o verifica su carpeta System."
    }

    $dotnet = Get-Command "dotnet" -ErrorAction SilentlyContinue
    if (-not $dotnet) {
        throw "No se encontró .NET SDK (comando dotnet). Instala el SDK de .NET y vuelve a ejecutar este instalador."
    }

    $net48ReferencePack = Join-Path ${env:ProgramFiles(x86)} "Reference Assemblies\Microsoft\Framework\.NETFramework\v4.8\mscorlib.dll"
    if (-not (Test-Path $net48ReferencePack)) {
        throw "Falta el targeting pack de .NET Framework 4.8. Instala .NET Framework 4.8 Developer Pack y vuelve a compilar."
    }

    New-Item -ItemType Directory -Path $sourceDir -Force | Out-Null
    New-Item -ItemType Directory -Path $installDir -Force | Out-Null

    foreach ($file in $files) {
        $url = "$repoRoot/$file"
        $destination = Join-Path $sourceDir $file
        Invoke-WebRequest -Uri $url -OutFile $destination -UseBasicParsing
        if (-not (Test-Path $destination) -or (Get-Item $destination).Length -lt 40) {
            throw "Descarga incompleta o inválida: $file"
        }
    }

    $project = Join-Path $sourceDir "AurumConect.csproj"
    $buildOutput = & dotnet build $project -c Release "-p:Rhino7SystemDir=$rhinoSystem" --nologo 2>&1
    $buildOutput | ForEach-Object { Write-Host $_ }
    if ($LASTEXITCODE -ne 0) {
        throw "La compilación falló. Revisa los errores anteriores; no se instaló ningún complemento."
    }

    $builtPlugin = Join-Path $sourceDir "bin\Release\net48\AurumConect.rhp"
    if (-not (Test-Path $builtPlugin)) {
        throw "La compilación terminó sin generar AurumConect.rhp."
    }

    $installedPlugin = Join-Path $installDir "AurumConect.rhp"
    Copy-Item -LiteralPath $builtPlugin -Destination $installedPlugin -Force

    $guide = @"
AURUM CONECT | Rhino 7 / MatrixGold 3.1

Complemento compilado desde el código fuente de AURUM LAB.
Archivo: $installedPlugin

INSTALACIÓN EN RHINO:
1. Abre Rhino 7.
2. Ejecuta _PlugInManager.
3. Pulsa Install y selecciona AurumConect.rhp.
4. Ejecuta AurumConect para abrir el panel.

USO:
Selecciona la geometría en MatrixGold y pulsa ACTUALIZAR DISEÑO.

ESTADO FUNCIONAL:
Esta compilación prepara una copia temporal .3dm y un canal local efímero.
La recepción se completa desde el botón de AURUM RENDER tras iniciar sesión.
El canal solo escucha en 127.0.0.1, expira en 3 minutos y admite un único uso.
"@
    Set-Content -LiteralPath (Join-Path $installDir "LEEME.txt") -Value $guide -Encoding UTF8

    Write-Host ""
    Write-Host "Compilación correcta. Complemento preparado:" -ForegroundColor Green
    Write-Host $installedPlugin -ForegroundColor Cyan
    Write-Host "Abriendo carpeta para que instales el .rhp desde Rhino..." -ForegroundColor Gray
    Start-Process explorer.exe -ArgumentList $installDir
    Read-Host "Presiona Enter para cerrar"
}
catch {
    Write-Host ""
    Write-Host "AURUM CONECT no se instaló." -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    Read-Host "Presiona Enter para cerrar"
    exit 1
}
