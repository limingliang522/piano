# 统一时间控制系统

## 概述

音频速度和黑块移动速度现在共用同一个时间源和加速度，确保完美同步。

## 核心原理

### 1. 唯一的加速度源

```javascript
let originalBaseSpeed = 0.15;  // 原始基础速度（永远不变）
let speedMultiplier = 1.0;     // 速度倍数（音频和黑块共用）
```

- `originalBaseSpeed`：游戏初始化时根据 MIDI 文件的 BPM 计算得出，之后永不改变
- `speedMultiplier`：每完成一轮增加 1.25 倍，是音频和黑块的唯一加速度源

### 2. 黑块移动速度

```javascript
// 在 updateNoteBlocks() 中
const moveSpeed = originalBaseSpeed * speedMultiplier * 60; // 每秒移动的距离
noteBlock.position.z += moveSpeed * deltaTime;
```

- 直接使用 `originalBaseSpeed * speedMultiplier` 计算
- 不依赖中间变量 `midiSpeed`

### 3. 音频播放速度

```javascript
// 在 startMIDIGame() 和 continueNextRound() 中
audioEngine.playBGM(audioStartTime, speedMultiplier);
```

- 通过 `playbackRate = speedMultiplier` 控制音频播放速度
- 与黑块使用完全相同的加速度

## 同步机制

### 黑块初始位置计算

```javascript
// 在 createNoteBlock() 中
const zPosition = 2 - (noteData.time * originalBaseSpeed * 60);
```

- 黑块初始位置基于音符时间和原始基础速度
- 与 `speedMultiplier` 无关（因为速度和时间的变化相互抵消）

### 音频开始时间计算

```javascript
// 黑块到达触发线需要的游戏时间
const gameTimeToTrigger = firstNoteTime / speedMultiplier;

// 音频开始时间
const audioStartTime = firstNoteTime - gameTimeToTrigger;
                     = firstNoteTime * (1 - 1/speedMultiplier);
```

**示例：**
- `speedMultiplier = 1.0x` → `audioStartTime = 0`（从头播放）
- `speedMultiplier = 2.0x` → `audioStartTime = firstNoteTime * 0.5`（从中间播放）

### 完美同步的数学证明

1. **黑块到达触发线的时间**：
   ```
   distance = noteTime * originalBaseSpeed * 60
   speed = originalBaseSpeed * speedMultiplier * 60
   time = distance / speed = noteTime / speedMultiplier
   ```

2. **音频播放到该音符的时间**：
   ```
   audioTime = audioStartTime + gameTime
             = firstNoteTime * (1 - 1/speedMultiplier) + noteTime / speedMultiplier
   ```

3. **当 noteTime = firstNoteTime 时**：
   ```
   audioTime = firstNoteTime * (1 - 1/speedMultiplier) + firstNoteTime / speedMultiplier
             = firstNoteTime
   ```

   **结论**：黑块到达触发线时，音频正好播放到该音符！

## 速度提升流程

### 完成一轮后

```javascript
// 在 continueNextRound() 中
speedMultiplier *= 1.25;  // 提升速度倍数

// 黑块速度自动更新（在 updateNoteBlocks 中计算）
const moveSpeed = originalBaseSpeed * speedMultiplier * 60;

// 音频速度同步更新
audioEngine.playBGM(audioStartTime, speedMultiplier);
```

### 重置游戏

```javascript
speedMultiplier = 1.0;  // 重置为原始速度
midiSpeed = originalBaseSpeed;  // 重置显示值
```

## 关键优势

1. **完美同步**：音频和黑块使用相同的加速度源（`speedMultiplier`）
2. **简单可靠**：不依赖复杂的时间同步算法
3. **易于维护**：所有速度计算都基于同一个公式
4. **精确可预测**：数学上保证同步，不会产生漂移

## 注意事项

- `midiSpeed` 变量仅用于显示和向后兼容，实际计算不使用它
- 所有速度相关的计算都应该直接使用 `originalBaseSpeed * speedMultiplier`
- 不要在运行时修改 `originalBaseSpeed`，它是速度计算的基准
- `speedMultiplier` 是唯一可以动态调整的速度参数

## 测试验证

### 验证同步性

1. 启动游戏，观察第一个黑块到达触发线的时间
2. 同时听音频，确认音符播放时间与黑块到达时间一致
3. 完成一轮后，速度提升，再次验证同步性
4. 多轮测试，确保高速下仍然同步

### 预期结果

- 所有速度下，黑块到达触发线时，音频正好播放到对应的音符
- 速度提升后，音频和黑块同步加速，不会出现漂移
- 长时间游戏后，同步性保持稳定

## 更新日志

- **2024-11-23**：实现统一时间控制系统，音频和黑块共用 `speedMultiplier` 作为唯一加速度源
