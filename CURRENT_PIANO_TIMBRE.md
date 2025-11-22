# 当前使用的钢琴音色

## 音色名称
**Bright Acoustic Piano** (明亮原声钢琴)

## 音色特点
- 🎹 **音色类型**: 原声钢琴采样
- ✨ **音色风格**: 明亮、清晰、现代
- 🎵 **适用场景**: 流行音乐、古典音乐、游戏音效

## 采样规格

### 基本信息
- **采样点数量**: 52 个音符
- **音符范围**: A0 - C8（完整 88 键钢琴范围）
- **采样格式**: MP3
- **力度层**: 单层采样（无多力度）
- **轮询**: 无（每个音符一个采样）

### 采样列表
```
低音区（9个音符）:
A0, B0, C1, D1, E1, F1, G1, A1, B1

中低音区（12个音符）:
C2, D2, E2, F2, G2, A2, B2, C3, D3, E3, F3, G3

中音区（12个音符）:
A3, B3, C4, D4, E4, F4, G4, A4, B4, C5, D5, E5

中高音区（12个音符）:
F5, G5, A5, B5, C6, D6, E6, F6, G6, A6, B6, C7

高音区（7个音符）:
D7, E7, F7, G7, A7, B7, C8
```

## 文件路径
```
./piano-samples/
├── A0.mp3
├── B0.mp3
├── C1.mp3
├── ...
└── C8.mp3
```

## 采样策略

### 音高映射
- 系统会找到最接近的采样音符
- 使用 `playbackRate` 调整音高
- 支持完整的 MIDI 音符范围（0-127）

### 示例
- 播放 C#4 → 使用 C4 或 D4 采样 + 音高调整
- 播放 F#5 → 使用 F5 或 G5 采样 + 音高调整

## 音质特性

### 优点
✅ **覆盖全面**: 52 个采样点，覆盖完整钢琴音域  
✅ **音色统一**: 单层采样，音色一致性好  
✅ **加载快速**: MP3 格式，文件小，加载快  
✅ **兼容性好**: 标准格式，所有浏览器支持  

### 局限
⚠️ **无力度层**: 不能根据 velocity 切换不同采样  
⚠️ **无轮询**: 连续播放同音符时音色相同  
⚠️ **音高拉伸**: 非采样点的音符需要音高调整  

## 与其他音色的对比

| 特性 | Bright Acoustic | Steinway Grand | FluidR3 GM |
|------|----------------|----------------|------------|
| 采样点 | 52 个 | 12 个 | 合成音色 |
| 力度层 | 1 层 | 4 层 | 无 |
| 轮询 | 无 | 2 个 | 无 |
| 文件格式 | MP3 | WAV/MP3 | SoundFont |
| 总文件数 | 52 | 96 | 1 |
| 音色风格 | 明亮清晰 | 温暖厚重 | 通用标准 |

## 性能数据

- **总文件大小**: 约 15-25 MB（估算）
- **加载时间**: 2-5 秒（取决于网络）
- **内存占用**: 约 50-80 MB（解码后）
- **CPU 使用**: 低（单层采样）

## 使用建议

### 适合的场景
- ✅ 快速原型开发
- ✅ 网页音乐游戏
- ✅ MIDI 文件播放
- ✅ 教育应用

### 不适合的场景
- ❌ 专业音乐制作（需要多力度层）
- ❌ 真实演奏模拟（需要轮询采样）
- ❌ 高保真录音（需要无损格式）

## 升级路径

如果需要更高质量的音色，可以考虑：

1. **添加力度层**
   - 为每个音符添加 2-4 个力度层
   - 根据 velocity 动态选择采样

2. **添加轮询采样**
   - 为每个音符添加 2-3 个轮询
   - 避免连续播放时的机械感

3. **使用无损格式**
   - 从 MP3 升级到 WAV
   - 提高音质，但增加文件大小

4. **增加采样密度**
   - 从 52 个增加到 88 个（每个琴键一个）
   - 减少音高拉伸，提高真实感

## 技术实现

### 加载代码
```javascript
const response = await fetch(`./piano-samples/${noteName}.mp3`);
const arrayBuffer = await response.arrayBuffer();
const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
this.samples.set(noteName, audioBuffer);
```

### 播放代码
```javascript
const { noteName, semitoneOffset } = this.findClosestSample(targetNote, velocity);
const buffer = this.samples.get(noteName);
source.buffer = buffer;
source.playbackRate.value = Math.pow(2, semitoneOffset / 12);
```

## 总结

当前使用的 **Bright Acoustic Piano** 是一个平衡了音质、性能和文件大小的优秀选择。它提供了：
- 完整的音域覆盖
- 明亮清晰的音色
- 快速的加载速度
- 良好的浏览器兼容性

非常适合网页音乐游戏和 MIDI 播放应用。
