# Design Document - 西游记像素风格游戏画面改造

## Overview

本设计文档描述如何将现有的 3D MIDI 音乐节奏游戏改造为西游记题材的像素风格。改造将保持游戏核心机制不变，专注于视觉呈现的完全重构。设计采用经典像素游戏的美学原则，结合西游记的东方神话元素，创造独特的视觉体验。

## Architecture

### 整体架构保持不变

游戏的核心架构（Three.js场景、游戏循环、MIDI系统）保持不变，改造主要集中在：

1. **视觉层（Visual Layer）**: 替换所有3D模型、材质、纹理
2. **特效层（Effect Layer）**: 重新设计粒子和动画效果
3. **UI层（UI Layer）**: 更新界面元素的视觉风格

### 技术方案

- **像素纹理**: 使用 Canvas 2D API 或预制的像素图片创建纹理
- **材质简化**: 使用 `MeshBasicMaterial` 或 `MeshLambertMaterial`
- **几何体优化**: 使用简单的 BoxGeometry 和 PlaneGeometry
- **色板限制**: 定义固定的色板（8-16色）保持像素风格一致性

## Components and Interfaces

### 1. 像素纹理生成器（PixelTextureGenerator）

**职责**: 创建像素风格的纹理

**接口**:
```javascript
class PixelTextureGenerator {
  // 创建纯色像素纹理
  static createSolidTexture(color, size = 16)
  
  // 创建棋盘格纹理
  static createCheckerTexture(color1, color2, size = 16)
  
  // 创建渐变像素纹理
  static createGradientTexture(colorTop, colorBottom, size = 16)
  
  // 创建像素图案纹理（用于地面、轨道等）
  static createPatternTexture(pattern, colors, size = 16)
  
  // 创建角色精灵纹理
  static createSpriteTexture(spriteData, size = 32)
}
```

**实现细节**:
- 使用 HTML5 Canvas 绘制像素图案
- 设置纹理过滤为 `NearestFilter` 保持像素锐利
- 纹理尺寸为2的幂次方（16x16, 32x32, 64x64）

### 2. 玩家角色（Player Character）

**当前实现**: 白色半透明球体 + 拖尾效果

**新设计**: 像素风格的孙悟空

**方案A - 3D像素方块组合**:
```
结构：
- 头部：3x3x3 方块（金色）
- 身体：2x4x2 方块（红色/黄色）
- 四肢：1x2x1 方块（金色）
- 金箍棒：1x6x1 方块（金色，可选显示）
```

**方案B - 精灵贴图**:
```
使用 Sprite 或带纹理的 PlaneGeometry
- 正面：孙悟空像素画
- 侧面：简化的侧视图
- 始终面向相机（Billboard效果）
```

**推荐方案**: 方案B（精灵贴图），更符合像素游戏风格，性能更好

**实现**:
```javascript
function createPixelPlayer() {
  // 创建孙悟空像素纹理（32x32）
  const texture = createWukongTexture();
  texture.magFilter = THREE.NearestFilter;
  texture.minFilter = THREE.NearestFilter;
  
  // 使用 Sprite 或 PlaneGeometry
  const material = new THREE.SpriteMaterial({ 
    map: texture,
    transparent: true
  });
  const sprite = new THREE.Sprite(material);
  sprite.scale.set(0.5, 0.5, 1);
  
  return sprite;
}
```

**拖尾效果**: 移除或替换为像素云雾（3-5个渐变透明的小方块）

### 3. 音符方块（Note Blocks）

**当前实现**: 黑色玻璃质感方块，两种高度

**新设计**: 西游记主题像素方块

**视觉设计**:
- **普通方块**: 妖怪头像（牛魔王、白骨精等）
- **超高方块**: 大型障碍物（火焰山、铁扇、定海神针等）
- **颜色**: 使用鲜艳的像素色彩（红、橙、紫、绿）

**实现**:
```javascript
function createPixelNoteBlock(noteData) {
  const isTall = noteData.isTall;
  const blockHeight = isTall ? 3.0 : 0.4;
  
  // 创建方块几何体
  const geometry = new THREE.BoxGeometry(1.5, blockHeight, 1.2);
  
  // 创建像素纹理
  const texture = isTall ? 
    createObstacleTexture() : // 大型障碍物
    createMonsterTexture();   // 妖怪头像
  
  texture.magFilter = THREE.NearestFilter;
  texture.minFilter = THREE.NearestFilter;
  
  // 使用基础材质
  const material = new THREE.MeshLambertMaterial({
    map: texture,
    transparent: false
  });
  
  const block = new THREE.Mesh(geometry, material);
  return block;
}
```

**触发效果**: 
- 移除当前的放大淡出效果
- 替换为像素爆炸（8个小方块向外飞散）
- 或简单的闪烁消失（白色闪光 → 消失）

### 4. 地面和轨道（Ground & Tracks）

**当前实现**: 深蓝灰色地面 + 深灰色轨道线

**新设计**: 西游记场景地面

**地面纹理选项**:
1. **取经路**: 石板路纹理（灰色、棕色像素）
2. **云层**: 白色/金色云朵像素图案
3. **沙漠**: 黄色沙地纹理（火焰山）

**推荐**: 云层地面，符合"腾云驾雾"的意境

**实现**:
```javascript
function createPixelGround() {
  const groundGeometry = new THREE.PlaneGeometry(
    LANES * LANE_WIDTH, 
    GROUND_LENGTH
  );
  
  // 创建云层像素纹理
  const texture = createCloudTexture();
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(4, 20);
  texture.magFilter = THREE.NearestFilter;
  texture.minFilter = THREE.NearestFilter;
  
  const material = new THREE.MeshLambertMaterial({
    map: texture,
    side: THREE.DoubleSide
  });
  
  const ground = new THREE.Mesh(groundGeometry, material);
  ground.rotation.x = -Math.PI / 2;
  
  return ground;
}
```

**轨道线**:
- 使用金色像素线条（符合"金光大道"意象）
- 或使用红色符文图案
- 宽度增加到 0.1，使用方块造型

### 5. 触发线（Trigger Line）

**当前实现**: 白色发光平面 + 脉动动画

**新设计**: 像素风格的法阵或符文

**视觉设计**:
- 金色/红色的像素符文图案
- 简单的闪烁动画（不使用平滑脉动）
- 或使用像素火焰效果

**实现**:
```javascript
function createPixelTriggerLine() {
  const geometry = new THREE.PlaneGeometry(LANES * LANE_WIDTH, 0.5);
  
  // 创建符文纹理
  const texture = createRuneTexture();
  texture.magFilter = THREE.NearestFilter;
  texture.minFilter = THREE.NearestFilter;
  
  const material = new THREE.MeshBasicMaterial({
    map: texture,
    transparent: true,
    opacity: 0.9,
    side: THREE.DoubleSide
  });
  
  const triggerLine = new THREE.Mesh(geometry, material);
  triggerLine.rotation.x = -Math.PI / 2;
  triggerLine.position.set(0, 0.02, 2);
  
  return triggerLine;
}

// 闪烁动画（替代平滑脉动）
function animateTriggerLine(time) {
  const blink = Math.floor(time / 200) % 2; // 每200ms切换
  triggerLine.material.opacity = blink ? 0.9 : 0.6;
}
```

### 6. 场景背景（Scene Background）

**当前实现**: 透明背景 + body背景图 + 黑色雾效

**新设计**: 西游记场景背景

**背景层次**:
1. **天空**: 渐变色（蓝色→紫色，或橙色→红色）
2. **远景**: 像素山脉剪影、云朵、建筑
3. **雾效**: 调整为暖色调（橙色/金色）或移除

**实现**:
```javascript
function setupPixelBackground() {
  // 1. 天空渐变
  scene.background = new THREE.Color(0x87CEEB); // 天蓝色
  
  // 2. 雾效调整
  scene.fog = new THREE.Fog(0xFFB347, 20, 60); // 橙色雾效，距离缩短
  
  // 3. 远景装饰（可选）
  createDistantMountains();
  createFloatingClouds();
}

function createDistantMountains() {
  // 使用简单的三角形或方块创建远山剪影
  const geometry = new THREE.PlaneGeometry(50, 10);
  const texture = createMountainSilhouetteTexture();
  texture.magFilter = THREE.NearestFilter;
  
  const material = new THREE.MeshBasicMaterial({
    map: texture,
    transparent: true,
    side: THREE.DoubleSide
  });
  
  const mountains = new THREE.Mesh(geometry, material);
  mountains.position.set(0, 5, -40);
  scene.add(mountains);
}
```

### 7. 光照系统（Lighting）

**当前实现**: 环境光 + 方向光 + 阴影

**新设计**: 简化的扁平光照

**调整**:
- 增强环境光强度（0.3 → 0.7）
- 减弱方向光强度（0.5 → 0.3）
- 禁用阴影（`renderer.shadowMap.enabled = false`）
- 移除点光源

**实现**:
```javascript
function setupPixelLighting() {
  // 强环境光
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
  scene.add(ambientLight);
  
  // 弱方向光（仅用于轻微的立体感）
  const directionalLight = new THREE.DirectionalLight(0xffffff, 0.3);
  directionalLight.position.set(0, 10, 5);
  directionalLight.castShadow = false;
  scene.add(directionalLight);
  
  // 禁用阴影
  renderer.shadowMap.enabled = false;
}
```

### 8. UI元素像素化

**需要调整的UI**:
1. 背景图片（body background）
2. 灵动岛
3. 按钮
4. 字体

**实现**:

**背景图片**:
- 替换为像素风格的西游记场景（花果山、天宫等）
- 使用 CSS `image-rendering: pixelated`

**字体**:
```css
@import url('https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap');

body {
  font-family: 'Press Start 2P', monospace;
  image-rendering: pixelated;
  image-rendering: -moz-crisp-edges;
  image-rendering: crisp-edges;
}
```

**灵动岛**:
```css
#dynamicIsland {
  border: 3px solid #FFD700; /* 金色边框 */
  box-shadow: 0 0 0 2px #8B4513; /* 棕色外框 */
  background: rgba(139, 69, 19, 0.9); /* 棕色背景 */
}

.midi-cover {
  background: linear-gradient(135deg, #FFD700 0%, #FFA500 100%);
  border: 2px solid #8B4513;
  image-rendering: pixelated;
}
```

**按钮**:
```css
.game-button {
  border: 4px solid #FFD700;
  background: rgba(255, 69, 0, 0.8);
  box-shadow: 0 4px 0 #8B4513, 0 8px 16px rgba(0,0,0,0.4);
  image-rendering: pixelated;
}

.game-button:active {
  box-shadow: 0 2px 0 #8B4513, 0 4px 8px rgba(0,0,0,0.4);
  transform: translateY(2px);
}
```

### 9. 特效系统（Effects）

**需要重新设计的特效**:
1. 音符触发特效
2. 跳跃特效
3. 光波扩散效果

**音符触发特效 - 像素爆炸**:
```javascript
function createPixelExplosion(x, y, z) {
  const particles = [];
  const colors = [0xFFD700, 0xFFA500, 0xFF4500, 0xFFFFFF];
  
  // 创建8个小方块
  for (let i = 0; i < 8; i++) {
    const geometry = new THREE.BoxGeometry(0.1, 0.1, 0.1);
    const material = new THREE.MeshBasicMaterial({
      color: colors[Math.floor(Math.random() * colors.length)]
    });
    const particle = new THREE.Mesh(geometry, material);
    
    // 随机方向
    const angle = (Math.PI * 2 * i) / 8;
    particle.userData.velocity = {
      x: Math.cos(angle) * 0.1,
      y: 0.1,
      z: Math.sin(angle) * 0.1
    };
    
    particle.position.set(x, y, z);
    scene.add(particle);
    particles.push(particle);
  }
  
  // 动画
  let frame = 0;
  const interval = setInterval(() => {
    frame++;
    particles.forEach(p => {
      p.position.x += p.userData.velocity.x;
      p.position.y += p.userData.velocity.y;
      p.position.z += p.userData.velocity.z;
      p.userData.velocity.y -= 0.01; // 重力
      p.material.opacity = 1 - frame / 30;
    });
    
    if (frame >= 30) {
      clearInterval(interval);
      particles.forEach(p => scene.remove(p));
    }
  }, 33);
}
```

**跳跃特效 - 像素云雾**:
```javascript
function createJumpCloud(x, y, z) {
  const geometry = new THREE.PlaneGeometry(0.5, 0.3);
  const texture = createCloudPuffTexture();
  texture.magFilter = THREE.NearestFilter;
  
  const material = new THREE.MeshBasicMaterial({
    map: texture,
    transparent: true,
    opacity: 0.8
  });
  
  const cloud = new THREE.Mesh(geometry, material);
  cloud.position.set(x, y, z);
  scene.add(cloud);
  
  // 淡出动画
  let opacity = 0.8;
  const interval = setInterval(() => {
    opacity -= 0.1;
    cloud.material.opacity = opacity;
    cloud.scale.multiplyScalar(1.1);
    
    if (opacity <= 0) {
      clearInterval(interval);
      scene.remove(cloud);
    }
  }, 50);
}
```

## Data Models

### 色板定义

```javascript
const PIXEL_PALETTE = {
  // 主色调
  SKY_BLUE: 0x87CEEB,
  CLOUD_WHITE: 0xF0F8FF,
  GROUND_BROWN: 0x8B4513,
  
  // 角色色
  WUKONG_GOLD: 0xFFD700,
  WUKONG_RED: 0xFF4500,
  WUKONG_SKIN: 0xFFE4B5,
  
  // 音符方块色
  MONSTER_RED: 0xFF0000,
  MONSTER_PURPLE: 0x9400D3,
  MONSTER_GREEN: 0x00FF00,
  OBSTACLE_ORANGE: 0xFF8C00,
  
  // UI色
  UI_GOLD: 0xFFD700,
  UI_BROWN: 0x8B4513,
  UI_RED: 0xFF4500,
  
  // 特效色
  EFFECT_WHITE: 0xFFFFFF,
  EFFECT_YELLOW: 0xFFFF00,
  EFFECT_ORANGE: 0xFFA500
};
```

### 纹理数据结构

```javascript
// 像素图案数据（8x8示例）
const WUKONG_SPRITE = [
  [0,0,1,1,1,1,0,0],
  [0,1,2,2,2,2,1,0],
  [1,2,3,2,2,3,2,1],
  [1,2,2,2,2,2,2,1],
  [0,1,1,1,1,1,1,0],
  [0,0,4,4,4,4,0,0],
  [0,4,4,4,4,4,4,0],
  [0,5,5,0,0,5,5,0]
];

// 颜色映射
const SPRITE_COLORS = {
  0: 'transparent',
  1: '#8B4513', // 棕色（头发）
  2: '#FFE4B5', // 肤色
  3: '#000000', // 黑色（眼睛）
  4: '#FF4500', // 红色（衣服）
  5: '#FFD700'  // 金色（鞋子）
};
```

## Error Handling

### 纹理加载失败

```javascript
function createTextureWithFallback(createFunc, fallbackColor) {
  try {
    return createFunc();
  } catch (error) {
    console.warn('Texture creation failed, using fallback color', error);
    return createSolidColorTexture(fallbackColor);
  }
}
```

### 性能降级

```javascript
function checkPerformanceAndAdjust() {
  if (currentFPS < 30) {
    // 降低纹理分辨率
    TEXTURE_SIZE = 8;
    // 减少粒子数量
    PARTICLE_COUNT = 4;
    console.log('Performance mode: Low quality textures');
  }
}
```

## Testing Strategy

### 视觉测试

1. **像素风格一致性**: 检查所有元素是否使用像素风格
2. **色彩协调性**: 验证色板使用是否协调
3. **主题一致性**: 确认西游记元素是否明显
4. **可读性**: UI文字和图标是否清晰可辨

### 功能测试

1. **碰撞检测**: 验证视觉改变后碰撞仍然准确
2. **性能测试**: 确保帧率不低于原版
3. **兼容性测试**: 在不同设备和浏览器测试
4. **MIDI功能**: 验证音符触发和游戏逻辑正常

### 测试用例

```javascript
// 测试1: 纹理过滤设置
function testTextureFiltering() {
  const textures = scene.traverse(obj => {
    if (obj.material && obj.material.map) {
      assert(obj.material.map.magFilter === THREE.NearestFilter);
      assert(obj.material.map.minFilter === THREE.NearestFilter);
    }
  });
}

// 测试2: 材质类型
function testMaterialTypes() {
  scene.traverse(obj => {
    if (obj.material) {
      const validTypes = [
        THREE.MeshBasicMaterial,
        THREE.MeshLambertMaterial,
        THREE.SpriteMaterial
      ];
      assert(validTypes.some(type => obj.material instanceof type));
    }
  });
}

// 测试3: 性能基准
function testPerformance() {
  const fps = measureFPS(1000); // 测量1秒
  assert(fps >= 60, `FPS too low: ${fps}`);
}
```

## Implementation Notes

### 开发顺序建议

1. **Phase 1 - 基础设施**: 创建 PixelTextureGenerator 类
2. **Phase 2 - 核心元素**: 改造玩家、音符方块、地面
3. **Phase 3 - 环境**: 调整光照、背景、雾效
4. **Phase 4 - UI**: 更新界面元素和字体
5. **Phase 5 - 特效**: 重新设计所有动画效果
6. **Phase 6 - 优化**: 性能测试和调优

### 技术注意事项

1. **纹理过滤**: 必须使用 `NearestFilter` 保持像素锐利
2. **纹理尺寸**: 使用2的幂次方（16, 32, 64）
3. **材质选择**: 优先使用 `MeshBasicMaterial` 或 `MeshLambertMaterial`
4. **阴影禁用**: 像素风格不需要实时阴影
5. **色彩限制**: 严格使用定义的色板
6. **性能监控**: 持续监控FPS，确保不低于60

### 可选增强功能

1. **多角色选择**: 唐僧、猪八戒、沙僧作为可选角色
2. **主题切换**: 不同的西游记场景（花果山、火焰山等）
3. **像素动画**: 为角色添加简单的帧动画
4. **音效匹配**: 添加像素风格的音效（可选）
