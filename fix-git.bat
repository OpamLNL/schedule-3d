@echo off
chcp 65001 >nul
echo.
echo === Виправлення Git для schedule-3d ===
echo Закрийте WebStorm перед запуском!
echo.
pause
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\fix-git.ps1"
echo.
pause
