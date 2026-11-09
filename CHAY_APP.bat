@echo off
chcp 65001 > nul
title TRÍ AI SALES ROBOT - GIAO DIỆN BÁN HÀNG HUMANOID AI 3D
echo ========================================================================
echo   🤖 KHỞI CHẠY HỆ THỐNG TRÍ AI HUMANOID SALES BOT (PROMPT 08)
echo ========================================================================
echo.
echo [1/3] Kiểm tra dependencies...
if not exist node_modules (
    echo Đang cài đặt thư viện...
    call npm install
)

echo [2/3] Kiểm tra bản build giao diện Frontend...
if not exist dist (
    echo Đang build giao diện web...
    call npm run build
)

echo [3/3] Khởi chạy Server Backend & Fullstack Interface tại http://localhost:5000...
echo.
start http://localhost:5000
node server/index.js
pause
