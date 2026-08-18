[CmdletBinding()]
param(
    [string]$MigrationDirectory = "supabase/migrations"
)

$ErrorActionPreference = "Stop"
$files = @(Get-ChildItem -LiteralPath $MigrationDirectory -File -Filter "*.sql" | Sort-Object Name)

if ($files.Count -eq 0) {
    throw "No SQL migrations were found in '$MigrationDirectory'."
}

$versions = foreach ($file in $files) {
    if ($file.Name -notmatch '^(?<version>\d{4}|\d{14})_[a-z0-9_]+\.sql$') {
        throw "Invalid migration filename: '$($file.Name)'."
    }

    $version = $Matches.version
    $sql = Get-Content -LiteralPath $file.FullName -Raw
    if ([string]::IsNullOrWhiteSpace($sql)) {
        throw "Migration '$($file.Name)' is empty."
    }
    if ($sql -match '(?m)^(<<<<<<<|=======|>>>>>>>)') {
        throw "Migration '$($file.Name)' contains an unresolved merge marker."
    }
    if ($sql -match '(?im)^\s*(CREATE|DROP)\s+DATABASE\b|^\s*\\connect\b') {
        throw "Migration '$($file.Name)' contains a database-level command that is unsafe for project migrations."
    }

    [pscustomobject]@{
        Version = $version
        Name = $file.Name
    }
}

$duplicates = @($versions | Group-Object Version | Where-Object Count -gt 1)
if ($duplicates.Count -gt 0) {
    throw "Duplicate migration version(s): $($duplicates.Name -join ', ')."
}

$legacyVersions = @($versions | Where-Object { $_.Version.Length -eq 4 } | ForEach-Object { [int]$_.Version })
for ($index = 0; $index -lt $legacyVersions.Count; $index++) {
    if ($legacyVersions[$index] -ne ($index + 1)) {
        throw "Legacy migrations must be contiguous from 0001."
    }
}

$timestampVersions = @($versions | Where-Object { $_.Version.Length -eq 14 } | Select-Object -ExpandProperty Version)
if ($timestampVersions.Count -gt 0) {
    $latestVersion = ($timestampVersions | Sort-Object)[-1]
    $latestFile = $files | Where-Object { $_.Name -like "$latestVersion`_*" } | Select-Object -First 1
    $latestSql = Get-Content -LiteralPath $latestFile.FullName -Raw
    if ($latestSql -notmatch '(?is)app_schema_version' -or $latestSql -notmatch [regex]::Escape($latestVersion)) {
        throw "Latest migration '$($latestFile.Name)' must update public.app_schema_version to '$latestVersion'."
    }
    $settingsFiles = @(
        "src/WarehouseApp.Api/appsettings.json",
        "src/WarehouseApp.Desktop/appsettings.json"
    )

    foreach ($settingsFile in $settingsFiles) {
        $settings = Get-Content -LiteralPath $settingsFile -Raw | ConvertFrom-Json
        $requiredVersion = $settings.DatabaseReadiness.RequiredSchemaVersion
        if ($requiredVersion -ne $latestVersion) {
            throw "'$settingsFile' requires schema '$requiredVersion', but latest migration is '$latestVersion'."
        }
    }
}

Write-Host "Migration consistency passed for $($files.Count) files."
