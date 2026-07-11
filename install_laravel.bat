@echo off
cd /d "d:\خالو عاطف\NewStock"

echo ================================================
echo تثبيت Laravel 11
echo ================================================
echo.

echo جاري تثبيت Laravel...
composer create-project laravel/laravel Backend

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ================================================
    echo تم تثبيت Laravel بنجاح!
    echo ================================================
    echo.
    
    cd Backend
    
    echo نسخ ملف .env...
    copy .env.example .env
    
    echo توليد مفتاح التطبيق...
    php artisan key:generate
    
    echo.
    echo ================================================
    echo الخطوات التالية:
    echo 1. قم بتعديل ملف .env وإعداد قاعدة البيانات
    echo 2. قم بتشغيل: php artisan migrate
    echo 3. قم بتشغيل: php artisan serve
    echo ================================================
) else (
    echo.
    echo ================================================
    echo فشل التثبيت! يرجى التأكد من:
    echo 1. تم حل مشكلة OpenSSL (شغل fix_php_openssl.bat أولاً)
    echo 2. الاتصال بالإنترنت متاح
    echo ================================================
)

pause
