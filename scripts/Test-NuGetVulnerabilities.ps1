[CmdletBinding()]
param(
    [string]$Solution = "eCommerce.sln"
)

$ErrorActionPreference = "Stop"

$output = & dotnet package list --project $Solution --vulnerable --include-transitive --format json
if ($LASTEXITCODE -ne 0) {
    throw "NuGet vulnerability audit could not be completed."
}

$json = $output -join [Environment]::NewLine
$null = $json | ConvertFrom-Json

if ($json -match '"vulnerabilities"\s*:') {
    Write-Host $json
    throw "One or more vulnerable NuGet packages were found."
}

Write-Host "NuGet audit passed: no known vulnerable direct or transitive packages."
