@echo off
rem Startar Node-servern, som i sin tur startar spelet i ett eget fonster.
rem Filen ska bara innehalla ASCII: cmd.exe klarar inte UTF-8 i batchfiler.
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Node.js saknas. Ladda ner det via https://nodejs.org och prova igen.
  pause
  exit /b 1
)
start "" /min node server.js
