@echo off
title BarberOS — Sistema de Gestión
echo ========================================================
echo       Iniciando BarberOS para la Barbería...
echo ========================================================
echo.
echo Abriendo en tu navegador: http://localhost:5173
timeout /t 2 /nobreak >nul
start http://localhost:5173
echo.
npm run dev
pause
