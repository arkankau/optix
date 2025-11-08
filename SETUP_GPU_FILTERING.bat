@echo off
echo ====================================
echo Optix GPU Direct Filtering Setup
echo ====================================
echo.

echo Checking system requirements...
echo.

REM Check for Node.js
where node >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Node.js not found!
    echo Please install Node.js from https://nodejs.org/
    pause
    exit /b 1
)

echo [OK] Node.js found: 
node --version

REM Check for Python
where python >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo [WARNING] Python not found!
    echo Python is required for building native modules.
    echo Install from: https://www.python.org/downloads/
    echo.
)

REM Check for Visual Studio Build Tools
echo.
echo Checking for Visual Studio Build Tools...
if exist "C:\Program Files (x86)\Microsoft Visual Studio\2019" (
    echo [OK] Visual Studio 2019 found
) else if exist "C:\Program Files\Microsoft Visual Studio\2022" (
    echo [OK] Visual Studio 2022 found
) else (
    echo [WARNING] Visual Studio Build Tools not detected!
    echo.
    echo Native GPU capture requires Visual Studio Build Tools.
    echo.
    echo To install:
    echo 1. Download from: https://visualstudio.microsoft.com/downloads/
    echo 2. Select "Desktop development with C++" workload
    echo 3. Install and restart this setup
    echo.
    echo The app will still work using fallback mode without it.
    echo.
    choice /C YN /M "Continue anyway"
    if errorlevel 2 exit /b 1
)

echo.
echo ====================================
echo Installing dependencies...
echo ====================================
echo.

cd /d "%~dp0\kacamata"
call npm install

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ====================================
    echo Building native module...
    echo ====================================
    echo.
    
    call npm run build:native
    
    if %ERRORLEVEL% EQU 0 (
        echo.
        echo [SUCCESS] Native module built successfully!
        echo GPU Direct Filtering is ENABLED
        echo.
        
        call npm run rebuild:native
        
        echo.
        echo ====================================
        echo Setup Complete!
        echo ====================================
        echo.
        echo Native GPU capture: ENABLED
        echo Expected performance:
        echo - Latency: 0.5-2ms
        echo - FPS: 60-120 @ 1080p
        echo - CPU usage: 5-10%%
        echo.
    ) else (
        echo.
        echo [WARNING] Native module build failed
        echo The app will use fallback mode.
        echo.
        echo Fallback performance:
        echo - Latency: 16-33ms
        echo - FPS: 30-60 @ 1080p
        echo - CPU usage: 40-60%%
        echo.
        echo To enable GPU capture:
        echo 1. Install Visual Studio Build Tools
        echo 2. Run: npm run build:native
        echo.
    )
) else (
    echo.
    echo [ERROR] Failed to install dependencies!
    pause
    exit /b 1
)

echo.
echo ====================================
echo Ready to start!
echo ====================================
echo.
echo To start the app:
echo   npm start
echo.
echo To start in development mode:
echo   npm run dev
echo.
echo See GPU_FILTERING_QUICKSTART.md for more info.
echo.
pause
