@echo off
echo ========================================
echo   Starting MFP Application
echo ========================================
echo.
echo Starting Admin Server (Port 3001)...
start "MFP Admin Server" cmd /k "cd /d %~dp0 && npm run admin-server"
timeout /t 3 /nobreak >nul

echo Starting Main Application (Port 5173)...
start "MFP Main App" cmd /k "cd /d %~dp0 && npm run dev"

echo.
echo ========================================
echo   Both servers started!
echo ========================================
echo.
echo   Main App: http://localhost:5173
echo   Admin Panel: http://localhost:5173/admin
echo.
echo Press any key to exit this window...
pause >nul
