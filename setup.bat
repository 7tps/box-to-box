@echo off
REM Box-to-Box Setup Script for Windows
REM This script automates the initial setup process

echo Setting up Box-to-Box Soccer Validation Game...
echo.

REM Check Node.js installation
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo Node.js is not installed. Please install Node.js 16.x or higher.
    exit /b 1
)

echo Node.js detected
echo.

REM Install root dependencies
echo Installing root dependencies...
call npm install
if %ERRORLEVEL% NEQ 0 (
    echo Failed to install root dependencies
    exit /b 1
)
echo Root dependencies installed
echo.

REM Install frontend dependencies
echo Installing frontend dependencies...
cd frontend
call npm install
if %ERRORLEVEL% NEQ 0 (
    echo Failed to install frontend dependencies
    exit /b 1
)
cd ..
echo Frontend dependencies installed
echo.

REM Create .env file if it doesn't exist
if not exist .env (
    echo Creating .env file...
    (
        echo # Server Configuration
        echo PORT=5000
        echo.
        echo # Data Source ^(wikidata, local, or api^)
        echo DATA_SOURCE=wikidata
        echo.
        echo # Optional: Commercial API Keys
        echo # API_FOOTBALL_KEY=your_api_key_here
        echo # SPORTMONKS_KEY=your_api_key_here
        echo.
        echo # Optional: Local database path
        echo # LOCAL_DB_PATH=./data/football.db
    ) > .env
    echo .env file created
) else (
    echo .env file already exists, skipping...
)
echo.

REM Success message
echo Setup complete!
echo.
echo To start the application:
echo   npm run dev
echo.
echo Then open http://localhost:3000 in your browser
echo.
echo For more information, see README.md
pause

