# 音频延迟修复 - 第二轮之后的延迟调整

## 问题描述

用户反馈：**第二轮之后的音频延迟好像感觉没有变化**

## 问题原因

在 `restartRound()` 函数中，音频播放前有一个固定的 **12秒延迟**：

```javascript
// 旧代码（错误）
await new Promise(resolve => setTimeout(resolve, 12000)); // 固定12秒
audioEngine.playBGM(0, speedMultiplier);
```

这个延迟是为了让黑块有时间移动到可见区域，但它是**固定的**，不会随着速度倍数变化而调整。

### 为什么会有问题？

- **第1轮**：速度 1.0x，延迟 12秒 ✅
- **第2轮**：速度 1.25x，延迟仍然是 12秒 ❌（应该是 9.6秒）
- **第3轮**：速度 1.56x，延迟仍然是 12秒 ❌（应该是 7.7秒）

由于黑块移动速度提升了，但延迟时间没有相应缩短，导致：
- 音频播放得太晚
- 黑块和音频不同步
- 玩家感觉延迟没有改善

## 解决方案

**动态调整延迟时间**，使其与速度倍数成反比：

```javascript
// 新代码（正确）
const baseDelay = 12.0; // 基础延迟（1.0x速度时）
const adjustedDelay = baseDelay / speedMultiplier; // 根据速度调整延迟

console.log(`⏱️ 延迟计算：基础延迟 ${baseDelay}秒 / 速度倍数 ${speedMultiplier.toFixed(2)}x = ${adjustedDelay.toFixed(2)}秒`);

await new Promise(resolve => setTimeout(resolve, adjustedDelay * 1000));
audioEngine.playBGM(0, speedMultiplier);
```

### 修复后的效果

- **第1轮**：速度 1.0x，延迟 12.0秒 ✅
- **第2轮**：速度 1.25x，延迟 9.6秒 ✅
- **第3轮**：速度 1.56x，延迟 7.7秒 ✅
- **第4轮**：速度 1.95x，延迟 6.2秒 ✅

## 数学原理

### 黑块移动速度

黑块的移动速度 = `originalBaseSpeed * speedMultiplier * 60`

### 黑块到达触发线的时间

黑块初始位置：`z = 2 - (noteTime * originalBaseSpeed * 60)`

黑块到达触发线（z = 2）需要的游戏时间：
```
distance = noteTime * originalBaseSpeed * 60
time = distance / (originalBaseSpeed * speedMultiplier * 60)
     = noteTime / speedMultiplier
```

### 延迟时间计算

为了让黑块和音频同步，延迟时间应该随速度倍数成反比：

```
adjustedDelay = baseDelay / speedMultiplier
```

这样，无论速度如何变化，黑块和音频始终保持同步。

## 测试方法

1. 启动游戏，完成第一轮
2. 观察第二轮开始时的控制台输出：
   ```
   ⏱️ 延迟计算：基础延迟 12秒 / 速度倍数 1.25x = 9.60秒
   ```
3. 确认音频播放时机与黑块到达触发线的时机一致
4. 继续完成更多轮次，验证同步性

## 相关文件

- `game.js` - `restartRound()` 函数（第1620-1640行）

## 修复日期

2025-11-23
