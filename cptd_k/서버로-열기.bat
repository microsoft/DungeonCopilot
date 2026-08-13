@echo off
chcp 65001 >nul
title 코파일럿 타워디펜스 - 로컬 서버
cd /d "%~dp0"
echo.
echo   코파일럿 타워디펜스
echo   ------------------------------------
echo   로컬 서버를 시작합니다.
echo   브라우저가 자동으로 열립니다.
echo.
echo   게임을 끝내려면 이 창을 닫으세요.
echo.
where python >nul 2>nul
if %errorlevel%==0 (
    start "" http://localhost:8861/index.html
    python -m http.server 8861
    goto :eof
)
where py >nul 2>nul
if %errorlevel%==0 (
    start "" http://localhost:8861/index.html
    py -m http.server 8861
    goto :eof
)
where npx >nul 2>nul
if %errorlevel%==0 (
    start "" http://localhost:8861/index.html
    npx --yes http-server -p 8861
    goto :eof
)
echo   [오류] Python 또는 Node.js가 필요합니다.
echo   둘 중 하나를 설치한 뒤 다시 실행하세요.
echo.
pause