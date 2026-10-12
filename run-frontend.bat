@echo off
title PulseLife Blood Bank - Frontend UI
echo ========================================================
echo   Starting PulseLife Blood Bank Frontend Server
echo ========================================================
echo.
echo   Opening in web browser: http://localhost:3000
echo   Connecting to Backend API at http://localhost:8080
echo.
start http://localhost:3000
node server.js
pause
