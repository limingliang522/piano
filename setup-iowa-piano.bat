@echo off
chcp 65001 >nul
echo ╔══════════════════════════════════════════════════════════╗
echo ║  University of Iowa Piano Samples - 快速设置             ║
echo ║  Steinway 钢琴 - 学术级录音质量                          ║
echo ╚══════════════════════════════════════════════════════════╝
echo.

echo 正在检查 Python...
python --version >nul 2>&1
if errorlevel 1 (
    echo ❌ 错误：未找到 Python
    echo 请先安装 Python: https://www.python.org/downloads/
    pause
    exit /b 1
)

echo ✓ Python 已安装
echo.

echo 正在运行快速设置脚本...
python quick-setup-iowa.py

if errorlevel 1 (
    echo.
    echo ❌ 设置失败，请查看上面的错误信息
    pause
    exit /b 1
)

echo.
echo ╔══════════════════════════════════════════════════════════╗
echo ║  ✅ 设置完成！                                           ║
echo ╚══════════════════════════════════════════════════════════╝
echo.
echo 下一步：
echo 1. 运行 start-server-simple.py 启动服务器
echo 2. 访问 http://localhost:8001
echo 3. 或打开 test-piano-samples.html 测试音色
echo.
pause
