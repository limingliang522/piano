# 音色配置系统修复

## 问题发现

音色配置系统中的采样点顺序有错误，导致音符映射不正确。

## 问题详情

### 错误的配置
```javascript
const sampleNotes = [
    'C0', 'G0', 'A1', 'D1', 'B2', 'E2',  // ❌ A1 和 D1 顺序错误
    'F#3', 'C#4', 'G#4', 'A#5', 'D#5', 'F6'  // ❌ A#5 和 D#5 顺序错误
];
```

### 问题分析

按照 MIDI 音高值：
- C0 = 12
- G0 = 19
- **D1 = 26** ← 应该在前
- **A1 = 33** ← 应该在后
- E2 = 40
- B2 = 47
- F#3 = 54
- C#4 = 61
- G#4 = 68
- **D#5 = 75** ← 应该在前
- **A#5 = 82** ← 应该在后
- F6 = 89

**错误原因**：采样点没有按照音高从低到高排序，导致 `findClosestSample()` 方法可能选择错误的采样点。

### 影响

当播放某些音符时，系统会选择错误的采样点作为基础，导致：
1. 音高偏移计算错误
2. 音色不准确
3. 某些音符可能听起来很奇怪

例如：
- 播放 E1 (MIDI 28) 时，应该选择 D1 (26)，但可能错误地选择了 A1 (33)
- 播放 G5 (MIDI 79) 时，应该选择 D#5 (75)，但可能错误地选择了 A#5 (82)

## 修复内容

### 1. 修正 audio-engine.js 中的采样点顺序

**修复位置 1**：`init()` 方法
```javascript
// 修复前
const sampleNotes = [
    'C0', 'G0', 'A1', 'D1', 'B2', 'E2', 
    'F#3', 'C#4', 'G#4', 'A#5', 'D#5', 'F6'
];

// 修复后
const sampleNotes = [
    'C0', 'G0', 'D1', 'A1', 'E2', 'B2', 
    'F#3', 'C#4', 'G#4', 'D#5', 'A#5', 'F6'
];
```

**修复位置 2**：`findClosestSample()` 方法
```javascript
// 修复前
const sampleNotes = [
    'C0', 'G0', 'A1', 'D1', 'B2', 'E2', 
    'F#3', 'C#4', 'G#4', 'A#5', 'D#5', 'F6'
];

// 修复后
const sampleNotes = [
    'C0', 'G0', 'D1', 'A1', 'E2', 'B2', 
    'F#3', 'C#4', 'G#4', 'D#5', 'A#5', 'F6'
];
```

### 2. 修正文档

**STEINWAY_GRAND_TIMBRE.md**
- 更新采样点分布说明
- 添加 MIDI 音高值标注

**TIMBRE_SWITCH_SUMMARY.md**
- 修正采样点分组

**test-timbre-config.html**
- 修正测试文件中的采样点顺序
- 修正 MIDI 映射表

### 3. 修正力度层映射

同时修复了力度层选择的边界问题：

```javascript
// 修复前
const dyn = Math.ceil(velocity / 32); // velocity=0 会得到 0，错误！

// 修复后
const dyn = Math.min(4, Math.max(1, Math.ceil((velocity + 1) / 32)));
```

**修复说明**：
- velocity 0-31 → Dyn1
- velocity 32-63 → Dyn2
- velocity 64-95 → Dyn3
- velocity 96-127 → Dyn4

## 验证方法

### 1. 使用测试页面
```bash
# 打开 test-timbre-config.html
# 点击"测试音符映射"按钮
# 检查每个音符是否映射到正确的采样点
```

### 2. 检查关键音符
- E1 (MIDI 28) → 应该映射到 D1 (偏移 +2)
- F1 (MIDI 29) → 应该映射到 D1 (偏移 +3)
- G5 (MIDI 79) → 应该映射到 D#5 (偏移 +4)
- A5 (MIDI 81) → 应该映射到 D#5 (偏移 +6)

### 3. 播放测试
```javascript
// 测试低音区
audioEngine.playNote(28, 1.0, 80, 2); // E1
audioEngine.playNote(29, 1.0, 80, 2); // F1

// 测试中高音区
audioEngine.playNote(79, 1.0, 80, 2); // G5
audioEngine.playNote(81, 1.0, 80, 2); // A5
```

## 修复结果

✅ 采样点按音高正确排序  
✅ 音符映射逻辑正确  
✅ 力度层选择边界修正  
✅ 所有文档已更新  
✅ 测试文件已修正  

## 正确的采样点配置

```javascript
// Steinway Grand Piano - 12 个采样点（按音高从低到高）
const sampleNotes = [
    'C0',   // MIDI 12  - 最低音
    'G0',   // MIDI 19  - 低音区
    'D1',   // MIDI 26  - 低音区
    'A1',   // MIDI 33  - 低音区
    'E2',   // MIDI 40  - 中低音区
    'B2',   // MIDI 47  - 中低音区
    'F#3',  // MIDI 54  - 中音区
    'C#4',  // MIDI 61  - 中音区（中央C附近）
    'G#4',  // MIDI 68  - 中音区
    'D#5',  // MIDI 75  - 中高音区
    'A#5',  // MIDI 82  - 中高音区
    'F6'    // MIDI 89  - 高音区
];
```

## 总结

这次修复解决了音色配置系统中的关键问题：
1. 采样点顺序错误导致的音符映射问题
2. 力度层选择的边界问题

现在系统能够正确地为每个 MIDI 音符选择最接近的采样点，并应用正确的音高偏移和力度层。
