# 设计文档

## 概述

本文档描述了游戏渲染系统的增强设计，旨在通过引入自适应性能管理、视锥剔除、对象池、LOD 系统、批处理优化和后处理效果等技术，显著提升渲染性能和视觉质量。

当前系统基于 Three.js r150+，使用 WebGL 渲染器，支持实时阴影和雾效果。主要性能瓶颈包括：
- 大量音符方块的创建和销毁导致频繁的内存分配
- 所有方块无论是否可见都参与渲染
- 缺乏自适应画质调整机制
- 未充分利用 GPU 实例化渲染能力

## 架构

### 系统架构图

```
┌─────────────────────────────────────────────────────────────┐
│                      游戏主循环 (animate)                      │
└────────────────────┬────────────────────────────────────────┘
                     │
        ┌────────────┴────────────┐
        │                         │
┌───────▼────────┐      ┌────────▼─────────┐
│  性能监控器     │      │   渲染管理器      │
│ PerformanceMonitor│    │ RenderManager    │
└───────┬────────┘      └────────┬─────────┘
        │                         │
        │ 性能数据                 │ 渲染指令
        │                         │
┌───────▼────────┐      ┌────────▼─────────┐
│  画质适配器     │      │  场景管理器       │
│ QualityAdapter │      │ SceneManager     │
└────────────────┘      └────────┬─────────┘
                                 │
                    ┌────────────┼────────────┐
                    │            │            │
            ┌───────▼──────┐ ┌──▼──────┐ ┌──▼────────┐
            │ 视锥剔除器    │ │对象池   │ │LOD管理器  │
            │FrustumCuller │ │ObjectPool│ │LODManager │
            └──────────────┘ └─────────┘ └───────────┘
```

### 核心模块

1. **RenderManager**: 渲染系统的核心控制器
2. **PerformanceMonitor**: 性能监控和数据收集
3. **QualityAdapter**: 自适应画质调整
4. **FrustumCuller**: 视锥剔除实现
5. **ObjectPool**: 对象池管理
6. **LODManager**: 细节层次管理
7. **BatchRenderer**: 批处理渲染器
8. **PostProcessing**: 后处理效果管理


## 组件和接口

### 1. RenderManager (渲染管理器)

**职责**: 统一管理所有渲染相关的子系统，协调各模块工作

**接口**:
```javascript
class RenderManager {
  constructor(scene, camera, renderer)
  
  // 初始化所有子系统
  initialize()
  
  // 每帧更新
  update(deltaTime)
  
  // 渲染场景
  render()
  
  // 获取性能统计
  getPerformanceStats()
  
  // 设置画质级别
  setQualityLevel(level) // 'low' | 'medium' | 'high' | 'ultra'
  
  // 启用/禁用后处理
  setPostProcessing(enabled)
}
```

**实现细节**:
- 持有所有子系统的引用
- 按顺序调用各子系统的更新方法
- 处理渲染管线的协调工作

### 2. PerformanceMonitor (性能监控器)

**职责**: 实时监控渲染性能指标，为自适应画质提供数据支持

**接口**:
```javascript
class PerformanceMonitor {
  constructor()
  
  // 开始帧计时
  beginFrame()
  
  // 结束帧计时
  endFrame()
  
  // 获取当前FPS
  getCurrentFPS()
  
  // 获取平均FPS（最近N帧）
  getAverageFPS(frameCount = 60)
  
  // 获取渲染统计
  getRenderStats() // { drawCalls, triangles, geometries, textures }
  
  // 检查是否需要降低画质
  shouldReduceQuality()
  
  // 检查是否可以提升画质
  canIncreaseQuality()
}
```

**实现细节**:
- 使用 `performance.now()` 进行高精度计时
- 维护一个固定大小的帧时间环形缓冲区（120帧）
- 从 `renderer.info` 获取渲染统计数据
- 使用滑动窗口算法计算平均FPS
- 设置阈值：低于30 FPS持续3秒触发降质，高于55 FPS持续5秒可升质


### 3. QualityAdapter (画质适配器)

**职责**: 根据性能数据自动调整渲染画质设置

**接口**:
```javascript
class QualityAdapter {
  constructor(renderer, performanceMonitor)
  
  // 初始化，检测设备性能
  initialize()
  
  // 每帧更新，检查是否需要调整画质
  update()
  
  // 应用画质配置
  applyQualitySettings(level)
  
  // 获取当前画质级别
  getCurrentQuality()
  
  // 手动设置画质（禁用自动调整）
  setManualQuality(level)
  
  // 启用自动调整
  enableAutoAdjust()
}
```

**画质级别配置**:
```javascript
const QUALITY_PRESETS = {
  low: {
    shadowMapSize: 1024,
    pixelRatio: 1.0,
    antialias: false,
    fogDistance: 80,
    maxLights: 1,
    postProcessing: false,
    lodDistances: [20, 50, 100]
  },
  medium: {
    shadowMapSize: 2048,
    pixelRatio: Math.min(window.devicePixelRatio, 1.5),
    antialias: true,
    fogDistance: 100,
    maxLights: 2,
    postProcessing: false,
    lodDistances: [30, 70, 120]
  },
  high: {
    shadowMapSize: 2048,
    pixelRatio: Math.min(window.devicePixelRatio, 2.0),
    antialias: true,
    fogDistance: 120,
    maxLights: 2,
    postProcessing: true,
    lodDistances: [30, 80, 150]
  },
  ultra: {
    shadowMapSize: 4096,
    pixelRatio: window.devicePixelRatio,
    antialias: true,
    fogDistance: 150,
    maxLights: 2,
    postProcessing: true,
    lodDistances: [40, 100, 180]
  }
}
```

**实现细节**:
- 启动时进行设备性能检测（GPU型号、内存、屏幕分辨率）
- 根据检测结果选择初始画质级别
- 每秒检查一次性能数据，决定是否调整
- 使用防抖机制避免频繁切换（5秒冷却时间）
- 平滑过渡：逐步调整参数而非立即切换


### 4. FrustumCuller (视锥剔除器)

**职责**: 判断物体是否在相机视野内，只渲染可见物体

**接口**:
```javascript
class FrustumCuller {
  constructor(camera)
  
  // 更新视锥体（相机移动后调用）
  updateFrustum()
  
  // 检查物体是否可见
  isVisible(object)
  
  // 批量检查多个物体
  cullObjects(objects)
  
  // 获取可见物体列表
  getVisibleObjects()
  
  // 获取剔除统计
  getCullingStats() // { total, visible, culled }
}
```

**实现细节**:
- 使用 Three.js 的 `Frustum` 类进行视锥体计算
- 为每个音符方块添加包围球（Bounding Sphere）
- 使用包围球进行快速相交测试
- 额外的距离剔除：超过150单位的物体直接标记为不可见
- 优化：只对移动的物体进行剔除检查，静态物体缓存结果

**算法流程**:
```
1. 从相机投影矩阵更新视锥体的6个平面
2. 遍历所有音符方块
3. 计算方块的世界空间包围球
4. 检查包围球是否与视锥体相交
5. 如果相交且距离<150，标记为可见
6. 更新物体的 visible 属性
```

### 5. ObjectPool (对象池)

**职责**: 管理音符方块的创建和重用，减少内存分配

**接口**:
```javascript
class ObjectPool {
  constructor(createFn, resetFn, initialSize = 100)
  
  // 获取一个对象
  acquire()
  
  // 归还对象
  release(object)
  
  // 预热池（创建初始对象）
  warmup(count)
  
  // 清空池
  clear()
  
  // 获取池统计
  getStats() // { total, active, available }
}
```

**实现细节**:
- 维护两个数组：`available`（可用）和 `active`（使用中）
- 初始化时预创建100个音符方块对象
- `acquire()` 时从 available 取出，如果为空则创建新对象
- `release()` 时重置对象状态并放回 available
- 重置操作包括：位置、旋转、缩放、材质颜色、userData
- 最大容量限制：1000个对象

**对象重置函数**:
```javascript
function resetNoteBlock(block) {
  block.position.set(0, 0, 0)
  block.rotation.set(0, 0, 0)
  block.scale.set(1, 1, 1)
  block.material.color.setHex(0x1a1a1a)
  block.material.opacity = 1.0
  block.material.emissive.setHex(0x0a0a0a)
  block.material.emissiveIntensity = 0.2
  block.visible = false
  block.userData = {}
}
```


### 6. LODManager (细节层次管理器)

**职责**: 根据物体与相机的距离动态调整模型细节

**接口**:
```javascript
class LODManager {
  constructor(camera)
  
  // 注册需要LOD管理的对象
  registerObject(object, lodLevels)
  
  // 注销对象
  unregisterObject(object)
  
  // 更新所有对象的LOD级别
  update()
  
  // 获取LOD统计
  getStats() // { high: count, medium: count, low: count }
}
```

**LOD 级别定义**:
```javascript
const NOTE_BLOCK_LOD = {
  high: {
    distance: 30,
    geometry: new THREE.BoxGeometry(1.5, 0.4, 1.2, 4, 4, 4), // 高细分
    segments: 32 // 边缘线段数
  },
  medium: {
    distance: 80,
    geometry: new THREE.BoxGeometry(1.5, 0.4, 1.2, 2, 2, 2), // 中细分
    segments: 16
  },
  low: {
    distance: 150,
    geometry: new THREE.BoxGeometry(1.5, 0.4, 1.2, 1, 1, 1), // 低细分
    segments: 8
  }
}
```

**实现细节**:
- 为每个音符方块创建3个不同细节的几何体
- 根据距离切换几何体引用
- 使用共享几何体减少内存占用
- 切换时保持材质和变换不变
- 超高方块（isTall）使用独立的LOD配置

**距离计算优化**:
```javascript
// 使用平方距离避免开方运算
const distanceSq = camera.position.distanceToSquared(object.position)
if (distanceSq < 900) { // 30^2
  setLOD(object, 'high')
} else if (distanceSq < 6400) { // 80^2
  setLOD(object, 'medium')
} else {
  setLOD(object, 'low')
}
```

### 7. BatchRenderer (批处理渲染器)

**职责**: 将多个相同材质的物体合并为一次渲染调用

**接口**:
```javascript
class BatchRenderer {
  constructor(scene)
  
  // 添加可批处理的对象
  addBatchable(object, materialKey)
  
  // 移除对象
  removeBatchable(object)
  
  // 更新批次（在渲染前调用）
  updateBatches()
  
  // 获取批处理统计
  getStats() // { batches: count, objectsPerBatch: avg }
}
```

**实现细节**:
- 使用 Three.js 的 `InstancedMesh` 进行实例化渲染
- 按材质类型分组：普通方块、超高方块、已触发方块
- 每个批次最多1000个实例
- 动态更新实例矩阵（位置、旋转、缩放）
- 只对可见物体创建实例

**批处理条件**:
- 相同几何体
- 相同材质（颜色可以通过实例属性变化）
- 同一LOD级别
- 数量 > 100 时启用批处理


### 8. PostProcessing (后处理管理器)

**职责**: 管理后处理效果的启用和配置

**接口**:
```javascript
class PostProcessing {
  constructor(renderer, scene, camera)
  
  // 初始化后处理管线
  initialize()
  
  // 启用/禁用效果
  setEnabled(enabled)
  
  // 添加效果
  addPass(pass)
  
  // 移除效果
  removePass(pass)
  
  // 渲染（替代直接渲染）
  render()
  
  // 调整效果强度
  setIntensity(effectName, intensity)
}
```

**后处理效果**:
1. **Bloom (泛光)**: 让白色物体发光
   - 强度：0.5
   - 阈值：0.8
   - 半径：0.4

2. **SSAO (环境光遮蔽)**: 增强深度感
   - 半径：0.5
   - 强度：0.3
   - 仅在 high/ultra 画质启用

**实现细节**:
- 使用 Three.js 的 `EffectComposer`
- 创建渲染目标纹理（RenderTarget）
- 按顺序应用各个 Pass
- 最后一个 Pass 输出到屏幕
- 性能监控：如果FPS < 45，自动禁用后处理

## 数据模型

### RenderConfig (渲染配置)

```javascript
{
  quality: 'high', // 'low' | 'medium' | 'high' | 'ultra'
  autoAdjust: true,
  postProcessing: true,
  shadowMapSize: 2048,
  pixelRatio: 2.0,
  antialias: true,
  fogDistance: 120,
  maxLights: 2,
  lodDistances: [30, 80, 150]
}
```

### PerformanceData (性能数据)

```javascript
{
  fps: 60,
  averageFPS: 58.5,
  frameTime: 16.67, // ms
  drawCalls: 45,
  triangles: 125000,
  geometries: 150,
  textures: 30,
  memoryUsage: 256 // MB
}
```

### CullingResult (剔除结果)

```javascript
{
  total: 500,
  visible: 120,
  culled: 380,
  cullingTime: 2.5 // ms
}
```


## 错误处理

### 1. WebGL 上下文丢失

**场景**: 设备内存不足或驱动崩溃导致 WebGL 上下文丢失

**处理策略**:
```javascript
renderer.domElement.addEventListener('webglcontextlost', (event) => {
  event.preventDefault()
  console.error('WebGL context lost')
  
  // 暂停游戏
  gameRunning = false
  
  // 显示错误提示
  showError('渲染引擎出现问题，正在尝试恢复...')
  
  // 尝试恢复
  setTimeout(() => {
    renderer.forceContextRestore()
  }, 1000)
})

renderer.domElement.addEventListener('webglcontextrestored', () => {
  console.log('WebGL context restored')
  
  // 重新初始化渲染系统
  renderManager.initialize()
  
  // 恢复游戏
  hideError()
  gameRunning = true
})
```

### 2. 内存溢出

**场景**: 创建过多对象导致内存不足

**处理策略**:
- 监控 `renderer.info.memory`
- 当几何体数量 > 1000 或纹理数量 > 100 时触发警告
- 强制执行垃圾回收：清理不可见的远距离对象
- 降低画质级别
- 减少对象池大小

```javascript
function checkMemoryUsage() {
  const info = renderer.info.memory
  
  if (info.geometries > 1000 || info.textures > 100) {
    console.warn('Memory usage high, cleaning up...')
    
    // 清理远距离对象
    noteObjects.forEach(obj => {
      if (obj.position.z > 200) {
        disposeObject(obj)
      }
    })
    
    // 降低画质
    qualityAdapter.applyQualitySettings('medium')
  }
}
```

### 3. 性能降级失败

**场景**: 即使降到最低画质仍然无法达到30 FPS

**处理策略**:
- 显示性能警告提示
- 建议用户关闭其他应用
- 提供"极简模式"选项：
  - 禁用所有特效
  - 禁用阴影
  - 降低分辨率到 0.5x
  - 减少可见距离到 50 单位

```javascript
if (performanceMonitor.getAverageFPS() < 25 && currentQuality === 'low') {
  showPerformanceWarning()
  offerMinimalMode()
}
```


## 测试策略

### 1. 性能测试

**目标**: 验证渲染优化的效果

**测试场景**:
- 低端设备（集成显卡，4GB RAM）
- 中端设备（独立显卡，8GB RAM）
- 高端设备（高性能显卡，16GB+ RAM）

**测试指标**:
- 平均 FPS
- 最低 FPS
- 帧时间方差（稳定性）
- 内存使用量
- 渲染调用次数

**测试用例**:
1. 100个音符方块同时可见
2. 500个音符方块同时可见
3. 1000个音符方块同时可见
4. 快速切换轨道（测试视锥剔除）
5. 长时间运行（测试内存泄漏）

**成功标准**:
- 低端设备：稳定 30+ FPS
- 中端设备：稳定 45+ FPS
- 高端设备：稳定 60+ FPS
- 内存使用增长 < 10MB/分钟

### 2. 功能测试

**视锥剔除测试**:
```javascript
// 测试：屏幕外的物体应该被剔除
const offScreenBlock = createNoteBlock()
offScreenBlock.position.set(100, 0, 0) // 远离视野
frustumCuller.updateFrustum()
assert(frustumCuller.isVisible(offScreenBlock) === false)
```

**对象池测试**:
```javascript
// 测试：对象应该被正确重用
const pool = new ObjectPool(createNoteBlock, resetNoteBlock, 10)
const obj1 = pool.acquire()
const id1 = obj1.uuid
pool.release(obj1)
const obj2 = pool.acquire()
assert(obj2.uuid === id1) // 应该是同一个对象
```

**LOD测试**:
```javascript
// 测试：距离变化应该触发LOD切换
const block = createNoteBlock()
block.position.set(0, 0, -20) // 近距离
lodManager.registerObject(block, NOTE_BLOCK_LOD)
lodManager.update()
assert(block.geometry === NOTE_BLOCK_LOD.high.geometry)

block.position.set(0, 0, -50) // 中距离
lodManager.update()
assert(block.geometry === NOTE_BLOCK_LOD.medium.geometry)
```

### 3. 画质适配测试

**自动降质测试**:
```javascript
// 模拟低性能场景
performanceMonitor.simulateLowFPS(25) // 模拟25 FPS
qualityAdapter.update()
// 等待3秒
await sleep(3000)
qualityAdapter.update()
assert(qualityAdapter.getCurrentQuality() === 'low')
```

**画质平滑过渡测试**:
- 手动切换画质级别
- 观察是否有明显的视觉跳变
- 验证过渡时间 < 1秒

### 4. 兼容性测试

**浏览器兼容性**:
- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

**设备兼容性**:
- Windows 10/11
- macOS 11+
- iOS 14+
- Android 10+

**WebGL 版本**:
- WebGL 1.0（降级模式）
- WebGL 2.0（完整功能）


## 实现注意事项

### 1. 与现有代码的集成

**当前渲染流程**:
```javascript
function animate(currentTime) {
  requestAnimationFrame(animate)
  
  // 更新游戏逻辑
  updatePlayer()
  updateNoteBlocks()
  
  // 直接渲染
  renderer.render(scene, camera)
}
```

**增强后的渲染流程**:
```javascript
function animate(currentTime) {
  requestAnimationFrame(animate)
  
  // 性能监控
  performanceMonitor.beginFrame()
  
  // 更新游戏逻辑
  updatePlayer()
  updateNoteBlocks()
  
  // 渲染管理器统一处理
  renderManager.update(deltaTime)
  renderManager.render()
  
  // 性能监控
  performanceMonitor.endFrame()
}
```

### 2. 音符方块创建流程改造

**当前流程**:
```javascript
function createNoteBlock(noteData) {
  const geometry = new THREE.BoxGeometry(1.5, 0.4, 1.2)
  const material = new THREE.MeshStandardMaterial({ color: 0x1a1a1a })
  const block = new THREE.Mesh(geometry, material)
  scene.add(block)
  noteObjects.push(block)
  return block
}
```

**改造后**:
```javascript
function createNoteBlock(noteData) {
  // 从对象池获取
  const block = objectPool.acquire()
  
  // 设置位置和数据
  block.position.set(x, y, z)
  block.userData.noteData = noteData
  
  // 注册到LOD管理器
  lodManager.registerObject(block, NOTE_BLOCK_LOD)
  
  // 添加到批处理器
  batchRenderer.addBatchable(block, 'normalBlock')
  
  // 不立即添加到场景，由视锥剔除器控制
  noteObjects.push(block)
  return block
}
```

### 3. 共享几何体管理

**问题**: 当前每个方块都创建独立的几何体，浪费内存

**解决方案**: 使用共享几何体
```javascript
// 全局共享几何体
const SHARED_GEOMETRIES = {
  normalBlock: {
    high: new THREE.BoxGeometry(1.5, 0.4, 1.2, 4, 4, 4),
    medium: new THREE.BoxGeometry(1.5, 0.4, 1.2, 2, 2, 2),
    low: new THREE.BoxGeometry(1.5, 0.4, 1.2, 1, 1, 1)
  },
  tallBlock: {
    high: new THREE.BoxGeometry(1.5, 3.0, 1.2, 4, 12, 4),
    medium: new THREE.BoxGeometry(1.5, 3.0, 1.2, 2, 6, 2),
    low: new THREE.BoxGeometry(1.5, 3.0, 1.2, 1, 3, 1)
  }
}

// 创建时使用共享几何体
const geometry = SHARED_GEOMETRIES.normalBlock.high
const block = new THREE.Mesh(geometry, material)
```

### 4. 材质实例化

**问题**: 每个方块独立的材质导致无法批处理

**解决方案**: 使用材质实例和颜色属性
```javascript
// 共享基础材质
const baseMaterial = new THREE.MeshStandardMaterial({
  metalness: 0.9,
  roughness: 0.2
})

// 为每个方块创建材质实例（共享shader）
const material = baseMaterial.clone()
material.color.setHex(0x1a1a1a)

// 或使用实例化渲染时的颜色属性
instancedMesh.setColorAt(index, new THREE.Color(0x1a1a1a))
```

### 5. 性能调优建议

**优先级排序**:
1. 视锥剔除（最大收益）
2. 对象池（减少GC）
3. LOD系统（远距离优化）
4. 批处理渲染（减少draw calls）
5. 后处理效果（视觉提升）

**渐进式实现**:
- 第一阶段：实现视锥剔除和对象池
- 第二阶段：添加LOD系统
- 第三阶段：实现批处理渲染
- 第四阶段：添加后处理效果
- 第五阶段：完善自适应画质系统

**性能基准**:
- 视锥剔除：减少 60-80% 的渲染对象
- 对象池：减少 90% 的内存分配
- LOD：提升 20-30% 的帧率
- 批处理：减少 50-70% 的draw calls
- 总体提升：2-3倍的性能改善

