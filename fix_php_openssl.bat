@echo off
echo ================================================
echo تعديل ملف php.ini لحل مشكلة OpenSSL
echo ================================================
echo.

set PHP_INI="C:\Users\ElSakka Group\AppData\Local\Microsoft\WinGet\Packages\PHP.PHP.8.3_Microsoft.Winget.Source_8wekyb3d8bbwe\php.ini"
set EXT_DIR="C:\Users\ElSakka Group\AppData\Local\Microsoft\WinGet\Packages\PHP.PHP.8.3_Microsoft.Winget.Source_8wekyb3d8bbwe\ext"

echo الخطوة 1: إنشاء نسخة احتياطية من php.ini...
copy %PHP_INI% %PHP_INI%.backup
echo تم إنشاء نسخة احتياطية: php.ini.backup
echo.

echo الخطوة 2: تعديل extension_dir في php.ini...
powershell -Command "(Get-Content %PHP_INI%) -replace ';extension_dir = \"ext\"', 'extension_dir = %EXT_DIR%' | Set-Content %PHP_INI%"
echo تم تعديل extension_dir
echo.

echo الخطوة 3: التحقق من التعديل...
php --version
echo.

echo الخطوة 4: التحقق من تحميل OpenSSL...
php -m | findstr openssl
echo.

echo ================================================
echo انتهى! الآن يمكنك تشغيل:
echo composer create-project laravel/laravel Backend
echo ================================================
pause
