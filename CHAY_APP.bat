@echo off
chcp 65001 > nul
title TRÍ AI ONE SUPER BRAIN - NỀN TẢNG TRÍ TUỆ NHÂN TẠO TOÀN NĂNG
echo ========================================================================
echo   🧠 KHỞI CHẠY TRÍ AI ONE SUPER BRAIN
echo ========================================================================
echo.
echo [1/3] Kiểm tra dependencies...
if not exist node_modules (
    echo Đang cài đặt thư viện...
    call npm install
)

echo [2/3] Đồng bộ giao diện Frontend mới nhất...
call npm run build

echo [3/3] Khởi chạy Server Backend & Fullstack Interface tại http://localhost:5000...
echo.
start http://localhost:5000
node server/index.js
pause
