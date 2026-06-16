@echo off
REM Abre o editor web localmente (so neste PC). Fecha a janela pra parar.
cd /d "%~dp0"
start "" http://localhost:4173
npm run dev
