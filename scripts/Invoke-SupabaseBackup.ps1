[CmdletBinding()]
param(
    [string]$OutputDirectory = "artifacts/backups",
    [string]$ConnectionString = $env:WAREHOUSE_BACKUP_CONNECTION
)

$ErrorActionPreference = "Stop"

if ([string]::IsNullOrWhiteSpace($ConnectionString)) {
    throw "Set WAREHOUSE_BACKUP_CONNECTION to the approved staging/production connection string outside the repository."
}
if ($ConnectionString -match '(?i)Trust\s*Server\s*Certificate\s*=\s*true') {
    throw "Backup connection must not use Trust Server Certificate=true."
}

$sslMode = (($ConnectionString -split ';' | Where-Object { $_ -match '(?i)^\s*SSL\s*Mode\s*=' } | Select-Object -First 1) -split '=', 2)[1].Trim()
if ($sslMode -ne "VerifyFull") {
    throw "Backup connection must use SSL Mode=VerifyFull."
}

New-Item -ItemType Directory -Force -Path $OutputDirectory | Out-Null
$stamp = Get-Date -Format "yyyyMMdd-HHmmss"
$outputFile = Join-Path $OutputDirectory "warehouse-$stamp.sql"
$parts = @{}
foreach ($segment in ($ConnectionString -split ';')) {
    if ($segment -match '^\s*([^=]+?)\s*=\s*(.*?)\s*$') {
        $parts[$matches[1].Trim().ToLowerInvariant()] = $matches[2].Trim()
    }
}

foreach ($required in @('host', 'port', 'database', 'username', 'password')) {
    if (-not $parts.ContainsKey($required) -or [string]::IsNullOrWhiteSpace($parts[$required])) {
        throw "Backup connection is missing '$required'."
    }
}

$rootCertificate = $parts['root certificate']
if ([string]::IsNullOrWhiteSpace($rootCertificate)) {
    throw "Backup connection must include Root Certificate when SSL Mode=VerifyFull."
}

$pgDump = Get-Command pg_dump -ErrorAction SilentlyContinue
if (-not $pgDump) {
    throw "pg_dump is required for a least-privilege backup role. Install the PostgreSQL client or run this script in the approved backup container."
}

$query = "sslmode=verify-full&sslrootcert=$([Uri]::EscapeDataString($rootCertificate))"
$dbUrl = "postgresql://$([Uri]::EscapeDataString($parts['username']))@$($parts['host']):$($parts['port'])/$([Uri]::EscapeDataString($parts['database']))?$query"
$previousPassword = $env:PGPASSWORD
try {
    $env:PGPASSWORD = $parts['password']
    & $pgDump.Source --dbname=$dbUrl --schema=public --format=plain --no-owner --no-acl --file=$outputFile
}
finally {
    $env:PGPASSWORD = $previousPassword
}
if ($LASTEXITCODE -ne 0) { throw "Supabase backup failed." }

Write-Host "Backup created at $outputFile. Store it in approved encrypted backup storage; do not commit it."
