# Steinway Grand Piano 音色配置

## 音色信息

**音色名称**: Steinway Grand Piano  
**音色类型**: 专业级多层采样钢琴  
**音色风格**: 温暖、厚重、真实

## 采样规格

### 基本信息
- **采样点数量**: 12 个音符
- **力度层**: 4 层（Dyn1-4）
- **轮询采样**: 2 个（RR1-2）
- **总采样数**: 96 个文件（12 × 4 × 2）
- **文件格式**: MP3
- **文件路径**: `./钢琴/Steinway Grand  (DS)/`

### 采样点分布
```
C0  - 最低音
G0  - 低音区
A1  - 低音区
D1  - 低音区
B2  - 中低音区
E2  - 中低音区
F#3 - 中音区
C#4 - 中音区（中央C附近）
G#4 - 中音区
A#5 - 中高音区
D#5 - 中高音区
F6  - 高音区
```

### 力度层说明
- **Dyn1**: 极弱（pp）- velocity 0-31
- **Dyn2**: 弱（mp）- velocity 32-63
- **Dyn3**: 强（mf）- velocity 64-95
- **Dyn4**: 极强（ff）- velocity 96-127

### 轮询采样（Round Robin）
- **RR1**: 第一个采样变体
- **RR2**: 第二个采样变体
- **目的**: 避免连续播放同音符时的机械感

## 文件命名规则

```
Steinway_{音符}_{力度层}_{轮询}.mp3
```

**示例**:
- `Steinway_C#4_Dyn2_RR1.mp3` - C#4 音符，中弱力度，第一个轮询
- `Steinway_F6_Dyn4_RR2.mp3` - F6 音符，极强力度，第二个轮询

## 完整文件列表

### C0（8个文件）
```
Steinway_C0_Dyn1_RR1.mp3, Steinway_C0_Dyn1_RR2.mp3
Steinway_C0_Dyn2_RR1.mp3, Steinway_C0_Dyn2_RR2.mp3
Steinway_C0_Dyn3_RR1.mp3, Steinway_C0_Dyn3_RR2.mp3
Steinway_C0_Dyn4_RR1.mp3, Steinway_C0_Dyn4_RR2.mp3
```

### G0（8个文件）
```
Steinway_G0_Dyn1_RR1.mp3, Steinway_G0_Dyn1_RR2.mp3
Steinway_G0_Dyn2_RR1.mp3, Steinway_G0_Dyn2_RR2.mp3
Steinway_G0_Dyn3_RR1.mp3, Steinway_G0_Dyn3_RR2.mp3
Steinway_G0_Dyn4_RR1.mp3, Steinway_G0_Dyn4_RR2.mp3
```

### A1, D1, B2, E2, F#3, C#4, G#4, A#5, D#5, F6
（每个音符 8 个文件，共 80 个文件）

## 技术实现

### 加载代码
```javascript
const fileName = `Steinway_${noteName}_Dyn${dyn}_RR${rr}.mp3`;
const response = await fetch(`./钢琴/Steinway Grand  (DS)/${fileName}`);
const arrayBuffer = await response.arrayBuffer();
const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
const sampleKey = `${noteName}_${dyn}_${rr}`;
this.samples.set(sampleKey, audioBuffer);
```

### 采样选择逻辑
```javascript
// 1. 找到最接近的采样点
const closestNote = findClosestNote(targetNote);

// 2. 根据 velocity 选择力度层
const dyn = Math.ceil(velocity / 32); // 1-4

// 3. 随机选择轮询
const rr = Math.random() < 0.5 ? 1 : 2;

// 4. 获取采样
const sampleKey = `${closestNote}_${dyn}_${rr}`;
const buffer = this.samples.get(sampleKey);
```

### 音高调整
```javascript
// 计算半音偏移
const semitoneOffset = targetMidi - sampleMidi;

// 调整播放速率
source.playbackRate.value = Math.pow(2, semitoneOffset / 12);
```

## 音质特点

### 优点
✅ **真实动态**: 4 个力度层，完美还原钢琴的动态表现  
✅ **自然变化**: 2 个轮询采样，避免机械感  
✅ **专业音质**: Steinway 品牌，顶级钢琴音色  
✅ **温暖厚重**: 适合古典音乐、爵士乐等  
✅ **表现力强**: 能够表现细腻的演奏技巧  

### 局限
⚠️ **采样点少**: 只有 12 个采样点，音高拉伸较多  
⚠️ **文件较大**: 96 个文件，总大小约 30-50 MB  
⚠️ **加载较慢**: 需要加载 96 个文件  
⚠️ **内存占用**: 解码后约 150-200 MB  

## 性能数据

- **总文件大小**: 约 30-50 MB
- **加载时间**: 5-15 秒（取决于网络）
- **内存占用**: 约 150-200 MB（解码后）
- **CPU 使用**: 中等（多层采样选择）

## 与其他音色对比

| 特性 | Steinway Grand | Bright Acoustic | FluidR3 GM |
|------|----------------|-----------------|------------|
| 采样点 | 12 个 | 52 个 | 合成音色 |
| 力度层 | 4 层 | 1 层 | 无 |
| 轮询 | 2 个 | 无 | 无 |
| 总文件数 | 96 | 52 | 1 |
| 文件大小 | 30-50 MB | 15-25 MB | 5-10 MB |
| 音色风格 | 温暖厚重 | 明亮清晰 | 通用标准 |
| 动态表现 | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐ |
| 真实感 | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐ |
| 加载速度 | ⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ |

## 适用场景

### 最适合
- ✅ 专业音乐制作
- ✅ 古典音乐演奏
- ✅ 爵士乐演奏
- ✅ 需要真实动态表现的场景
- ✅ 高保真音乐欣赏

### 不太适合
- ❌ 快速原型开发（加载慢）
- ❌ 移动设备（内存占用大）
- ❌ 低带宽环境（文件大）
- ❌ 简单的音效播放

## 优化建议

### 减少加载时间
1. 使用 CDN 加速文件传输
2. 实现渐进式加载（先加载常用音符）
3. 使用 Service Worker 缓存

### 减少内存占用
1. 只加载需要的力度层（如只加载 Dyn2 和 Dyn3）
2. 动态卸载不常用的采样
3. 使用压缩格式（如 Opus）

### 提高性能
1. 预加载常用音符
2. 使用 Web Worker 解码
3. 实现采样池管理

## 音频处理链

当前配置为**纯净原声输出模式**：

```
Steinway 采样
  ↓
多段压缩器（保护性）
  ↓
均衡器（0 dB，透明）
  ↓
立体声增强（20%，轻微）
  ↓
混响（15%，自然）
  ↓
主音量（1.0，无增益）
  ↓
输出
```

## 使用示例

### 播放单个音符
```javascript
// 播放 C4，中等力度
audioEngine.playNote(60, 1.0, 64, 2);
```

### 播放和弦
```javascript
// C 大三和弦
audioEngine.playNote(60, 2.0, 80, 2); // C4
audioEngine.playNote(64, 2.0, 75, 2); // E4
audioEngine.playNote(67, 2.0, 70, 2); // G4
```

### 播放音阶
```javascript
const scale = [60, 62, 64, 65, 67, 69, 71, 72];
scale.forEach((note, i) => {
    setTimeout(() => {
        audioEngine.playNote(note, 0.8, 70 + i * 5, 2);
    }, i * 400);
});
```

## 总结

**Steinway Grand Piano** 是一个专业级的多层采样音色，提供了：
- 真实的动态表现（4 个力度层）
- 自然的音色变化（2 个轮询）
- 温暖厚重的 Steinway 音色
- 适合专业音乐制作和高保真播放

虽然文件较大、加载较慢，但音质和表现力都是顶级的，非常适合对音质有高要求的应用场景。
