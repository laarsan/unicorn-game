@echo off
chcp 65001 >nul
rem Regnbågsgaloppen – starta spelet.
rem Startar den lokala servern, som själv öppnar spelfönstret och stänger
rem sig när spelet avslutas. Kräver bara Node.js.
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Node.js hittades inte. Installera från https://nodejs.org och försök igen.
  pause
  exit /b 1
)
start "Regnbågsgaloppen" /min node server.js
