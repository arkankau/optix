@echo off
echo ========================================
echo   Clarity - GPU Overlay Quick Start
echo ========================================
echo.

cd /d "%~dp0kacamata"

if not exist "node_modules" (
    echo Installing dependencies...
    call npm install
    if errorlevel 1 (
        echo ERROR: npm install failed
        pause
        exit /b 1
    )
)

echo.
echo Building application...
call npm run build
if errorlevel 1 (
    echo ERROR: Build failed
    pause
    exit /b 1
)

echo.
echo Starting Clarity in Overlay Mode...
echo.
echo Hotkeys:
echo   Ctrl+Shift+O - Toggle overlay
echo   Ctrl+Shift+C - Open control panel
echo.

call npm start

pause
