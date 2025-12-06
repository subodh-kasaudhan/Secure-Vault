@echo off
echo Starting File Management System...
echo.

echo Starting Backend (Django API)...
start "Backend Server" cmd /k "cd /d %~dp0backend && python manage.py runserver 0.0.0.0:8000"

echo Waiting 5 seconds for backend to start...
timeout /t 5 /nobreak > nul

echo Starting Frontend (React App)...
start "Frontend Server" cmd /k "cd /d %~dp0frontend && npm start"

echo.
echo Services are starting...
echo Backend: http://localhost:8000
echo Frontend: http://localhost:3000
echo.
echo Press any key to exit this script (services will continue running)
pause > nul
