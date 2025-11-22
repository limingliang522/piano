# 音频同步原理说明

## 问题
如何让音频文件的第一个音符声音，正好在第一个黑块到达触发线时播放？

## 解决方案

### 时间轴示意图
```
游戏开始                第一个黑块到达触发线
    |                           |
    v                           v
    0s -------- timeToTrigger -----> T秒
    
音频播放：
    |<-- audioStartTime -->|<-- firstNoteTime -->|
    0s                     ?秒                   T秒
```

### 计算步骤

1. **第一个音符的时间**（MIDI 数据）
   - `firstNoteTime` = 第一个 MIDI 音符的时间（例如：2.5秒）

2. **黑块初始位置**
   - 触发线位置：`z = 2`
   - 黑块初始位置：`z = 2 - (firstNoteTime × originalBaseSpeed × 60) - bufferDistance`
   - 距离触发线：`distanceToTrigger = (firstNoteTime × originalBaseSpeed × 60) + bufferDistance`

3. **移动到触发线需要的时间**
   - 当前速度：`currentSpeed = originalBaseSpeed × speedMultiplier`
   - 移动时间：`timeToTrigger = distanceToTrigger / (currentSpeed × 60)`

4. **音频开始时间**
   - `audioStartTime = firstNoteTime - timeToTrigger`
   - 如果计算结果为负数，则从 0 开始

### 示例计算

假设：
- `firstNoteTime = 2.5秒`（第一个音符在音频的2.5秒处）
- `originalBaseSpeed = 0.15`
- `bufferDistance = 30`
- `speedMultiplier = 1.0`（第一轮）

计算：
1. `distanceToTrigger = (2.5 × 0.15 × 60) + 30 = 22.5 + 30 = 52.5`
2. `currentSpeed = 0.15 × 1.0 = 0.15`
3. `timeToTrigger = 52.5 / (0.15 × 60) = 52.5 / 9 = 5.83秒`
4. `audioStartTime = 2.5 - 5.83 = -3.33秒` → `0秒`（从头开始）

结果：音频从 0 秒开始播放，5.83 秒后第一个黑块到达触发线，此时音频播放到 5.83 秒...

**等等，这个计算有问题！让我重新思考...**

## 正确的理解

实际上：
- 黑块在游戏开始时就已经存在于场景中
- 黑块以恒定速度向前移动
- 我们需要让音频提前播放，使得黑块到达触发线时，音频正好播放到对应的时间点

### 正确的时间轴
```
游戏开始时：
- 黑块位置：z = 2 - (firstNoteTime × speed × 60) - buffer
- 音频播放：从 audioStartTime 开始

经过 timeToTrigger 秒后：
- 黑块位置：z = 2（触发线）
- 音频播放到：audioStartTime + timeToTrigger = firstNoteTime
```

所以：`audioStartTime + timeToTrigger = firstNoteTime`
因此：`audioStartTime = firstNoteTime - timeToTrigger`

这个公式是正确的！
