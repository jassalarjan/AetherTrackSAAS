@echo off
echo Stopping backend server...
taskkill /F /IM node.exe /FI "WINDOWTITLE eq backend*" 2>nul
timeout /t 2 /nobreak >nul

echo Starting backend server...
cd backend
start "backend" cmd /k "npm run dev"

echo Backend restarted!
pause
