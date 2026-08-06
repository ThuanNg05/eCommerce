<#
  run-dev.ps1 — start the local dev stack in two windows:
    * Backend  ASP.NET Core API  -> http://localhost:5080  (Development; reads appsettings.Development.json)
    * Frontend Vite dev server   -> http://localhost:5173  (proxies /api -> :5080)

  Usage:  right-click > "Run with PowerShell", or from a terminal:  ./run-dev.ps1
          (or just double-click run-dev.cmd)
  Stop:   close each window, or press Ctrl+C inside it.

  Note: make sure no old API instance is already using port 5080 before starting.
#>
$ErrorActionPreference = 'Stop'
$root = $PSScriptRoot

# 1) First run: install web dependencies if missing.
if (-not (Test-Path (Join-Path $root 'web\node_modules'))) {
    Write-Host '[run-dev] Installing web dependencies (first run, may take a minute)...' -ForegroundColor Cyan
    Push-Location (Join-Path $root 'web')
    npm install
    Pop-Location
}

# 2) Backend API in its own window (http profile = port 5080).
Write-Host '[run-dev] Starting backend  -> http://localhost:5080' -ForegroundColor Green
Start-Process powershell -ArgumentList @(
    '-NoExit', '-NoProfile', '-Command',
    "Set-Location '$root'; dotnet run --project src/WarehouseApp.Api --launch-profile http"
)

# 3) Frontend (Vite) in its own window.
Write-Host '[run-dev] Starting frontend -> http://localhost:5173' -ForegroundColor Green
Start-Process powershell -ArgumentList @(
    '-NoExit', '-NoProfile', '-Command',
    "Set-Location '$root\web'; npm run dev"
)

# 4) Give Vite a moment to boot, then open the app.
Start-Sleep -Seconds 5
Start-Process 'http://localhost:5173'
Write-Host '[run-dev] Launched. App: http://localhost:5173  |  API health: http://localhost:5080/health' -ForegroundColor Yellow
