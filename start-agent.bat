@echo off
setlocal enabledelayedexpansion

:: PDF Paginator Agent - Remote Control Server
:: ===========================================

echo.
echo ========================================
echo    PDF Paginator Agent
echo    Remote Control Server
echo ========================================
echo.

:: Check if Node.js is installed
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo ERROR: Node.js is not installed or not in PATH
    echo Please install Node.js from https://nodejs.org/
    echo.
    pause
    exit /b 1
)

:: Check if dependencies are installed
if not exist "node_modules\" (
    echo Installing dependencies...
    echo This may take a few minutes...
    echo.
    call npm install
    if %errorlevel% neq 0 (
        echo.
        echo ERROR: Failed to install dependencies
        pause
        exit /b 1
    )
    echo.
    echo Dependencies installed successfully!
    echo.
)

:: Check if template exists
if not exist "Header and Footer Template.png" (
    echo WARNING: Template file not found!
    echo Please make sure "Header and Footer Template.png" is in this directory.
    echo.
)

:: Check if fonts exist
if not exist "fonts\Roboto-Regular.ttf" (
    echo WARNING: Roboto font not found!
    echo Please make sure the fonts directory exists with required fonts.
    echo.
)

:: Display startup information
echo Starting PDF Paginator Agent...
echo.
echo ========================================
echo   IMPORTANT INFORMATION
echo ========================================
echo.
echo The agent will start a local server that
echo allows you to control PDF generation
echo from any device via web browser.
echo.
echo Once started:
echo   1. Copy the API KEY shown below
echo   2. Open the web interface in your browser
echo   3. Enter the API key to connect
echo   4. Upload files and generate PDFs remotely
echo.
echo The web interface can be accessed from:
echo   - This computer: http://localhost:3838
echo   - Other devices: Use this computer's IP address
echo.
echo Press Ctrl+C to stop the agent at any time.
echo.
echo ========================================
echo.
pause

:: Start the agent
node agent.js

:: If agent stops, pause to show any error messages
echo.
echo.
echo Agent has stopped.
pause
