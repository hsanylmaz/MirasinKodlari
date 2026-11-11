@echo off
chcp 65001 >nul
title Mirasin Kodlari - Yesil Perde (Chroma Key) Fotograf Studyosu
echo ============================================================
echo   MIRASIN KODLARI - YESIL PERDE FOTOGRAF STUDYOSU BASLATILIYOR
echo ============================================================
echo.
echo [1/2] TypeScript derleniyor...
call npm run build
echo.
echo [2/2] Tarayici aciliyor ve sunucu baslatiliyor...
start "" "http://localhost:3000"
node dist/server.js
pause
