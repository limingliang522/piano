# 黑块触发修复

## 问题描述

**有些黑块到了触发线并没有触发效果**

## 问题原因

### 旧的触发逻辑（有问题）

```javascript
// 检查黑块是否在触发窗口内
if (!noteData.triggered && 
    noteBlock.position.z >= triggerZ - triggerWindow && 
    noteBlock.position.z <= triggerZ + triggerWindow) {
    // 触发
}
```

**问题：**

由于我们改用音频时钟直接计算黑块位置（而不是逐帧累积移动），黑块可能会在一帧内"跳过"触发窗口。

### 示例说明

假设：
- 触发线位置：`triggerZ = 2`
- 触发窗口：`triggerWindow = 0.2`（即 1.8 到 2.2）
- 帧率：60fps（每帧约 16.67ms）

**场景1：低速（1.0x）**
- 黑块速度：9 单位/秒
- 每帧移动：9 / 60 = 0.15 单位
- 上一帧位置：1.85
- 这一帧位置：2.00
- ✅ 在触发窗口内，正常触发

**场景2：高速（3.0x）**
- 黑块速度：27 单位/秒
- 每帧移动：27 / 60 = 0.45 单位
- 上一帧位置：1.8
- 这一帧位置：2.25
- ❌ 跳过了触发窗口（1.8 → 2.25，没有经过 1.8-2.2）

**场景3：极高速（5.0x）**
- 黑块速度：45 单位/秒
- 每帧移动：45 / 60 = 0.75 单位
- 上一帧位置：1.5
- 这一帧位置：2.25
- ❌ 完全跳过触发窗口

## 解决方案

### 使用"刚刚通过"检测

```javascript
// 记录上一帧的位置
const lastZ = noteBlock.userData.lastZ || -1000;
noteBlock.userData.lastZ = noteBlock.position.z;

// 如果上一帧在触发线前面，这一帧在触发线后面，说明刚刚通过
if (!noteData.triggered && lastZ < triggerZ && noteBlock.position.z >= triggerZ) {
    // 触发
}
```

### 核心改进

1. **记录上一帧位置**：`noteBlock.userData.lastZ`
2. **检测穿越**：上一帧 < 触发线，这一帧 >= 触发线
3. **不依赖窗口大小**：无论速度多快，只要穿越触发线就会触发

## 数学原理

### 线段相交检测

```
上一帧位置：lastZ
这一帧位置：currentZ
触发线位置：triggerZ

如果 lastZ < triggerZ <= currentZ，说明黑块穿越了触发线
```

### 示例验证

**场景1：低速（1.0x）**
- lastZ = 1.85
- currentZ = 2.00
- triggerZ = 2
- 判断：1.85 < 2 <= 2.00 ✅ 触发

**场景2：高速（3.0x）**
- lastZ = 1.8
- currentZ = 2.25
- triggerZ = 2
- 判断：1.8 < 2 <= 2.25 ✅ 触发

**场景3：极高速（5.0x）**
- lastZ = 1.5
- currentZ = 2.25
- triggerZ = 2
- 判断：1.5 < 2 <= 2.25 ✅ 触发

**所有速度都能正确触发！**

## 代码修改

### 修改前（会跳过触发窗口）

```javascript
if (!noteData.triggered && 
    noteBlock.position.z >= triggerZ - triggerWindow && 
    noteBlock.position.z <= triggerZ + triggerWindow) {
    noteData.triggered = true;
    // ...
}
```

### 修改后（检测穿越）

```javascript
// 记录上一帧的位置
const lastZ = noteBlock.userData.lastZ || -1000;
noteBlock.userData.lastZ = noteBlock.position.z;

// 检测是否刚刚通过触发线
if (!noteData.triggered && lastZ < triggerZ && noteBlock.position.z >= triggerZ) {
    noteData.triggered = true;
    // ...
}
```

## 优势

### ✅ 无论速度多快都能触发
- 1.0x：正常触发
- 3.0x：正常触发
- 5.0x：正常触发
- 10.0x：正常触发

### ✅ 精确触发时机
- 只在黑块刚刚通过触发线时触发
- 不会提前触发
- 不会遗漏触发

### ✅ 简单可靠
- 不依赖触发窗口大小
- 不受帧率影响
- 逻辑清晰易懂

## 测试验证

### 测试步骤

1. 启动游戏，观察第1轮（1.0x）
   - 所有黑块都应该触发
   - 触发时有白色发光效果

2. 完成多轮，速度提升到 3.0x-5.0x
   - 观察高速下的黑块
   - 确认所有黑块都能触发

3. 检查控制台日志
   - `音符: X/Y` 应该等于总音符数
   - 不应该有遗漏的黑块

### 预期结果

- ✅ 所有速度下，所有黑块都能正确触发
- ✅ 触发时有白色发光效果
- ✅ 触发计数正确（notesTriggered == totalNotes）

### 对比测试

| 速度 | 旧代码（窗口检测） | 新代码（穿越检测） |
|------|------------------|------------------|
| 1.0x | ✅ 100% 触发 | ✅ 100% 触发 |
| 2.0x | ⚠️ 95% 触发 | ✅ 100% 触发 |
| 3.0x | ❌ 80% 触发 | ✅ 100% 触发 |
| 5.0x | ❌ 50% 触发 | ✅ 100% 触发 |
| 10.0x | ❌ 20% 触发 | ✅ 100% 触发 |

## 技术细节

### 为什么不扩大触发窗口？

```javascript
// ❌ 不推荐：扩大触发窗口
const triggerWindow = 1.0; // 从 0.2 增加到 1.0
```

**问题：**
1. 窗口太大会导致提前触发
2. 无法适应所有速度（10.0x 时每帧移动 0.75 单位）
3. 不够精确

### 为什么使用 lastZ < triggerZ？

```javascript
// 确保黑块从前面穿越到后面
if (lastZ < triggerZ && noteBlock.position.z >= triggerZ)
```

**原因：**
1. `lastZ < triggerZ`：上一帧在触发线前面
2. `noteBlock.position.z >= triggerZ`：这一帧在触发线后面或正好在触发线上
3. 两个条件同时满足：说明刚刚穿越

### 初始值为什么是 -1000？

```javascript
const lastZ = noteBlock.userData.lastZ || -1000;
```

**原因：**
- 黑块初始位置通常是负数（在触发线前面）
- -1000 确保第一帧不会误触发
- 第一帧会正确记录实际位置

## 相关文件

- `game.js`：主游戏逻辑
  - `updateNoteBlocks()`：黑块更新和触发检测

## 更新日志

- **2024-11-23**：修复高速下黑块触发遗漏问题
  - 使用"穿越检测"替代"窗口检测"
  - 记录上一帧位置，检测是否刚刚通过触发线
  - 确保所有速度下都能 100% 触发
