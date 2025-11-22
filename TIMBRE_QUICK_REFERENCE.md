# 音色配置系统 - 快速参考

## 🚀 快速开始

```javascript
// 1. 创建音频引擎
const audioEngine = new AudioEngine();

// 2. 初始化（默认 Steinway Grand）
await audioEngine.init((loaded, total) => {
    console.log(`${loaded}/${total}`);
});

// 3. 启动
await audioEngine.start();

// 4. 播放音符
audioEngine.playNote(60, 1.0, 80, 2);
```

## 🎹 可用音色

| ID | 名称 | 类型 | 文件数 | 大小 |
|----|------|------|--------|------|
| `steinway` | Steinway Grand Piano | 多层 | 96 | 30-50 MB |
| `bright` | Bright Acoustic Piano | 单层 | 52 | 15-25 MB |

## 🔄 切换音色

```javascript
// 切换到 Bright Acoustic
await audioEngine.switchTimbre('bright', (loaded, total) => {
    console.log(`加载: ${loaded}/${total}`);
});

// 切换回 Steinway Grand
await audioEngine.switchTimbre('steinway');
```

## 📊 获取信息

```javascript
// 当前音色信息
const info = audioEngine.getCurrentTimbreInfo();
console.log(info.name);        // "Steinway Grand Piano"
console.log(info.totalFiles);  // 96
console.log(info.type);        // "multilayer"

// 所有可用音色
const timbres = audioEngine.getAvailableTimbres();
timbres.forEach(t => console.log(t.name));

// 系统状态
const status = audioEngine.getStatus();
console.log(status.isReady);         // true/false
console.log(status.samplesLoaded);   // 96
console.log(status.activeNotes);     // 0
```

## 🎵 播放控制

```javascript
// 播放音符
const noteId = audioEngine.playNote(
    60,    // MIDI 音符号
    1.0,   // 持续时间（秒）
    80,    // 力度 (0-127)
    2      // 轨道 (0-4)
);

// 提前停止音符
audioEngine.stopNote(noteId, 0.05);

// 停止所有音符
audioEngine.stopAllNotes();
```

## ⚙️ 设置

```javascript
// 主音量 (0.0 - 1.0)
audioEngine.setMasterVolume(0.8);

// 性能模式
audioEngine.setPerformanceMode('high');   // 'high', 'medium', 'low'

// 混响开关
audioEngine.toggleReverb(true);

// 3D音频开关
audioEngine.toggleSpatialAudio(true);
```

## 🎨 添加新音色

```javascript
// 在 timbre-config.js 中
this.registerTimbre('my-piano', {
    name: 'My Piano',
    type: 'singlelayer',
    basePath: './my-samples/',
    filePattern: '{note}.mp3',
    samplePoints: ['C0', 'C1', 'C2', 'C3', 'C4', 'C5', 'C6', 'C7', 'C8'],
    totalFiles: 9
});
```

## 🧪 测试

```javascript
// 测试音阶
const scale = [60, 62, 64, 65, 67, 69, 71, 72];
scale.forEach((note, i) => {
    setTimeout(() => {
        audioEngine.playNote(note, 0.8, 70, 2);
    }, i * 400);
});

// 测试和弦
audioEngine.playNote(60, 2.0, 80, 2); // C
audioEngine.playNote(64, 2.0, 75, 2); // E
audioEngine.playNote(67, 2.0, 70, 2); // G
```

## 📁 文件结构

```
项目/
├── timbre-config.js          # 音色配置
├── audio-engine.js           # 音频引擎
├── test-timbre-system.html   # 测试页面
└── 钢琴/
    └── Steinway Grand (DS)/
        └── *.mp3
```

## 🔗 相关文档

- `TIMBRE_CONFIG_SYSTEM.md` - 完整文档
- `MIGRATION_GUIDE.md` - 迁移指南
- `test-timbre-system.html` - 可视化测试

## 💡 提示

- 默认音色是 Steinway Grand
- 切换音色会清空当前采样
- 所有操作都是异步的
- 支持实时进度回调
- 完全向后兼容

## ⚠️ 注意事项

- 确保在 HTML 中先引入 `timbre-config.js`
- 音色切换会中断当前播放的音符
- 大型音色加载可能需要几秒钟
- 建议在用户交互后初始化音频上下文
