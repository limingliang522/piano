# 后处理效果系统使用指南

## 概述

后处理效果系统为游戏提供了高级视觉效果，包括泛光（Bloom）和环境光遮蔽（SSAO）。系统会根据设备性能自动调整效果，确保流畅的游戏体验。

## 功能特性

### 1. 泛光效果（Bloom）
- **作用**: 让明亮的物体产生发光效果
- **参数**: 
  - 强度: 0.5（可调整）
  - 阈值: 0.8（只有亮度超过此值的像素才会发光）
  - 半径: 0.4
- **适用对象**: 白色物体（触发线、已触发方块）

### 2. 环境光遮蔽（SSAO）
- **作用**: 增强场景的深度感和真实感
- **参数**:
  - 半径: 0.5
  - 强度: 0.3
- **启用条件**: 仅在 high/ultra 画质级别启用
- **性能保护**: FPS < 45 时自动禁用

## 使用方法

### 在游戏中使用

后处理系统已集成到游戏的渲染管理器中，会自动初始化和运行。

#### 通过UI控制

1. **打开设置页面**: 点击灵动岛，切换到"设置"标签
2. **后处理开关**: 切换"后处理效果"开关来启用/禁用
3. **画质级别**: 选择画质级别（低/中/高/超高）
   - 低/中画质: 不启用后处理
   - 高/超高画质: 启用后处理和SSAO

#### 通过代码控制

```javascript
// 启用/禁用后处理
renderManager.postProcessing.setEnabled(true);

// 调整泛光强度（0.0 - 2.0）
renderManager.postProcessing.setIntensity('bloom', 0.8);

// 调整SSAO强度（0.0 - 1.0）
renderManager.postProcessing.setIntensity('ssao', 0.5);

// 手动添加/移除SSAO
renderManager.postProcessing.addSSAOEffect();
renderManager.postProcessing.removeSSAOEffect();

// 设置画质级别（会自动调整后处理）
renderManager.qualityAdapter.setManualQuality('high');
```

### 测试页面

项目包含一个独立的测试页面 `test-post-processing.html`，可以用来测试和调试后处理效果。

**使用方法**:
1. 在浏览器中打开 `test-post-processing.html`
2. 使用左侧控制面板调整效果参数
3. 观察场景中的视觉变化

**测试场景包含**:
- 白色发光立方体（测试泛光效果）
- 蓝色球体和圆环（测试SSAO效果）
- 地面（测试阴影和SSAO）

## API 参考

### PostProcessing 类

#### 构造函数
```javascript
new PostProcessing(renderer, scene, camera)
```

#### 方法

##### initialize()
初始化后处理管线，创建 EffectComposer 和渲染目标。

**返回**: `boolean` - 初始化是否成功

##### addBloomEffect()
添加泛光效果到后处理管线。

**返回**: `boolean` - 添加是否成功

##### addSSAOEffect()
添加环境光遮蔽效果到后处理管线。

**返回**: `boolean` - 添加是否成功

**注意**: 仅在 high/ultra 画质级别可用

##### removeSSAOEffect()
移除SSAO效果。

##### setEnabled(enabled)
启用或禁用后处理效果。

**参数**:
- `enabled` (boolean): 是否启用

##### setQualityLevel(level)
设置画质级别，用于决定是否启用SSAO。

**参数**:
- `level` (string): 画质级别 ('low' | 'medium' | 'high' | 'ultra')

##### setIntensity(effectName, intensity)
调整效果强度。

**参数**:
- `effectName` (string): 效果名称 ('bloom' | 'ssao')
- `intensity` (number): 强度值 (0.0 - 1.0 for SSAO, 0.0 - 2.0 for bloom)

##### render()
渲染场景（使用后处理或直接渲染）。

##### onWindowResize()
窗口大小调整时更新渲染目标。

##### dispose()
清理资源。

## 性能优化

### 自动性能调整

系统会自动监控FPS并调整后处理效果：

1. **画质自适应**: 根据设备性能自动选择合适的画质级别
2. **SSAO自动禁用**: 当FPS < 45时，自动禁用SSAO以提升性能
3. **防抖机制**: 避免频繁切换画质（5秒冷却时间）

### 手动优化建议

如果遇到性能问题：

1. **降低画质级别**: 从 ultra → high → medium → low
2. **禁用后处理**: 关闭后处理效果开关
3. **关闭SSAO**: 单独禁用SSAO，保留泛光效果
4. **降低泛光强度**: 减小泛光强度值

## 浏览器兼容性

### 支持的浏览器
- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

### 必需的Three.js库
确保HTML中包含以下脚本：

```html
<script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/postprocessing/EffectComposer.js"></script>
<script src="https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/postprocessing/RenderPass.js"></script>
<script src="https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/postprocessing/ShaderPass.js"></script>
<script src="https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/postprocessing/UnrealBloomPass.js"></script>
<script src="https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/postprocessing/SSAOPass.js"></script>
<script src="https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/shaders/CopyShader.js"></script>
<script src="https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/shaders/LuminosityHighPassShader.js"></script>
<script src="https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/shaders/SSAOShader.js"></script>
```

## 故障排除

### 后处理不工作

**问题**: 后处理效果没有显示

**解决方案**:
1. 检查浏览器控制台是否有错误
2. 确认Three.js后处理库已正确加载
3. 检查后处理是否已启用: `renderManager.postProcessing.enabled`
4. 确认画质级别支持后处理（high/ultra）

### SSAO无法启用

**问题**: SSAO效果无法启用

**解决方案**:
1. 确认画质级别为 high 或 ultra
2. 检查FPS是否低于45（会自动禁用）
3. 手动调用 `renderManager.postProcessing.addSSAOEffect()`

### 性能下降

**问题**: 启用后处理后FPS明显下降

**解决方案**:
1. 降低画质级别
2. 禁用SSAO，只保留泛光
3. 降低泛光强度
4. 检查设备是否支持WebGL 2.0

## 开发者注意事项

### 窗口调整

确保在窗口大小调整时调用后处理的resize方法：

```javascript
function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    
    // 重要：更新后处理渲染目标
    if (renderManager && renderManager.postProcessing) {
        renderManager.postProcessing.onWindowResize();
    }
}
```

### 资源清理

在场景销毁时，记得清理后处理资源：

```javascript
if (renderManager && renderManager.postProcessing) {
    renderManager.postProcessing.dispose();
}
```

### 自定义效果

如需添加其他后处理效果，可以扩展 PostProcessing 类：

```javascript
// 在 PostProcessing 类中添加新方法
addCustomEffect() {
    if (!this.composer) return false;
    
    // 创建自定义Pass
    const customPass = new THREE.CustomPass();
    this.composer.addPass(customPass);
    
    return true;
}
```

## 更新日志

### v1.0 (2024-11-24)
- ✅ 实现 PostProcessing 类
- ✅ 添加泛光效果（UnrealBloomPass）
- ✅ 添加环境光遮蔽效果（SSAOPass）
- ✅ 集成到渲染流程
- ✅ 添加UI控制界面
- ✅ 实现性能自适应
- ✅ 创建测试页面

## 相关文档

- [设计文档](./kiro/specs/rendering-system-enhancement/design.md)
- [需求文档](./kiro/specs/rendering-system-enhancement/requirements.md)
- [任务列表](./kiro/specs/rendering-system-enhancement/tasks.md)
