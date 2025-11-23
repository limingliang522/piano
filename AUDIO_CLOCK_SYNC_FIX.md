# 音频时钟同步修复

## 问题原因

**为什么音频和黑块越到后面越不齐？**

### 原来的实现（有问题）

```javascript
// 黑块使用累积的 deltaTime
noteBlock.position.z += moveSpeed * deltaTime;
```

**问题：**
1. **帧率波动**：deltaTime 会因为帧率变化而不稳定（60fps、120fps、144fps）
2. **累积误差**：每帧的小误差会累积，时间越长误差越大
3. **时钟不同步**：
   - 黑块：使用 `requestAnimationFrame` 时钟（帧时间）
   - 音频：使用 `AudioContext.currentTime`（音频时钟）
   - 这两个时钟会产生漂移！

### 示例说明

假设游戏运行 60 秒：
- **理想情况**：60 秒后，黑块和音频完全同步
- **实际情况**（旧代码）：
  - 帧率波动：有时 60fps，有时 55fps，有时 65fps
  - 每帧误差：0.001 秒
  - 60 秒 × 60fps = 3600 帧
  - 累积误差：3600 × 0.001 = 3.6 秒！
  - **结果**：黑块和音频相差 3.6 秒！

## 解决方案

### 使用音频时钟作为唯一时间源

```javascript
// 游戏开始时，记录音频时钟
gameStartTime = audioEngine.audioContext.currentTime;

// 每帧计算当前游戏时间（基于音频时钟）
const currentGameTime = audioEngine.audioContext.currentTime - gameStartTime;

// 基于音频时钟计算黑块的精确位置
const timeToTrigger = noteData.time / speedMultiplier;
const remainingTime = timeToTrigger - currentGameTime;
const moveSpeed = originalBaseSpeed * speedMultiplier * 60;
noteBlock.position.z = triggerZ - (remainingTime * moveSpeed);
```

### 核心改进

1. **统一时钟**：黑块和音频都使用 `AudioContext.currentTime`
2. **消除累积误差**：每帧重新计算位置，而不是累积移动
3. **精确同步**：黑块位置直接基于音频时间计算

## 数学原理

### 黑块位置计算

```
黑块应该在 t = noteTime / speedMultiplier 秒后到达触发线
当前已经过了 currentGameTime 秒
剩余时间 = t - currentGameTime
黑块位置 = 触发线位置 - (剩余时间 × 移动速度)
```

### 示例

假设：
- 音符时间：`noteTime = 10.0` 秒
- 速度倍数：`speedMultiplier = 2.0`
- 触发线位置：`triggerZ = 2`
- 移动速度：`moveSpeed = 18` 单位/秒

**计算：**
1. 黑块应该在 `10.0 / 2.0 = 5.0` 秒后到达触发线
2. 当前游戏时间 `currentGameTime = 3.0` 秒
3. 剩余时间 `= 5.0 - 3.0 = 2.0` 秒
4. 黑块位置 `= 2 - (2.0 × 18) = 2 - 36 = -34`

**验证：**
- 2 秒后，黑块移动 `2.0 × 18 = 36` 单位
- 黑块位置 `-34 + 36 = 2`（正好到达触发线！）

## 代码修改

### 1. 游戏开始时使用音频时钟

```javascript
// 修改前
gameStartTime = Date.now() / 1000;

// 修改后
gameStartTime = audioEngine.audioContext.currentTime;
```

### 2. 黑块位置基于音频时钟计算

```javascript
// 修改前（累积移动，会产生误差）
noteBlock.position.z += moveSpeed * deltaTime;

// 修改后（每帧重新计算，精确同步）
const currentGameTime = audioEngine.audioContext.currentTime - gameStartTime;
const timeToTrigger = noteData.time / speedMultiplier;
const remainingTime = timeToTrigger - currentGameTime;
const moveSpeed = originalBaseSpeed * speedMultiplier * 60;
noteBlock.position.z = triggerZ - (remainingTime * moveSpeed);
```

## 优势

### ✅ 完美同步
- 黑块和音频使用相同的时钟
- 无论游戏运行多久，都不会产生漂移

### ✅ 消除累积误差
- 每帧重新计算位置，而不是累积移动
- 不受帧率波动影响

### ✅ 精确可预测
- 黑块位置完全由音频时间决定
- 数学上保证同步

### ✅ 性能优化
- 不需要复杂的误差补偿算法
- 计算简单高效

## 测试验证

### 测试步骤

1. 启动游戏，观察第一个黑块
2. 完成多轮（5-10轮），速度提升到 2x-3x
3. 观察后期的黑块是否仍然与音频同步

### 预期结果

- ✅ 第1轮：黑块和音频完全同步
- ✅ 第5轮（2.44x）：黑块和音频仍然完全同步
- ✅ 第10轮（9.31x）：黑块和音频仍然完全同步
- ✅ 无论速度多快，同步性始终保持

### 对比测试

| 指标 | 旧代码（deltaTime） | 新代码（音频时钟） |
|------|-------------------|------------------|
| 第1轮同步性 | ✅ 良好 | ✅ 完美 |
| 第5轮同步性 | ⚠️ 有偏差 | ✅ 完美 |
| 第10轮同步性 | ❌ 明显不同步 | ✅ 完美 |
| 累积误差 | ❌ 会累积 | ✅ 无累积 |
| 帧率影响 | ❌ 受影响 | ✅ 不受影响 |

## 技术细节

### AudioContext.currentTime

- **类型**：高精度时间戳（秒）
- **精度**：微秒级（0.000001 秒）
- **稳定性**：不受帧率影响，单调递增
- **用途**：音频系统的标准时钟

### 为什么不用 Date.now()？

```javascript
// ❌ 不推荐
gameStartTime = Date.now() / 1000;

// ✅ 推荐
gameStartTime = audioEngine.audioContext.currentTime;
```

**原因：**
1. `Date.now()` 精度较低（毫秒级）
2. `Date.now()` 可能受系统时间调整影响
3. `AudioContext.currentTime` 与音频播放完全同步

## 相关文件

- `game.js`：主游戏逻辑
  - `startMIDIGame()`：设置 gameStartTime
  - `updateNoteBlocks()`：计算黑块位置
  - `restartRound()`：重置 gameStartTime

## 更新日志

- **2024-11-23**：实现音频时钟同步
  - 使用 `AudioContext.currentTime` 作为唯一时间源
  - 黑块位置基于音频时钟计算，消除累积误差
  - 所有 `gameStartTime` 设置都使用音频时钟
