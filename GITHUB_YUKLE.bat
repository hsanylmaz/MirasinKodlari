@echo off
chcp 65001 >nul
title Mirasin Kodlari - GitHub Pages Guncelleme ve Yukleme
echo ============================================================
echo   MIRASIN KODLARI - GITHUB PAGES YAYINLAMA ARACI
echo ============================================================
echo.
echo [1/3] arkaplanlar/ klasoru taraniyor ve statik paket hazirlaniyor...
call npm run build
echo.
echo [2/3] Degisiklikler Git'e kaydediliyor...
git config user.name "hsanylmaz"
git config user.email "hsanylmaz@users.noreply.github.com"
git add .
git commit -m "Arka planlar ve studyo guncellendi"
echo.
echo [3/3] GitHub'a (https://github.com/hsanylmaz/MirasinKodlari) gonderiliyor...
git push -u origin main
echo.
echo ============================================================
echo   ISLEM TAMAMLANDI!
echo   Canli Adresiniz: https://hsanylmaz.github.io/MirasinKodlari/
echo ============================================================
pause
