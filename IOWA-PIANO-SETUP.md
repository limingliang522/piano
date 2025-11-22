# University of Iowa Piano Samples 设置指南

## 🎹 音色介绍

**University of Iowa Piano Samples** 是由爱荷华大学音乐学院录制的高质量钢琴采样库：

- **钢琴型号**：Steinway 三角钢琴
- **采样数量**：88 个完整音符（A0 到 C8）
- **录音质量**：学术级专业录音
- **音色特点**：自然、温暖、清晰、适合古典音乐
- **文件格式**：AIFF（原始）→ MP3（转换后）
- **总大小**：约 300MB

## 📦 安装步骤

### 方法一：一键安装（推荐）

```bash
# 运行快速设置脚本
python quick-setup-iowa.py
```

这个脚本会自动：
1. 检查依赖（pydub、ffmpeg）
2. 下载 88 个 AIFF 采样
3. 转换为 MP3 格式
4. 放置到 `piano-samples/` 目录

### 方法二：手动安装

#### 步骤 1：安装依赖

```bash
# 安装 Python 库
pip install pydub

# 安装 ffmpeg
# Windows: 下载 https://ffmpeg.org/download.html
# Mac: brew install ffmpeg
# Linux: sudo apt install ffmpeg
```

#### 步骤 2：下载采样

```bash
python download-iowa-samples.py
```

这会下载 88 个 AIFF 文件到 `piano-samples-iowa/` 目录。

#### 步骤 3：转换为 MP3

```bash
python convert-iowa-to-mp3.py
```

这会将 AIFF 转换为高质量 MP3（320kbps）并放到 `piano-samples/` 目录。

## 🎮 使用新音色

1. 确保 `piano-samples/` 目录包含 88 个 MP3 文件
2. 刷新浏览器
3. 游戏会自动加载新音色

## 🔧 音色对比

| 特性 | FluidR3 GM（旧） | Iowa Steinway（新） |
|------|-----------------|-------------------|
| 采样数 | 52 个 | 88 个（完整） |
| 音色 | 合成音色 | 真实录音 |
| 质量 | 中等 | 学术级 |
| 大小 | ~50MB | ~300MB |
| 特点 | 明亮、数字感 | 自然、温暖 |
| 适合 | 流行音乐 | 古典音乐 |

## 🎵 音色特点

### Steinway 钢琴的声音特征

- **低音区**：温暖、厚实、有力
- **中音区**：清晰、圆润、富有表现力
- **高音区**：明亮、清脆、延音长
- **整体**：平衡、自然、适合各种音乐风格

### 均衡器调整

代码已针对 Iowa 采样优化：

```javascript
// 低频：轻微增强（Iowa 本身低频很好）
eqLow.gain.value = 2.0;

// 中频：轻微提升清晰度
eqMid.gain.value = 1.5;

// 高频：适度增强明亮度
eqHigh.gain.value = 2.5;
```

## 🚨 常见问题

### Q: 下载失败怎么办？

A: Iowa 服务器有时不稳定，可以：
1. 重新运行下载脚本
2. 手动下载缺失的音符
3. 使用备用音色库（Salamander Grand Piano）

### Q: 转换失败怎么办？

A: 确保：
1. ffmpeg 已正确安装
2. AIFF 文件完整下载
3. 有足够的磁盘空间

### Q: 音色太大，加载慢怎么办？

A: 可以：
1. 只下载部分音符（如 C1-C7）
2. 降低 MP3 比特率（改为 192kbps）
3. 使用更轻量的音色库

### Q: 如何切换回旧音色？

A: 
1. 备份当前 `piano-samples/` 目录
2. 恢复旧的 FluidR3 采样
3. 修改 `audio-engine.js` 中的采样列表

## 📚 参考资料

- [University of Iowa MIS](http://theremin.music.uiowa.edu/MISpiano.html)
- [Steinway 钢琴官网](https://www.steinway.com/)
- [Web Audio API 文档](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API)

## 🎼 音色来源

University of Iowa Electronic Music Studios
- 录音：Lawrence Fritts
- 钢琴：Steinway Model D
- 许可：教育和非商业用途免费

---

享受 Steinway 钢琴的美妙音色！🎹✨
