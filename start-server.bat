@echo off
setlocal ENABLEDELAYEDEXPANSION

:: 使用 UTF-8 显示中文
chcp 65001 >nul 2>&1
title HiZoo 开发服务器

:: 切到当前脚本所在目录（项目根目录）
cd /d %~dp0

echo =========================================
echo   HiZoo 开发服务器启动脚本
echo   Node 服务（前端静态页 + API）
echo =========================================
echo.

:: 默认使用 3000 端口，如有需要可自行修改
set "PORT=3000"
set "PID="

echo [检查] 使用 netstat 检查端口 %PORT% 是否被占用...
for /f "tokens=5" %%p in ('netstat -ano -p tcp ^| findstr ":%PORT%" ^| findstr "LISTENING"') do (
    set PID=%%p
)

if defined PID (
    echo [警告] 端口 %PORT% 当前被进程 PID=%PID% 占用，尝试强制结束该进程...
    taskkill /PID %PID% /F >nul 2>&1
)

:: 简单复查一次端口是否仍被占用（只提示，不再阻塞）
set "PID="
for /f "tokens=5" %%p in ('netstat -ano -p tcp ^| findstr ":%PORT%" ^| findstr "LISTENING"') do (
    set PID=%%p
)
if defined PID (
    echo [提示] 端口 %PORT% 仍然被 PID=%PID% 占用，请手动释放后重试。
    goto :EOF
) else (
    echo [OK] 端口 %PORT% 已空闲，准备启动服务器...
)

echo.
echo [启动] 正在启动 HiZoo 后端服务：http://localhost:%PORT%

:: 进入 backend 目录并启动 Node 服务器
cd /d "%~dp0backend"
call npm start

endlocal


