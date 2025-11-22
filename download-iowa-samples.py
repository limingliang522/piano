#!/usr/bin/env python3
"""
University of Iowa Piano Samples 下载脚本
下载 Steinway 钢琴的 88 个音符采样（AIFF 格式）
"""

import os
import urllib.request
import sys
from pathlib import Path

# 创建输出目录
output_dir = Path("piano-samples-iowa")
output_dir.mkdir(exist_ok=True)

# University of Iowa 的钢琴采样 URL 模板
# 格式：Piano.mf.{音符名}.aiff
BASE_URL = "http://theremin.music.uiowa.edu/sound files/MIS/Pianos/piano/Piano.mf.{note}.aiff"

# 88 个钢琴音符（A0 到 C8）
def generate_notes():
    """生成 88 个钢琴音符名称"""
    notes = []
    note_names = ['A', 'As', 'B', 'C', 'Cs', 'D', 'Ds', 'E', 'F', 'Fs', 'G', 'Gs']
    
    # A0, As0, B0
    for note in ['A', 'As', 'B']:
        notes.append(f"{note}0")
    
    # C1 到 B7
    for octave in range(1, 8):
        for note in ['C', 'Cs', 'D', 'Ds', 'E', 'F', 'Fs', 'G', 'Gs', 'A', 'As', 'B']:
            notes.append(f"{note}{octave}")
    
    # C8
    notes.append("C8")
    
    return notes

def download_sample(note_name):
    """下载单个音符采样"""
    # Iowa 使用 # 表示升号，而不是 s
    iowa_note = note_name.replace('s', '#')
    url = BASE_URL.format(note=iowa_note)
    output_file = output_dir / f"{note_name}.aiff"
    
    try:
        print(f"下载 {note_name}...", end=" ")
        urllib.request.urlretrieve(url, output_file)
        print("✓")
        return True
    except Exception as e:
        print(f"✗ ({e})")
        return False

def main():
    notes = generate_notes()
    total = len(notes)
    success = 0
    
    print(f"开始下载 University of Iowa Piano Samples")
    print(f"总共 {total} 个音符")
    print(f"输出目录: {output_dir.absolute()}")
    print("-" * 50)
    
    for i, note in enumerate(notes, 1):
        print(f"[{i}/{total}] ", end="")
        if download_sample(note):
            success += 1
    
    print("-" * 50)
    print(f"下载完成！成功: {success}/{total}")
    
    if success < total:
        print(f"⚠️  有 {total - success} 个音符下载失败")
        print("这是正常的，Iowa 服务器可能不稳定或某些音符不可用")
    
    print(f"\n下一步：运行 convert-iowa-to-mp3.py 将 AIFF 转换为 MP3")

if __name__ == "__main__":
    main()
