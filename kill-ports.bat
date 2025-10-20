@echo off
setlocal enabledelayedexpansion
echo Killing processes on ports 3000 and 5000...

echo.
echo Checking port 3000...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :3000') do (
    set pid=%%a
    if not "!pid!"=="0" (
        echo Found process !pid! on port 3000
        taskkill /F /PID !pid!
        if !errorlevel! equ 0 (
            echo Successfully killed process !pid! on port 3000
        ) else (
            echo Failed to kill process !pid! on port 3000
        )
    )
)

echo.
echo Checking port 5000...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :5000') do (
    set pid=%%a
    if not "!pid!"=="0" (
        echo Found process !pid! on port 5000
        taskkill /F /PID !pid!
        if !errorlevel! equ 0 (
            echo Successfully killed process !pid! on port 5000
        ) else (
            echo Failed to kill process !pid! on port 5000
        )
    )
)

echo.
echo Done! Ports 3000 and 5000 should now be free.
pause
