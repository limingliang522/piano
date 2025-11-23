# 音频和黑块同步 - 快速参考

## 核心公式

```javascript
// 唯一的速度控制
速度 = originalBaseSpeed × speedMultiplier

// 黑块移动
moveSpeed = originalBaseSpeed × speedMultiplier × 60

// 音频播放
playbackRate = speedMultiplier
```

## 关键变量

| 变量 | 作用 | 是否可变 |
|------|------|---------|
| `originalBaseSpeed` | 基础速度基准 | ❌ 永不改变 |
| `speedMultiplier` | 速度倍数 | ✅ 每轮 ×1.25 |
| `midiSpeed` | 显示用 | ⚠️ 仅用于 UI |

## 同步原理

```
黑块到达时间 = noteTime / speedMultiplier
音频播放时间 = audioStartTime + (gameTime × speedMultiplier)
             = noteTime × (1 - 1/speedMultiplier) + (noteTime / speedMultiplier × speedMultiplier)
             = noteTime
```

**结论**：完美同步！✅

## 速度提升

```javascript
// 每完成一轮
speedMultiplier *= 1.25;

// 黑块自动加速（在 updateNoteBlocks 中）
moveSpeed = originalBaseSpeed × speedMultiplier × 60;

// 音频同步加速
audioEngine.playBGM(audioStartTime, speedMultiplier);
```

## 快速测试

1. 启动游戏
2. 观察第一个黑块到达触发线
3. 同时听音频
4. 如果视觉和听觉同时发生 → ✅ 同步
5. 如果有延迟 → ❌ 不同步

## 调试检查

### 控制台日志

```
✅ 正确：
🎮 统一速度控制：originalBaseSpeed = 0.1500, speedMultiplier = 1.25x

❌ 错误：
如果看到 midiSpeed 被单独计算或更新
```

### UI 显示

```
速度: 1.25x  ← 应该与 speedMultiplier 一致
```

## 常见错误

### ❌ 不要这样做

```javascript
// 错误：使用 midiSpeed 计算
const moveSpeed = midiSpeed * 60;

// 错误：修改 originalBaseSpeed
originalBaseSpeed *= 1.25;

// 错误：音频和黑块使用不同的速度
audioEngine.playBGM(audioStartTime, 1.0);
moveSpeed = originalBaseSpeed * 2.0 * 60;
```

### ✅ 正确做法

```javascript
// 正确：直接使用 originalBaseSpeed × speedMultiplier
const moveSpeed = originalBaseSpeed * speedMultiplier * 60;

// 正确：音频和黑块使用相同的 speedMultiplier
audioEngine.playBGM(audioStartTime, speedMultiplier);

// 正确：只修改 speedMultiplier
speedMultiplier *= 1.25;
```

## 文档链接

- 📖 详细原理：`UNIFIED_TIME_CONTROL.md`
- 🧪 测试指南：`TEST_SYNC_VERIFICATION.md`
- 📝 完整总结：`SYNC_FIX_SUMMARY.md`
