#!/usr/bin/env python3
"""
Steinway 音色完整转换脚本
- 转换 WAV -> OGG (压缩 85%)
- 保留所有采样（4 力度层 × 2 Round Robin + Release）
- 专业级音质
"""

import os
import subprocess
import shutil
from pathlib import Path

# 配置
SOURCE_DIR = "3832_Steinway_JonMeyer_DecentSampler/Steinway Grand  (DS)/Samples"
OUTPUT_DIR = "piano-samples-steinway-optimized"
QUALITY = 7  # OGG 质量 (0-10, 7 是专业级高质量)

def check_ffmpeg():
    """检查 ffmpeg 是否安装"""
    try:
        subprocess.run(["ffmpeg", "-version"], capture_output=True, check=True)
        return True
    except (subprocess.CalledProcessError, FileNotFoundError):
        return False

def convert_to_ogg(input_path, output_path):
    """转换 WAV 到 OGG"""
    try:
        cmd = [
            "ffmpeg",
            "-i", str(input_path),
            "-c:a", "libvorbis",
            "-q:a", str(QUALITY),
            "-y",  # 覆盖已存在文件
            str(output_path)
        ]
        subprocess.run(cmd, capture_output=True, check=True)
        return True
    except subprocess.CalledProcessError as e:
        print(f"❌ 转换失败: {input_path.name}")
        print(f"   错误: {e.stderr.decode()}")
        return False

def get_file_size_mb(path):
    """获取文件大小（MB）"""
    return os.path.getsize(path) / (1024 * 1024)

def main():
    print("🎹 Steinway 音色完整转换工具")
    print("=" * 50)
    
    # 检查 ffmpeg
    if not check_ffmpeg():
        print("❌ 错误: 未找到 ffmpeg")
        print("请安装 ffmpeg:")
        print("  Windows: choco install ffmpeg")
        print("  或下载: https://ffmpeg.org/download.html")
        return
    
    print("✅ ffmpeg 已安装")
    
    # 检查源目录
    source_path = Path(SOURCE_DIR)
    if not source_path.exists():
        print(f"❌ 错误: 源目录不存在: {SOURCE_DIR}")
        return
    
    # 创建输出目录
    output_path = Path(OUTPUT_DIR)
    output_path.mkdir(exist_ok=True)
    print(f"✅ 输出目录: {OUTPUT_DIR}")
    
    # 获取所有 WAV 文件
    wav_files = sorted(source_path.glob("*.wav"))
    total_files = len(wav_files)
    
    if total_files == 0:
        print("❌ 错误: 未找到 WAV 文件")
        return
    
    # 统计
    converted = 0
    failed = 0
    total_size_before = 0
    total_size_after = 0
    
    print(f"\n开始转换 {total_files} 个文件...")
    print("-" * 50)
    
    # 转换所有文件
    for i, input_file in enumerate(wav_files, 1):
        output_file = output_path / input_file.name.replace(".wav", ".ogg")
        
        # 获取原始大小
        size_before = get_file_size_mb(input_file)
        total_size_before += size_before
        
        # 转换
        print(f"🔄 [{i}/{total_files}] {input_file.name}...", end=" ")
        if convert_to_ogg(input_file, output_file):
            size_after = get_file_size_mb(output_file)
            total_size_after += size_after
            compression = (1 - size_after / size_before) * 100
            print(f"✅ {size_before:.1f}MB -> {size_after:.1f}MB (-{compression:.0f}%)")
            converted += 1
        else:
            failed += 1
    
    # 总结
    print("\n" + "=" * 50)
    print("📊 转换完成!")
    print(f"✅ 成功: {converted} 个文件")
    if failed > 0:
        print(f"❌ 失败: {failed} 个文件")
    print(f"💾 原始大小: {total_size_before:.1f} MB")
    print(f"💾 优化后: {total_size_after:.1f} MB")
    if total_size_before > 0:
        total_compression = (1 - total_size_after / total_size_before) * 100
        print(f"📉 压缩率: {total_compression:.1f}%")
    print(f"\n🎵 专业级 Steinway 音色已准备就绪！")
    print(f"📁 输出目录: {OUTPUT_DIR}")

if __name__ == "__main__":
    main()
