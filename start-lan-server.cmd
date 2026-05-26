@echo off
setlocal
cd /d "%~dp0"
if not exist "package.json" (
  echo Bu klasorde package.json bulunamadi.
  echo Dogru klasorde calistirdigindan emin ol.
  pause
  exit /b 1
)
if not exist "node_modules\" (
  npm install
  if errorlevel 1 (
    pause
    exit /b 1
  )
)
npm run lan
