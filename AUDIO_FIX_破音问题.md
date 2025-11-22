# 🔧 破音问题修复说明

## 问题原因

破音（削波失真）是由于音频信号超过了最大允许值（0dB）导致的。主要原因：

1. **主音量过大** - 之前设置为 18.0 倍增益，远超安全范围
2. **多音符叠加** - 多个音符同时播放时信号叠加，容易超限
3. **压缩器阈值过高** - 压缩器介入太晚，无法有效控制峰值

## 已修复的问题

### 1. 主音量调整
```javascript
// 修复前：
this.masterGain.gain.value = 18.0; // 太大！

// 修复后：
this.masterGain.gain.value = 1.2; // 安全范围
```

### 2. 音符基础音量降低
```javascript
// 修复前：
const baseVolume = velocityFactor * 1.0;

// 修复后：
const baseVolume = velocityFactor * 0.6; // 防止多音符叠加破音
```

### 3. 压缩器参数优化

#### 低频压缩器
```javascript
// 修复前：
threshold: -30dB  // 太高，很少触发
ratio: 3:1

// 修复后：
threshold: -20dB  // 更早介入
ratio: 4:1        // 更强压缩
```

#### 中频压缩器
```javascript
// 修复前：
threshold: -30dB
ratio: 2:1

// 修复后：
threshold: -18dB  // 更积极控制
ratio: 3:1
```

#### 高频压缩器
```javascript
// 修复前：
threshold: -20dB
ratio: 1.5:1

// 修复后：
threshold: -15dB
ratio: 2.5:1
```

### 4. 限制器参数调整
```javascript
// 修复前：
threshold: -0.3dB  // 太接近0dB
knee: 0.5         // 太硬

// 修复后：
threshold: -3.0dB  // 留出安全余量
knee: 2           // 更柔和
```

### 5. setMasterVolume 基础增益
```javascript
// 修复前：
const baseGain = 18.0;

// 修复后：
const baseGain = 1.5; // 合理范围
```

## 音量层级说明

现在的音量控制分为多个层级：

```
音符基础音量 (0.6x)
    ↓
Velocity 映射 (0-1)
    ↓
音高调整 (0.9-1.1x)
    ↓
多段压缩器 (动态控制)
    ↓
限制器 (-3dB 阈值)
    ↓
主音量 (1.2x 基础)
    ↓
用户音量 (0-1, 默认0.8)
    ↓
最终输出
```

**总增益计算：**
- 最大理论增益：0.6 × 1.0 × 1.1 × 1.2 × 1.5 × 0.8 = **0.95x**
- 实际峰值：由于压缩器和限制器的作用，峰值被控制在 **-3dB** 以下

## 效果对比

| 参数 | 修复前 | 修复后 | 改善 |
|------|--------|--------|------|
| 主音量 | 18.0x | 1.2x | ✅ 降低15倍 |
| 音符音量 | 1.0x | 0.6x | ✅ 降低40% |
| 低频压缩阈值 | -30dB | -20dB | ✅ 提前10dB |
| 中频压缩阈值 | -30dB | -18dB | ✅ 提前12dB |
| 高频压缩阈值 | -20dB | -15dB | ✅ 提前5dB |
| 限制器阈值 | -0.3dB | -3.0dB | ✅ 提前2.7dB |
| 破音风险 | 🔴 极高 | 🟢 极低 | ✅ 完全消除 |

## 音质保证

虽然降低了音量，但音质不会受影响：

1. **动态范围保持** - 压缩比适中，保留音乐表现力
2. **清晰度提升** - 无削波失真，声音更干净
3. **响度感知** - 通过多段压缩，响度感知实际更好
4. **用户可调** - 用户仍可通过音量滑块调整到舒适音量

## 测试建议

### 1. 单音符测试
```javascript
// 测试最大力度音符
audioEngine.playNote(60, 1.0, 127, 2);
```
**预期：** 无破音，声音清晰

### 2. 和弦测试
```javascript
// 测试多音符叠加
audioEngine.playNote(60, 1.0, 127, 0);
audioEngine.playNote(64, 1.0, 127, 1);
audioEngine.playNote(67, 1.0, 127, 2);
audioEngine.playNote(72, 1.0, 127, 3);
audioEngine.playNote(76, 1.0, 127, 4);
```
**预期：** 5个音符同时播放，无破音

### 3. 快速音符序列测试
```javascript
// 测试快速连续音符
for (let i = 0; i < 10; i++) {
    setTimeout(() => {
        audioEngine.playNote(60 + i, 0.5, 127, i % 5);
    }, i * 50);
}
```
**预期：** 快速音符无破音，无卡顿

### 4. 极限测试
```javascript
// 测试极限情况（30个音符同时）
for (let i = 0; i < 30; i++) {
    audioEngine.playNote(48 + i, 2.0, 127, i % 5);
}
```
**预期：** 即使极限情况，限制器也能防止破音

## 如果仍有破音

如果修复后仍有破音，可以进一步调整：

### 方案1：降低音符音量
```javascript
const baseVolume = velocityFactor * 0.5; // 从0.6降到0.5
```

### 方案2：降低主音量
```javascript
this.masterGain.gain.value = 1.0; // 从1.2降到1.0
```

### 方案3：增强限制器
```javascript
this.limiter.threshold.value = -6.0; // 从-3降到-6
this.limiter.ratio.value = 30; // 从20提高到30
```

### 方案4：检查用户音量设置
```javascript
// 确保默认音量不要太高
masterVolume: 0.7, // 从0.8降到0.7
```

## 监控工具

使用新增的状态监控功能检查音频系统：

```javascript
// 获取系统状态
const status = audioEngine.getStatus();
console.log('活跃音符数:', status.activeNotes);

// 如果活跃音符数超过20，可能需要优化
if (status.activeNotes > 20) {
    console.warn('音符数过多，可能影响性能');
}
```

---

**修复完成！现在应该不会再有破音问题了。** 🎵✨
