#!/usr/bin/env python3
"""
快速设置脚本 - 一键下载并转换 University of Iowa Piano Samples
"""

import subprocess
import sys
import os

def run_command(cmd, description):
    """运行命令并显示进度"""
    print(f"\n{'='*60}")
    print(f"步骤: {description}")
    print(f"{'='*60}\n")
    
    result = subprocess.run(cmd, shell=True)
    if result.returncode != 0:
        print(f"\n❌ 错误：{description} 失败")
        return False
    return True

def check_dependencies():
    """检查依赖"""
    print("检查依赖...")
    
    # 检查 Python
    print(f"✓ Python {sys.version}")
    
    # 检查 pydub
    try:
        import pydub
        print("✓ pydub 已安装")
    except ImportError:
        print("⚠️  pydub 未安装")
        print("正在安装 pydub...")
        if not run_command(f"{sys.executable} -m pip install pydub", "安装 pydub"):
            return False
    
    # 检查 ffmpeg
    result = subprocess.run("ffmpeg -version", shell=True, capture_output=True)
    if result.returncode == 0:
        print("✓ ffmpeg 已安装")
    else:
        print("❌ ffmpeg 未安装")
        print("\n请安装 ffmpeg:")
        print("  Windows: 下载 https://ffmpeg.org/download.html")
        print("  Mac: brew install ffmpeg")
        print("  Linux: sudo apt install ffmpeg")
        return False
    
    return True

def main():
    print("""
╔══════════════════════════════════════════════════════════╗
║  University of Iowa Piano Samples - 快速设置             ║
║  Steinway 钢琴 - 学术级录音质量                          ║
╚══════════════════════════════════════════════════════════╝
    """)
    
    # 检查依赖
    if not check_dependencies():
        print("\n❌ 依赖检查失败，请先安装所需软件")
        sys.exit(1)
    
    # 步骤 1: 下载采样
    if not run_command(f"{sys.executable} download-iowa-samples.py", 
                      "下载 Iowa Piano Samples"):
        sys.exit(1)
    
    # 步骤 2: 转换为 MP3
    if not run_command(f"{sys.executable} convert-iowa-to-mp3.py", 
                      "转换 AIFF 到 MP3"):
        sys.exit(1)
    
    print(f"\n{'='*60}")
    print("✅ 设置完成！")
    print(f"{'='*60}")
    print("\n🎹 University of Iowa Piano Samples 已准备就绪")
    print("📁 MP3 文件位于: piano-samples/")
    print("🎮 刷新浏览器即可使用新音色")
    print("\n音色特点:")
    print("  • Steinway 三角钢琴")
    print("  • 88 个完整音符")
    print("  • 学术级录音质量")
    print("  • 自然、温暖的音色")

if __name__ == "__main__":
    main()
