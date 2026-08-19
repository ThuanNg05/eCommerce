[CmdletBinding()]
param(
    [string]$ConnectionString = $env:WAREHOUSE_INTEGRATION_CONNECTION
)

$ErrorActionPreference = "Stop"

if ([string]::IsNullOrWhiteSpace($ConnectionString)) {
    throw "Set WAREHOUSE_INTEGRATION_CONNECTION to an isolated PostgreSQL/Supabase staging connection string before running integration tests."
}

if ($ConnectionString -match '(?i)Trust\s*Server\s*Certificate\s*=\s*true') {
    throw "Integration connection must not use Trust Server Certificate=true."
}

$caCertificate = Join-Path $PSScriptRoot "..\supabase\prod-ca-2021.crt"
if ($ConnectionString -match '(?i)SSL\s*Mode\s*=\s*VerifyFull' -and
    $ConnectionString -notmatch '(?i)Root\s+Certificate\s*=') {
    if (-not (Test-Path -LiteralPath $caCertificate)) {
        throw "VerifyFull integration requires the Supabase CA certificate at $caCertificate."
    }
    $ConnectionString = $ConnectionString.TrimEnd(';') + ";Root Certificate=$([IO.Path]::GetFullPath($caCertificate))"
}

$env:ConnectionStrings__Default = $ConnectionString
$env:WAREHOUSE_INTEGRATION_CONNECTION = $ConnectionString
dotnet test tests/WarehouseApp.Integration.Tests/WarehouseApp.Integration.Tests.csproj -c Release --nologo
if ($LASTEXITCODE -ne 0) { throw "PostgreSQL integration tests failed." }
