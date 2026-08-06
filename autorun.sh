#!/bin/bash

# Configuration
FRONTEND_PORT=5173
BACKEND_PORT=5080
FRONTEND_DIR="./web"
BACKEND_DIR="./src/WarehouseApp.Api"

# Function to find and kill process on a specified port
kill_port() {
  local port=$1
  echo -e "\033[1;33m[*] Checking for processes on port $port...\033[0m"
  
  # Find PIDs using netstat (Windows format). tr -d '\r' strips carriage returns.
  local pids=$(netstat -ano | grep -i "listening" | grep -i ":$port" | awk '{print $5}' | tr -d '\r' | sort -u)
  
  if [ -n "$pids" ]; then
    for pid in $pids; do
      if [[ "$pid" =~ ^[0-9]+$ ]] && [ "$pid" -ne 0 ]; then
        echo -e "\033[1;31m[!] Found process $pid on port $port. Killing it...\033[0m"
        # taskkill with double-slashes to prevent Git Bash from converting flags to paths
        taskkill //F //PID "$pid" 2>/dev/null || kill -9 "$pid" 2>/dev/null
      fi
    done
  else
    # Fallback check for active/established connections
    pids=$(netstat -ano | grep -i ":$port" | awk '{print $5}' | tr -d '\r' | sort -u)
    if [ -n "$pids" ]; then
      for pid in $pids; do
        if [[ "$pid" =~ ^[0-9]+$ ]] && [ "$pid" -ne 0 ]; then
          echo -e "\033[1;31m[!] Found process $pid on port $port. Killing it...\033[0m"
          taskkill //F //PID "$pid" 2>/dev/null || kill -9 "$pid" 2>/dev/null
        fi
      done
    else
      echo -e "\033[1;32m[✓] Port $port is free.\033[0m"
    fi
  fi
}

# 1. Kill existing processes on the ports
kill_port $FRONTEND_PORT
kill_port $BACKEND_PORT

# 1b. Preflight: warn if the dev DB connection string is missing or still a placeholder
#     (backend would return 500 on every DB call: login, lists, pricing).
APPSETTINGS="./src/WarehouseApp.Api/appsettings.Development.json"
if ! grep -q '"ConnectionStrings"' "$APPSETTINGS" 2>/dev/null; then
  echo -e "\033[1;31m[!] $APPSETTINGS has no ConnectionStrings — DB calls (login, lists, pricing) will fail.\033[0m"
elif grep -qE '<db-password>|<project-ref>|<region>' "$APPSETTINGS" 2>/dev/null; then
  echo -e "\033[1;31m[!] $APPSETTINGS still has a PLACEHOLDER connection string — put the real Supabase pooler string in it.\033[0m"
fi

# PIDs of background processes
BACKEND_PID=""
FRONTEND_PID=""

# Cleanup function when Ctrl+C is pressed
cleanup() {
  echo -e "\n\033[1;31m[*] Stopping all frontend and backend processes...\033[0m"
  [ -n "$BACKEND_PID" ] && kill $BACKEND_PID 2>/dev/null
  [ -n "$FRONTEND_PID" ] && kill $FRONTEND_PID 2>/dev/null
  
  # Wait for them to exit
  wait $BACKEND_PID $FRONTEND_PID 2>/dev/null
  
  # Force clean ports if any process lingered
  kill_port $FRONTEND_PORT
  kill_port $BACKEND_PORT
  echo -e "\033[1;32m[✓] All processes stopped successfully!\033[0m"
  exit 0
}

# Trap SIGINT (Ctrl+C) and SIGTERM
trap cleanup SIGINT SIGTERM

# 2. Start Backend
echo -e "\033[1;34m[*] Starting Backend in $BACKEND_DIR...\033[0m"
cd "$BACKEND_DIR" || exit 1
dotnet run --launch-profile http &
BACKEND_PID=$!
echo -e "\033[1;32m[✓] Backend started in background with PID: $BACKEND_PID\033[0m"

# Return to root
cd - > /dev/null || exit 1

# 3. Start Frontend
echo -e "\033[1;34m[*] Starting Frontend in $FRONTEND_DIR...\033[0m"
cd "$FRONTEND_DIR" || exit 1
npm run dev &
FRONTEND_PID=$!
echo -e "\033[1;32m[✓] Frontend started in background with PID: $FRONTEND_PID\033[0m"

# Return to root
cd - > /dev/null || exit 1

# Try to refresh an already-open frontend tab (Chrome/Edge) instead of opening a new one.
# Only detects the tab if it is the currently active tab in its window (Windows UI
# Automation cannot read background tab URLs without enabling remote debugging).
refresh_frontend_tab() {
  local port=$1
  powershell.exe -NoProfile -ExecutionPolicy Bypass -Command "
    Add-Type -AssemblyName UIAutomationClient, UIAutomationTypes, System.Windows.Forms
    Add-Type @'
using System;
using System.Runtime.InteropServices;
using System.Text;
public class Win32Refresh {
    public delegate bool EnumWindowsProc(IntPtr hWnd, IntPtr lParam);
    [DllImport(\"user32.dll\")] public static extern bool EnumWindows(EnumWindowsProc enumProc, IntPtr lParam);
    [DllImport(\"user32.dll\")] public static extern bool IsWindowVisible(IntPtr hWnd);
    [DllImport(\"user32.dll\")] public static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint processId);
    [DllImport(\"user32.dll\")] public static extern bool SetForegroundWindow(IntPtr hWnd);
    [DllImport(\"user32.dll\")] public static extern bool ShowWindow(IntPtr hWnd, int nCmdShow);
}
'@
    \$targetPort = '$port'
    \$found = \$false
    \$callback = {
      param(\$hWnd, \$lParam)
      if (-not [Win32Refresh]::IsWindowVisible(\$hWnd)) { return \$true }
      \$procId = 0
      [Win32Refresh]::GetWindowThreadProcessId(\$hWnd, [ref]\$procId) | Out-Null
      try { \$proc = Get-Process -Id \$procId -ErrorAction Stop } catch { return \$true }
      if (\$proc.ProcessName -notin @('chrome','msedge')) { return \$true }
      try {
        \$el = [System.Windows.Automation.AutomationElement]::FromHandle(\$hWnd)
        \$editCond = New-Object System.Windows.Automation.PropertyCondition([System.Windows.Automation.AutomationElement]::ControlTypeProperty, [System.Windows.Automation.ControlType]::Edit)
        \$edits = \$el.FindAll([System.Windows.Automation.TreeScope]::Descendants, \$editCond)
        foreach (\$edit in \$edits) {
          \$valPattern = \$null
          if (\$edit.TryGetCurrentPattern([System.Windows.Automation.ValuePattern]::Pattern, [ref]\$valPattern)) {
            \$text = \$valPattern.Current.Value
            if (\$text -like \"*:\$targetPort*\") {
              [Win32Refresh]::ShowWindow(\$hWnd, 9) | Out-Null
              [Win32Refresh]::SetForegroundWindow(\$hWnd) | Out-Null
              Start-Sleep -Milliseconds 200
              [System.Windows.Forms.SendKeys]::SendWait('{F5}')
              \$script:found = \$true
              return \$false
            }
          }
        }
      } catch {}
      return \$true
    }
    [Win32Refresh]::EnumWindows(\$callback, [IntPtr]::Zero) | Out-Null
    if (\$found) { Write-Output 'REFRESHED' } else { Write-Output 'NOTFOUND' }
  " 2>/dev/null | tr -d '\r'
}

# Open browser to frontend port in the background after a brief delay
(
  sleep 1.5
  echo -e "\033[1;36m[*] Looking for an existing frontend tab to refresh...\033[0m"
  RESULT=$(refresh_frontend_tab $FRONTEND_PORT)
  if [ "$RESULT" = "REFRESHED" ]; then
    echo -e "\033[1;32m[✓] Refreshed existing tab on http://localhost:$FRONTEND_PORT\033[0m"
  else
    echo -e "\033[1;36m[*] No existing tab found. Opening browser to http://localhost:$FRONTEND_PORT...\033[0m"
    start "http://localhost:$FRONTEND_PORT" 2>/dev/null || cmd.exe /c start "http://localhost:$FRONTEND_PORT" 2>/dev/null || explorer "http://localhost:$FRONTEND_PORT" 2>/dev/null
  fi
) &

echo -e "\033[1;35m==================================================\033[0m"
echo -e "\033[1;32m[✓] Both applications started successfully!\033[0m"
echo -e "\033[1;36m- Frontend PID: $FRONTEND_PID (Port: $FRONTEND_PORT)\033[0m"
echo -e "\033[1;36m- Backend PID: $BACKEND_PID (Port: $BACKEND_PORT)\033[0m"
echo -e "\033[1;33m[*] Press [Ctrl + C] to stop all servers.\033[0m"
echo -e "\033[1;35m==================================================\033[0m"

# Keep the script running to monitor children and handle trap
wait

