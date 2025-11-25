@echo off
setlocal enabledelayedexpansion

:: PDF Paginator - Easy Document Creation
:: =====================================

echo.
echo ========================================
echo    PDF Paginator - Document Creator
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
    echo ERROR: Template file not found!
    echo Please make sure "Header and Footer Template.png" is in this directory.
    echo.
    pause
    exit /b 1
)

:: Prompt for document title
echo Please enter the document title:
echo Example: LINGUA PORTUGUESA
echo.
set /p "TITLE=Title: "

:: Check if title was provided
if "!TITLE!"=="" (
    echo.
    echo ERROR: Title cannot be empty
    echo.
    pause
    exit /b 1
)

:: Run the paginator script
echo.
echo Processing pages...
echo.
node paginator.js "!TITLE!"

:: Check if script succeeded
if %errorlevel% neq 0 (
    echo.
    echo ERROR: PDF generation failed
    echo.
    pause
    exit /b 1
)

:: Success message
echo.
echo ========================================
echo    PDF Generated Successfully!
echo ========================================
echo.
echo Output file: final_document.pdf
echo.
echo Opening PDF...
start "" "final_document.pdf"

echo.
pause
