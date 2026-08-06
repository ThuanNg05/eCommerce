@echo off
REM Double-click to start the eCommerce dev stack (backend API + frontend Vite).
REM Runs run-dev.ps1 next to this file, bypassing the PowerShell execution policy.
powershell -ExecutionPolicy Bypass -NoProfile -File "%~dp0run-dev.ps1"
