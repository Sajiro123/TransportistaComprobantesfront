$ErrorActionPreference = "Stop"

$ProjectRoot = $PSScriptRoot
$DeployProdDir = Resolve-Path "$ProjectRoot\..\deploy-prod" | Select-Object -ExpandProperty Path
$DeployDir = "$DeployProdDir\frontend"

Write-Host "=============================================="
Write-Host " Preparando Despliegue del Frontend           "
Write-Host "=============================================="

if (!(Test-Path $DeployDir)) {
    Write-Host "Creando directorio de despliegue en $DeployDir..."
    New-Item -ItemType Directory -Path $DeployDir | Out-Null
}

Write-Host "1. Compilando la imagen Docker..."
cd $ProjectRoot
docker build --no-cache -t frontend-comprobantes-trans .

Write-Host "2. Exportando la imagen Docker a frontend-comprobantes-trans.tar..."
docker save -o "$DeployDir\frontend-comprobantes-trans.tar" frontend-comprobantes-trans

Write-Host "3. Copiando archivos de configuracion..."
Copy-Item "$ProjectRoot\docker-compose.yml" -Destination $DeployDir -Force
Copy-Item "$ProjectRoot\public\env.front.js" -Destination $DeployDir -Force

if (Test-Path "$DeployProdDir\MANUAL-DESPLIEGUE.md") {
    Copy-Item "$DeployProdDir\MANUAL-DESPLIEGUE.md" -Destination $DeployDir -Force
}

Write-Host "4. Creando el paquete comprimido deploy-comprobantes-frontend.tgz..."
cd $DeployDir
tar -czf deploy-comprobantes-frontend.tgz docker-compose.yml env.front.js frontend-comprobantes-trans.tar MANUAL-DESPLIEGUE.md

Write-Host "=============================================="
Write-Host " ¡Empaquetado generado exitosamente! "
Write-Host " Ubicacion: $DeployDir\deploy-comprobantes-frontend.tgz"
Write-Host "=============================================="
