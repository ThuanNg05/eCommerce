# Restore drill evidence — 2026-08-19

## Scope

- Source: isolated Supabase staging project linked to this repository.
- Backup type: PostgreSQL logical dump of the `public` schema.
- Transport: TLS `VerifyFull` with the Supabase CA certificate.
- Backup role: dedicated `warehouse_backup` login with read-only table/sequence access and backup-only `BYPASSRLS`; the application role was not elevated.
- After the drill, `warehouse_backup` was set to `NOLOGIN` with a null password until an approved backup secret/rotation process is configured.

## Evidence

| Check | Result |
|---|---|
| Dump file | `artifacts/backups/warehouse-staging.sql` |
| Dump size | 332,321 bytes |
| SHA-256 | `7949A5C74EEE107528CA8332A4928E698C69586D7CE0C75F38D7771C2B826D28` |
| Restore target | Local temporary database `warehouse_restore_probe` |
| Schema version rows | 1 |
| Account rows | 2 |
| Invoice rows | 0 |
| Product rows | 826 |
| Result | PASS; temporary restore database was dropped after verification |

The backup artifact is ignored by Git and must be copied to approved encrypted backup
storage according to the retention policy. This drill does not by itself approve a
production RPO/RTO or replace a restore into a separately managed Supabase project.
