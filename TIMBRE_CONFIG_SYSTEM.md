# 音色配置系统 v4.0

## 概述

全新的音色配置系统，统一管理所有钢琴音色，支持多种采样格式，易于扩展。

## 核心特性

### ✨ 统一配置管理
- 所有音色配置集中在 `TimbreConfig` 类中
- 支持多层采样和单层采样
- 自动处理文件路径和命名规则

### 🎹 支持多种音色
- **Steinway Grand Piano**: 专业级多层采样（12点×4力度×2轮询=96文件）
- **Bright Acoustic Piano**: 标准单层采样（52个音符）
- 可轻松添加更多音色

### 🔄 动态切换
- 运行时切换音色
- 自动清理旧采样
- 无缝加载新音色

### 📦 智能加载
- 自动生成加载列表
- 并行加载所有采样
- 实时进度反馈

## 文件结构

```
项目根目录/
├── timbre-config.js          # 音色配置系统（新）
├── audio-engine.js           # 音频引擎（已更新）
├── test-timbre-system.html   # 测试页面（新）
└── 钢琴/
    └── Steinway Grand (DS)/
        └── *.mp3
```

## 使用方法

### 1. 基本初始化

```javascript
// 创建音频引擎（自动包含音色配置系统）
const audioEngine = new AudioEngine();

// 初始化（使用默认音色：Steinway Grand）
await audioEngine.init((loaded, total) => {
    console.log(`加载进度: ${loaded}/${total}`);
});

// 启动音频上下文
await audioEngine.start();
```

### 2. 切换音色

```javascript
// 切换到 Bright Acoustic Piano
await audioEngine.switchTimbre('bright', (loaded, total) => {
    console.log(`加载进度: ${loaded}/${total}`);
});

// 切换回 Steinway Grand
await audioEngine.switchTimbre('steinway', (loaded, total) => {
    console.log(`加载进度: ${loaded}/${total}`);
});
```

### 3. 获取音色信息

```javascript
// 获取当前音色信息
const currentTimbre = audioEngine.getCurrentTimbreInfo();
console.log(currentTimbre.name); // "Steinway Grand Piano"

// 获取所有可用音色
const allTimbres = audioEngine.getAvailableTimbres();
allTimbres.forEach(timbre => {
    console.log(`${timbre.name}: ${timbre.totalFiles} 文件`);
});
```

### 4. 播放音符

```javascript
// 播放音符（自动使用当前音色）
audioEngine.playNote(60, 1.0, 80, 2); // C4, 1秒, 力度80, 轨道2
```

## 音色配置格式

### 多层采样音色（Steinway Grand）

```javascript
{
    name: 'Steinway Grand Piano',
    description: '专业级多层采样，温暖厚重，真实动态',
    type: 'multilayer',
    basePath: './钢琴/Steinway Grand  (DS)/',
    filePattern: 'Steinway_{note}_Dyn{dyn}_RR{rr}.mp3',
    samplePoints: ['C0', 'G0', 'D1', 'A1', 'E2', 'B2', 'F#3', 'C#4', 'G#4', 'D#5', 'A#5', 'F6'],
    dynamics: [1, 2, 3, 4],
    roundRobins: [1, 2],
    velocityMapping: {
        1: [0, 31],    // pp
        2: [32, 63],   // mp
        3: [64, 95],   // mf
        4: [96, 127]   // ff
    },
    totalFiles: 96,
    estimatedSize: '30-50 MB',
    features: {
        multiDynamics: true,
        roundRobin: true,
        spatialAudio: true
    }
}
```

### 单层采样音色（Bright Acoustic）

```javascript
{
    name: 'Bright Acoustic Piano',
    description: '明亮清晰，快速加载，适合游戏',
    type: 'singlelayer',
    basePath: './piano-samples/',
    filePattern: '{note}.mp3',
    samplePoints: ['A0', 'B0', 'C1', ..., 'C8'], // 52个音符
    dynamics: null,
    roundRobins: null,
    velocityMapping: null,
    totalFiles: 52,
    estimatedSize: '15-25 MB',
    features: {
        multiDynamics: false,
        roundRobin: false,
        spatialAudio: true
    }
}
```

## 添加新音色

### 步骤 1: 准备采样文件

将采样文件放在项目目录中，例如：
```
./piano-samples-new/
├── C0.mp3
├── C1.mp3
└── ...
```

### 步骤 2: 注册音色

在 `timbre-config.js` 的 `initializeDefaultTimbres()` 方法中添加：

```javascript
this.registerTimbre('my-piano', {
    name: 'My Custom Piano',
    description: '我的自定义钢琴音色',
    type: 'singlelayer', // 或 'multilayer'
    basePath: './piano-samples-new/',
    filePattern: '{note}.mp3',
    samplePoints: ['C0', 'C1', 'C2', 'C3', 'C4', 'C5', 'C6', 'C7', 'C8'],
    dynamics: null,
    roundRobins: null,
    velocityMapping: null,
    totalFiles: 9,
    estimatedSize: '5-10 MB',
    features: {
        multiDynamics: false,
        roundRobin: false,
        spatialAudio: true
    }
});
```

### 步骤 3: 使用新音色

```javascript
await audioEngine.switchTimbre('my-piano');
```

## API 参考

### TimbreConfig 类

#### 方法

- `registerTimbre(id, config)` - 注册新音色
- `getTimbre(id)` - 获取音色配置
- `getCurrentTimbre()` - 获取当前音色
- `setCurrentTimbre(id)` - 设置当前音色
- `getAllTimbres()` - 获取所有音色列表
- `generateFileName(timbreId, note, dyn, rr)` - 生成文件名
- `generateSampleKey(note, dyn, rr)` - 生成采样键名
- `selectDynamicLayer(timbreId, velocity)` - 选择力度层
- `selectRoundRobin(timbreId)` - 选择轮询
- `findClosestSample(timbreId, targetMidi)` - 查找最接近的采样
- `getLoadList(timbreId)` - 获取加载列表

### AudioEngine 类（新增方法）

- `switchTimbre(timbreId, progressCallback)` - 切换音色
- `getCurrentTimbreInfo()` - 获取当前音色信息
- `getAvailableTimbres()` - 获取所有可用音色

## 测试页面

打开 `test-timbre-system.html` 进行测试：

### 功能
- ✅ 可视化音色选择
- ✅ 实时加载进度
- ✅ 虚拟钢琴键盘
- ✅ 音阶和和弦测试
- ✅ 系统信息显示

### 测试步骤
1. 打开 `test-timbre-system.html`
2. 选择一个音色（Steinway 或 Bright）
3. 点击"初始化音频引擎"
4. 等待加载完成
5. 使用虚拟键盘或测试按钮播放音符

## 性能对比

| 音色 | 文件数 | 大小 | 加载时间 | 内存占用 | 音质 |
|------|--------|------|----------|----------|------|
| Steinway Grand | 96 | 30-50 MB | 5-15秒 | 150-200 MB | ⭐⭐⭐⭐⭐ |
| Bright Acoustic | 52 | 15-25 MB | 2-5秒 | 50-80 MB | ⭐⭐⭐⭐ |

## 优势

### 🎯 清晰的架构
- 配置与逻辑分离
- 易于理解和维护
- 代码复用性高

### 🔧 易于扩展
- 添加新音色只需配置
- 无需修改核心代码
- 支持各种采样格式

### 🚀 高性能
- 并行加载所有采样
- 智能采样选择
- 最小化内存占用

### 🎨 灵活性
- 运行时切换音色
- 支持多种采样类型
- 可自定义配置

## 兼容性

- ✅ 完全向后兼容
- ✅ 保留所有现有功能
- ✅ 不影响游戏逻辑
- ✅ 支持所有浏览器

## 未来计划

### 短期
- [ ] 添加更多预设音色
- [ ] 支持音色预览
- [ ] 实现渐进式加载

### 中期
- [ ] 支持 SoundFont 格式
- [ ] 添加音色编辑器
- [ ] 实现音色混合

### 长期
- [ ] 云端音色库
- [ ] 用户自定义音色
- [ ] AI 音色生成

## 故障排除

### 问题：音色切换后无声音
**解决**：确保调用了 `audioEngine.start()` 恢复音频上下文

### 问题：加载进度卡住
**解决**：检查文件路径和网络连接，查看浏览器控制台错误

### 问题：某些音符无声音
**解决**：检查采样文件是否完整，查看 `samplePoints` 配置

## 总结

新的音色配置系统提供了：
- 🎹 统一的音色管理
- 🔄 灵活的音色切换
- 📦 智能的加载机制
- 🎨 易于扩展的架构

现在你可以轻松管理和切换多种钢琴音色，为游戏带来更丰富的音频体验！
