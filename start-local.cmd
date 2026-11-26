@echo off
setlocal
cd /d "%~dp0"
set "LAB_PYTHON=.venv\Scripts\python.exe"
if not exist "%LAB_PYTHON%" set "LAB_PYTHON=..\rekolt-alert\.venv\Scripts\python.exe"
if not exist "%LAB_PYTHON%" (
    echo Install the backend requirements in a project .venv first.
    pause
    exit /b 1
)
if not exist node_modules\vinext\dist\cli.js (
    call npm ci
    if errorlevel 1 exit /b 1
)
"%LAB_PYTHON%" scripts\start_local.py
if errorlevel 1 pause
