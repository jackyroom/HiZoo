@echo off
chcp 65001 >nul
echo ========================================
echo   CYBER VAULT - Local Development Server
echo ========================================
echo.
echo 正在启动 HTTP 服务器...
echo.

REM 检查端口是否被占用
netstat -ano | findstr :8000 >nul
if %errorlevel% == 0 (
    echo 警告: 端口 8000 已被占用，正在尝试停止占用该端口的进程...
    for /f "tokens=5" %%a in ('netstat -ano ^| findstr :8000 ^| findstr LISTENING') do (
        taskkill /F /PID %%a >nul 2>&1
    )
    timeout /t 2 /nobreak >nul
)

echo 服务器地址: http://localhost:8000
echo 服务器地址: http://127.0.0.1:8000
echo.
echo 按 Ctrl+C 停止服务器
echo.
echo 正在启动服务器...
echo.

REM 启动浏览器
start "" "http://localhost:8000"

REM 启动 Python 服务器
python -m http.server 8000
