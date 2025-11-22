#!/usr/bin/env python3
"""
将 University of Iowa AIFF 采样转换为 MP3 格式
需要安装 pydub 和 ffmpeg
"""

import os
import sys
from pathlib import Path

try:
    from pydub import AudioSegment
except ImportError:
    print("错误：需要安装 pydub")
    print("运行：pip install pydub")
    sys.exit(1)

# 检查 ffmpeg
try:
    AudioSegment.converter
except:
    print("错误：需要安装 ffmpeg")
    print("Windows: 下载 https://ffmpeg.org/download.html")
    print("Mac: brew install ffmpeg")
    print("Linux: sudo apt install ffmpeg")
    sys.exit(1)

input_dir = Path("piano-samples-iowa")
output_dir = Path("piano-samples")
output_dir.mkdir(exist_ok=True)

def convert_to_mp3(aiff_file, mp3_file):
    """转换 AIFF 到 MP3"""
    try:
        audio = AudioSegment.from_file(aiff_file, format="aiff")
        # 导出为高质量 MP3（320kbps）
        audio.export(mp3_file, format="mp3", bitrate="320k")
        return True
    except Exception as e:
        print(f"转换失败: {e}")
        return False

def main():
    if not input_dir.exists():
        print(f"错误：找不到输入目录 {input_dir}")
        print("请先运行 download-iowa-samples.py")
        sys.exit(1)
    
    aiff_files = list(input_dir.glob("*.aiff"))
    if not aiff_files:
        print(f"错误：{input_dir} 中没有 AIFF 文件")
        sys.exit(1)
    
    total = len(aiff_files)
    success = 0
    
    print(f"开始转换 {total} 个 AIFF 文件到 MP3")
    print(f"输入目录: {input_dir.absolute()}")
    print(f"输出目录: {output_dir.absolute()}")
    print("-" * 50)
    
    for i, aiff_file in enumerate(aiff_files, 1):
        note_name = aiff_file.stem
        mp3_file = output_dir / f"{note_name}.mp3"
        
        print(f"[{i}/{total}] {note_name}...", end=" ")
        if convert_to_mp3(aiff_file, mp3_file):
            print("✓")
            success += 1
        else:
            print("✗")
    
    print("-" * 50)
    print(f"转换完成！成功: {success}/{total}")
    
    if success == total:
        print("\n✅ 所有文件转换成功！")
        print(f"MP3 文件位于: {output_dir.absolute()}")
        print("\n下一步：刷新浏览器，游戏将自动使用新音色")

if __name__ == "__main__":
    main()
