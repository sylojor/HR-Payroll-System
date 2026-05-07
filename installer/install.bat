@echo off
chcp 65001 >nul 2>&1
title نظام الموارد البشرية والرواتب - التثبيت
setlocal enabledelayedexpansion

:: ============================================
:: Installer for HR-Payroll-System
:: ============================================

:: Check for admin rights
net session >nul 2>&1
if %errorLevel% neq 0 (
    echo.
    echo  ╔══════════════════════════════════════════╗
    echo  ║   يرجى تشغيل الملف كمسؤول (Run as Admin)  ║
    echo  ║   Right-click then "Run as administrator" ║
    echo  ╚══════════════════════════════════════════╝
    echo.
    pause
    exit /b 1
)

:: Default installation directory
set "INSTALL_DIR=C:\Program Files\HR-Payroll-System"
set "APP_NAME=نظام الموارد البشرية والرواتب"
set "APP_EXE=HR-Payroll-System.exe"
set "VERSION=1.0.5"

:: ============================================
:: Welcome Screen
:: ============================================
cls
echo.
echo  ╔══════════════════════════════════════════════════╗
echo  ║                                                  ║
echo  ║     نظام الموارد البشرية والرواتب               ║
echo  ║     HR Payroll System v%VERSION%                  ║
echo  ║                                                  ║
echo  ║     مرحباً بك في برنامج التثبيت                 ║
echo  ║                                                  ║
echo  ╚══════════════════════════════════════════════════╝
echo.
echo  سيتم تثبيت البرنامج في:
echo  %INSTALL_DIR%
echo.
echo  اضغط أي مفتاح للمتابعة أو Ctrl+C للإلغاء...
pause >nul

:: ============================================
:: Installation
:: ============================================
cls
echo.
echo  جاري التثبيت...
echo.

:: Create installation directory
if not exist "%INSTALL_DIR%" (
    mkdir "%INSTALL_DIR%"
    echo  [OK] تم إنشاء مجلد التثبيت
) else (
    echo  [!!] مجلد التثبيت موجود مسبقاً
)

:: Copy files
echo  [~~] جاري نسخ الملفات...
xcopy /E /I /Y /Q "%~dp0App\*" "%INSTALL_DIR%\" >nul 2>&1
if %errorLevel% neq 0 (
    echo  [XX] فشل نسخ الملفات!
    pause
    exit /b 1
)
echo  [OK] تم نسخ الملفات بنجاح

:: ============================================
:: Create Shortcuts
:: ============================================
echo  [~~] جاري إنشاء الاختصارات...

:: Desktop shortcut
powershell -Command "$ws = New-Object -ComObject WScript.Shell; $s = $ws.CreateShortcut([Environment]::GetFolderPath('Desktop') + '\%APP_NAME%.lnk'); $s.TargetPath = '%INSTALL_DIR%\%APP_EXE%'; $s.WorkingDirectory = '%INSTALL_DIR%'; $s.Description = '%APP_NAME%'; $s.Save()" 2>nul
echo  [OK] اختصار سطح المكتب

:: Start Menu shortcut
set "START_MENU=%ProgramData%\Microsoft\Windows\Start Menu\Programs"
if not exist "%START_MENU%" mkdir "%START_MENU%"
powershell -Command "$ws = New-Object -ComObject WScript.Shell; $s = $ws.CreateShortcut('%START_MENU%\%APP_NAME%.lnk'); $s.TargetPath = '%INSTALL_DIR%\%APP_EXE%'; $s.WorkingDirectory = '%INSTALL_DIR%'; $s.Description = '%APP_NAME%'; $s.Save()" 2>nul
echo  [OK] اختصار قائمة ابدأ

:: ============================================
:: Create Uninstaller
:: ============================================
echo  [~~] جاري إنشاء أداة الإزالة...

(
echo @echo off
echo chcp 65001 ^>nul 2^>^&1
echo title نظام الموارد البشرية والرواتب - إزالة
echo echo.
echo echo  هل أنت متأكد من إزالة النظام؟
echo echo  اضغط Y للإزالة أو أي مفتاح آخر للإلغاء...
echo set /p confirm=
echo if /i "%%confirm%%" neq "Y" exit /b 0
echo echo.
echo echo  جاري إزالة النظام...
echo taskkill /f /im "%APP_EXE%" ^>nul 2^>^&1
echo rmdir /s /q "%INSTALL_DIR%" ^>nul 2^>^&1
echo del "%%USERPROFILE%%\Desktop\%APP_NAME%.lnk" ^>nul 2^>^&1
echo del "%%ProgramData%%\Microsoft\Windows\Start Menu\Programs\%APP_NAME%.lnk" ^>nul 2^>^&1
echo reg delete "HKLM\SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall\HR-Payroll-System" /f ^>nul 2^>^&1
echo echo.
echo echo  [OK] تمت إزالة النظام بنجاح
echo pause
) > "%INSTALL_DIR%\uninstall.bat"

:: Register in Add/Remove Programs
reg add "HKLM\SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall\HR-Payroll-System" /v "DisplayName" /t REG_SZ /d "%APP_NAME%" /f >nul 2>&1
reg add "HKLM\SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall\HR-Payroll-System" /v "DisplayVersion" /t REG_SZ /d "%VERSION%" /f >nul 2>&1
reg add "HKLM\SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall\HR-Payroll-System" /v "Publisher" /t REG_SZ /d "HR System" /f >nul 2>&1
reg add "HKLM\SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall\HR-Payroll-System" /v "InstallLocation" /t REG_SZ /d "%INSTALL_DIR%" /f >nul 2>&1
reg add "HKLM\SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall\HR-Payroll-System" /v "UninstallString" /t REG_SZ /d "%INSTALL_DIR%\uninstall.bat" /f >nul 2>&1
reg add "HKLM\SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall\HR-Payroll-System" /v "DisplayIcon" /t REG_SZ /d "%INSTALL_DIR%\%APP_EXE%" /f >nul 2>&1
reg add "HKLM\SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall\HR-Payroll-System" /v "NoModify" /t REG_DWORD /d 1 /f >nul 2>&1
reg add "HKLM\SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall\HR-Payroll-System" /v "NoRepair" /t REG_DWORD /d 1 /f >nul 2>&1

echo  [OK] تم تسجيل البرنامج في لوحة التحكم

:: ============================================
:: Done
:: ============================================
cls
echo.
echo  ╔══════════════════════════════════════════════════╗
echo  ║                                                  ║
echo  ║              تم التثبيت بنجاح!                  ║
echo  ║                                                  ║
echo  ║  يمكنك تشغيل البرنامج من:                       ║
echo  ║    - اختصار سطح المكتب                          ║
echo  ║    - قائمة ابدأ                                  ║
echo  ║                                                  ║
echo  ║  لإزالة البرنامج:                               ║
echo  ║    - لوحة التحكم ثم إزالة البرامج               ║
echo  ║    - أو تشغيل uninstall.bat                     ║
echo  ║                                                  ║
echo  ╚══════════════════════════════════════════════════╝
echo.

:: Ask to launch
set /p LAUNCH="هل تريد تشغيل البرنامج الآن؟ (Y/N): "
if /i "%LAUNCH%"=="Y" (
    start "" "%INSTALL_DIR%\%APP_EXE%"
)

exit /b 0
