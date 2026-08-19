# E2E smoke tests

The smoke suite is intended for an already-running staging deployment. It requires:

- `E2E_BASE_URL`
- `E2E_USERNAME`
- `E2E_PASSWORD`

Run it only against staging, never against production data. The suite must cover login,
password-change handling, dashboard, inventory, invoice, report and logout. A run is valid
only when the test report is retained as a CI artifact.
