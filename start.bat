@echo off
echo =============================================
echo   Survey Calculator App - Startup
echo =============================================
echo.
echo Prerequisites:
echo 1. PostgreSQL running on localhost:5432
echo 2. Database 'survey_app' created
echo 3. Node.js installed
echo.
echo Starting backend server...
start "Survey Backend" cmd /c "cd /d "%~dp0backend" && npm run dev"
echo Backend starting on http://localhost:5000
echo.
timeout /t 3 /nobreak >nul
echo Starting frontend...
start "Survey Frontend" cmd /c "cd /d "%~dp0frontend" && npm run dev"
echo Frontend starting on http://localhost:3000
echo.
echo =============================================
echo   Open http://localhost:3000 in your browser
echo =============================================
pause
