# 音频对齐问题修复说明

## 问题描述

**症状**：第一轮最后一个黑块和音频对齐正常，但第二轮第一个黑块就不对齐了。

## 根本原因

在 `restartRound()` 函数执行期间，`gameRunning` 保持为 `true`，导致：

1. **黑块创建是异步的**：使用 `createAllNoteBlocksWithProgress()` 分批创建，需要多帧时间
2. **游戏循环继续运行**：在创建黑块期间，`animate()` 循环继续执行
3. **黑块提前移动**：已创建的黑块在 `updateNoteBlocks()` 中开始移动
4. **音频还未播放**：音频要等到所有黑块创建完成后才开始播放

### 时间线示例

假设创建 300 个黑块需要 6 帧（约 0.1 秒）：

```
帧 #1: 创建前 50 个黑块，位置 z = -20.5
帧 #2: 创建第 51-100 个黑块，前 50 个移动到 z = -20.3
帧 #3: 创建第 101-150 个黑块，前 50 个移动到 z = -20.1
...
帧 #6: 创建完成，前 50 个已经移动到 z = -19.4
帧 #7: 音频开始播放（从 0 秒开始）
```

**结果**：第一个黑块应该在 `z = -20.5`，但实际在 `z = -19.4`，提前了约 `1.1` 个单位，对应约 `0.1` 秒的时间差。

## 修复方案

在 `restartRound()` 和 `restart()` 函数开始时，立即设置 `gameRunning = false`，防止黑块在创建过程中移动。

### 修改 1：restartRound 函数

```javascript
async function restartRound() {
    // 立即暂停游戏，防止黑块在创建过程中提前移动
    gameRunning = false;
    
    // ... 其余代码保持不变
    
    // 最后启动游戏
    gameRunning = true;
}
```

### 修改 2：restart 函数

```javascript
async function restart() {
    // 立即暂停游戏，防止黑块在创建过程中提前移动
    gameRunning = false;
    
    // ... 其余代码保持不变
    
    // 最后启动游戏
    gameRunning = true;
}
```

## 验证方法

### 1. 控制台监控

在浏览器控制台运行以下代码，监控第二轮的对齐情况：

```javascript
// 监控第一个黑块的位置
function monitorFirstBlock() {
    if (!gameRunning || noteObjects.length === 0) {
        console.log('等待游戏开始...');
        return;
    }
    
    const firstBlock = noteObjects[0];
    const expectedZ = 2 - (firstBlock.userData.noteData.time * originalBaseSpeed * 60);
    const actualZ = firstBlock.position.z;
    const diff = Math.abs(expectedZ - actualZ);
    
    console.log('═══════════════════════════════════════');
    console.log(`📦 第一个黑块监控`);
    console.log(`   音符时间: ${firstBlock.userData.noteData.time.toFixed(2)}秒`);
    console.log(`   预期位置: z = ${expectedZ.toFixed(2)}`);
    console.log(`   实际位置: z = ${actualZ.toFixed(2)}`);
    console.log(`   位置差: ${diff.toFixed(3)} ${diff < 0.1 ? '✅' : '❌'}`);
    console.log(`   速度倍数: ${speedMultiplier.toFixed(2)}x`);
}

// 每秒监控一次
const monitorInterval = setInterval(monitorFirstBlock, 1000);

// 停止监控
// clearInterval(monitorInterval);
```

### 2. 游戏测试

1. 启动游戏，完成第一轮
2. 观察第二轮第一个黑块：
   - ✅ **修复前**：黑块会提前到达触发线（音频还没响）
   - ✅ **修复后**：黑块和音频同时到达（完美对齐）

### 3. 预期结果

**第二轮开始时**：
- 第一个黑块位置应该保持在初始位置（例如 `z = -20.5`）
- 不应该有任何提前移动
- 音频开始播放后，黑块和音频完美同步

## 技术细节

### 为什么第一轮没问题？

第一轮时，黑块是在用户点击"开始"按钮后创建的：
- 创建过程中，游戏还没启动（`gameRunning = false`）
- 创建完成后，才设置 `gameRunning = true` 并播放音频
- 所以黑块不会提前移动

### 为什么第二轮有问题？

第二轮时，`restartRound()` 是在游戏运行中被调用的：
- `completeRound()` 在最后一个黑块触发后立即调用
- 此时 `gameRunning = true`（从第一轮继承）
- 创建黑块期间，游戏循环继续运行
- 导致黑块提前移动

### 数学验证

假设：
- 第一个音符时间：`2.5秒`
- 原始速度：`originalBaseSpeed = 0.15`
- 第二轮速度倍数：`speedMultiplier = 1.25`
- 创建黑块耗时：`6帧 ≈ 0.1秒`

**黑块初始位置**：
```
z = 2 - (2.5 × 0.15 × 60) = 2 - 22.5 = -20.5
```

**黑块移动速度**：
```
v = 0.15 × 1.25 × 60 = 11.25 单位/秒
```

**提前移动距离**：
```
distance = 11.25 × 0.1 = 1.125 单位
```

**实际位置**：
```
z = -20.5 + 1.125 = -19.375
```

**时间差**：
```
time_diff = 1.125 / 11.25 = 0.1 秒
```

所以黑块会提前约 `0.1秒` 到达触发线。

## 总结

这是一个典型的**异步操作期间状态管理**问题：
- 异步操作（创建黑块）需要时间
- 在此期间，其他系统（游戏循环）继续运行
- 导致状态不一致（黑块位置偏移）

**解决方案**：在异步操作开始前，立即暂停相关系统，操作完成后再恢复。

修复后，第二轮及后续所有轮次都能保持完美的音频对齐！
