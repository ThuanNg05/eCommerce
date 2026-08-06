#!/usr/bin/env bash
#
# run.sh — start the local dev stack (backend API + frontend Vite) together.
#   Backend  ASP.NET Core -> http://localhost:5080  (Development env; reads appsettings.Development.json)
#   Frontend Vite          -> http://localhost:5173  (proxies /api -> :5080)
#
# Usage:  ./run.sh          (Git Bash on Windows, or WSL / macOS / Linux)
# Stop:   Ctrl+C            (stops both)
#
# Note: make sure nothing else is already using port 5080 before starting.
#
set -o pipefail
root="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# First run: install web dependencies if missing.
if [ ! -d "$root/web/node_modules" ]; then
  echo "[run] Installing web dependencies (first run, may take a minute)..."
  ( cd "$root/web" && npm install )
fi

back_pid=""
front_pid=""
cleanup() {
  echo ""
  echo "[run] Stopping..."
  [ -n "$front_pid" ] && kill "$front_pid" 2>/dev/null
  [ -n "$back_pid" ] && kill "$back_pid" 2>/dev/null
  exit 0
}
trap cleanup INT TERM

open_url() {
  if command -v cmd.exe >/dev/null 2>&1; then MSYS_NO_PATHCONV=1 cmd.exe /c start "" "$1" >/dev/null 2>&1
  elif command -v xdg-open >/dev/null 2>&1; then xdg-open "$1" >/dev/null 2>&1
  elif command -v open >/dev/null 2>&1; then open "$1" >/dev/null 2>&1
  fi
}

echo "[run] Starting backend  -> http://localhost:5080"
( cd "$root" && exec dotnet run --project src/WarehouseApp.Api --launch-profile http ) &
back_pid=$!

echo "[run] Starting frontend -> http://localhost:5173"
( cd "$root/web" && exec npm run dev ) &
front_pid=$!

# Best-effort: open the app once Vite has had a moment to boot.
( sleep 5; open_url "http://localhost:5173" || true ) &

echo "[run] Running. App: http://localhost:5173 | API health: http://localhost:5080/health | Ctrl+C to stop."
wait
