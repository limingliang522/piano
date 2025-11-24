# 错误处理和恢复指南

本文档说明了渲染系统的错误处理和恢复功能。

## 功能概述

渲染系统实现了两个主要的错误处理功能：

### 1. WebGL上下文丢失处理

当WebGL上下文丢失时（通常由于设备内存不足或驱动崩溃），系统会：

- 自动暂停游戏
- 暂停背景音乐
- 显示错误提示："渲染引擎出现问题，正在尝试恢复..."
- 1秒后自动尝试恢复上下文
- 恢复成功后重新初始化渲染系统
- 显示成功消息并提示用户可以继续游戏

**实现位置**: `game.js` 中的 `handleWebGLContextLost()` 和 `handleWebGLContextRestored()` 函数

**事件监听**:
```javascript
canvas.addEventListener('webglcontextlost', handleWebGLContextLost, false);
canvas.addEventListener('webglcontextrestored', handleWebGLContextRestored, false);
canvas.addEventListener('webglcontextcreationerror', handleWebGLContextCreationError, false);
```

### 2. 性能降级失败处理

当系统在最低画质下仍然无法达到25 FPS时，系统会：

- 检测严重性能不足状态
- 显示性能警告提示
- 提供"极简模式"选项
- 建议用户关闭其他应用或使用更好的设备

**实现位置**: `render-system.js` 中的 `QualityAdapter` 类

**触发条件**:
- 当前画质级别为 `low`（最低）
- 平均FPS < 25

**极简模式配置**:
```javascript
{
    name: '极简',
    shadowMapSize: 512,
    pixelRatio: 0.5,        // 降低到0.5x分辨率
    antialias: false,
    fogDistance: 50,        // 减少可见距离到50单位
    maxLights: 1,
    postProcessing: false,
    lodDistances: [15, 30, 50]
}
```

**极简模式效果**:
- 禁用所有阴影
- 禁用后处理效果
- 降低分辨率到0.5x
- 减少可见距离到50单位
- 更激进的LOD距离设置

## 使用方法

### 自动错误处理

错误处理功能在游戏初始化时自动设置，无需手动配置：

```javascript
// 在 init() 函数中自动调用
setupWebGLErrorHandlers();
```

### 手动触发极简模式

如果需要手动启用极简模式：

```javascript
if (renderManager && renderManager.qualityAdapter) {
    renderManager.qualityAdapter.enableMinimalMode();
}
```

### 手动显示性能警告

```javascript
if (renderManager && renderManager.qualityAdapter) {
    const currentFPS = renderManager.performanceMonitor.getCurrentFPS();
    renderManager.qualityAdapter.showPerformanceWarning(currentFPS);
}
```

## 测试

使用 `test-error-handling.html` 测试错误处理功能：

1. 在浏览器中打开 `test-error-handling.html`
2. 点击"触发上下文丢失"按钮测试WebGL上下文丢失和恢复
3. 点击"显示性能警告"按钮测试性能警告UI
4. 点击"启用极简模式"按钮测试极简模式切换

## 用户界面

### 性能警告UI

性能警告会显示一个模态对话框，包含：

- 警告图标和标题
- 当前FPS信息
- 建议操作列表
- "启用极简模式"按钮
- "继续游戏"按钮

### 错误提示UI

WebGL错误会显示一个错误提示框，包含：

- 错误图标
- 错误类型（渲染错误/性能警告/提示）
- 详细错误信息
- 自动恢复进度

## 技术细节

### WebGL上下文恢复流程

1. 检测到上下文丢失事件
2. 调用 `event.preventDefault()` 阻止默认行为
3. 暂停游戏和音乐
4. 显示错误提示
5. 1秒后调用 `renderer.forceContextRestore()`
6. 等待上下文恢复事件
7. 重新初始化渲染管理器
8. 显示成功消息
9. 等待用户手动重新开始游戏

### 性能降级检测流程

1. `PerformanceMonitor` 持续监控FPS
2. `QualityAdapter` 在 `update()` 中检查性能
3. 当FPS < 30持续3秒时，自动降低画质
4. 如果已经是最低画质，调用 `checkPerformanceDegradationFailure()`
5. 检测到FPS < 25时，显示性能警告
6. 用户可以选择启用极简模式或继续游戏

### 极简模式优化策略

极简模式通过以下方式提升性能：

1. **分辨率降低**: 从原生分辨率降低到0.5x，减少像素填充率
2. **阴影禁用**: 完全禁用阴影渲染，节省大量GPU资源
3. **后处理禁用**: 禁用泛光、SSAO等后处理效果
4. **可见距离减少**: 从120单位减少到50单位，减少渲染对象数量
5. **LOD距离调整**: 更早地切换到低细节模型

## 注意事项

1. **上下文恢复限制**: 某些浏览器或设备可能不支持上下文恢复，此时需要刷新页面
2. **极简模式不可逆**: 启用极简模式后会禁用自动画质调整，需要手动刷新页面恢复
3. **性能警告频率**: 性能警告有30秒的冷却时间，避免频繁弹出
4. **浏览器兼容性**: WebGL上下文丢失处理在所有现代浏览器中都支持，但恢复成功率可能因设备而异

## 相关需求

- **需求7.1**: 不再需要的纹理和几何体时，立即释放相关GPU内存
- **需求7.3**: 在场景切换时清理所有未使用的资源
- **需求1.1**: 游戏在各种设备上都能流畅运行

## 相关文件

- `game.js`: WebGL上下文丢失处理
- `render-system.js`: 性能降级失败处理和极简模式
- `test-error-handling.html`: 错误处理功能测试页面
