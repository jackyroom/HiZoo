@echo off
title HiZoo Backend Starter

echo ===============================
echo  HiZoo backend start script
echo  Current directory: %CD%
echo ===============================
echo.

rem Change to backend directory
cd /d "%~dp0backend"

echo [INFO] Switched to: %CD%
echo.
echo If any error appears below (npm not installed, missing deps, etc.)
echo this window will stay open. Please copy or screenshot the message.
echo.
pause

rem Install dependencies if node_modules is missing
if not exist "node_modules" (
    echo [INSTALL] node_modules not found, running npm install ...
    npm install
)

echo.
echo [START] running: npm start
npm start

echo.
echo ===============================
echo  npm start has exited (success or error)
echo  Please review the log above.
echo ===============================
echo.
echo Press any key to close this window...
pause




