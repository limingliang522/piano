# 音色配置系统迁移指南

## 从旧系统迁移到 v4.0

### 变更概述

音色配置系统已完全重写，提供更清晰的架构和更强的扩展性。

### 主要变更

#### 1. 新增文件
- `timbre-config.js` - 音色配置系统核心

#### 2. 更新文件
- `audio-engine.js` - 集成音色配置系统
- `index.html` - 引入新的配置文件

#### 3. 新增功能
- 统一的音色管理
- 运行时音色切换
- 自动化采样加载

### 代码迁移

#### 旧代码（v3.0）

```javascript
// 初始化音频引擎
const audioEngine = new AudioEngine();
await audioEngine.init((loaded, total) => {
    console.log(`${loaded}/${total}`);
});
```

#### 新代码（v4.0）

```javascript
// 初始化音频引擎（完全兼容）
const audioEngine = new AudioEngine();
await audioEngine.init((loaded, total) => {
    console.log(`${loaded}/${total}`);
});

// 新功能：切换音色
await audioEngine.switchTimbre('bright', (loaded, total) => {
    console.log(`${loaded}/${total}`);
});

// 新功能：获取音色信息
const timbreInfo = audioEngine.getCurrentTimbreInfo();
console.log(timbreInfo.name);
```

### HTML 文件更新

#### 旧代码

```html
<script src="audio-engine.js?v=14.0"></script>
```

#### 新代码

```html
<script src="timbre-config.js?v=15.0"></script>
<script src="audio-engine.js?v=15.0"></script>
```

### 兼容性

✅ **完全向后兼容**
- 所有现有代码无需修改
- 默认使用 Steinway Grand 音色
- 保留所有原有功能

### 新增 API

```javascript
// 切换音色
await audioEngine.switchTimbre(timbreId, progressCallback);

// 获取当前音色信息
const info = audioEngine.getCurrentTimbreInfo();

// 获取所有可用音色
const timbres = audioEngine.getAvailableTimbres();
```

### 测试

1. 打开 `test-timbre-system.html`
2. 测试音色切换功能
3. 验证所有音符正常播放

### 回滚

如果需要回滚到旧版本：

1. 从 `index.html` 中移除 `timbre-config.js` 引用
2. 恢复 `audio-engine.js.backup`（如果有）
3. 清除浏览器缓存

### 常见问题

**Q: 需要修改现有代码吗？**
A: 不需要，新系统完全向后兼容。

**Q: 如何添加新音色？**
A: 在 `timbre-config.js` 中注册新音色配置即可。

**Q: 性能有影响吗？**
A: 没有，加载速度和内存占用保持不变。

### 支持

如有问题，请查看：
- `TIMBRE_CONFIG_SYSTEM.md` - 完整文档
- `test-timbre-system.html` - 测试页面
- 浏览器控制台 - 错误信息
