@echo off
echo ========================================
echo Stock Manager Database Setup
echo ========================================
echo.

echo Checking MySQL status...
sc query "MySQL" >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    echo [OK] MySQL service found
    sc query "MySQL" | find "RUNNING" >nul
    if %ERRORLEVEL% EQU 0 (
        echo [OK] MySQL is running
    ) else (
        echo [!] MySQL is stopped. Starting...
        net start MySQL
        timeout /t 3 >nul
    )
) else (
    echo [X] MySQL service not found!
    echo.
    echo Please install MySQL or XAMPP first:
    echo   1. XAMPP: https://www.apachefriends.org/download.html
    echo   2. MySQL: https://dev.mysql.com/downloads/mysql/
    echo.
    echo After installation, run this script again.
    pause
    exit /b
)

echo.
echo Setting up database...
cd Backend

echo.
echo [1/3] Generating Prisma Client...
call npx prisma generate

echo.
echo [2/3] Creating database and tables...
call npx prisma db push

echo.
echo [3/3] Adding initial data...
call npx prisma db seed

echo.
echo ========================================
echo Setup Complete!
echo ========================================
echo.
echo Next steps:
echo   1. Start Backend: npm run dev
echo   2. Open Frontend: http://localhost:5173
echo   3. Login: admin@stockmanager.com / Admin@123
echo.
pause
