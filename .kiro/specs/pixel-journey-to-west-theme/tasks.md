# Implementation Plan - 西游记像素风格游戏画面改造

- [x] 1. 创建像素纹理生成系统





  - 在 game.js 开头创建 PixelTextureGenerator 类，包含创建各种像素纹理的静态方法
  - 实现 createSolidTexture() 方法用于创建纯色像素纹理
  - 实现 createSpriteTexture() 方法用于从像素数据数组创建精灵纹理
  - 实现 createPatternTexture() 方法用于创建重复图案纹理
  - 所有纹理必须设置 magFilter 和 minFilter 为 THREE.NearestFilter
  - _Requirements: 1.2, 2.1, 3.2, 4.1, 5.3_

- [x] 2. 定义色板和像素数据





  - 在 game.js 顶部定义 PIXEL_PALETTE 对象，包含所有游戏使用的颜色
  - 定义 WUKONG_SPRITE 像素数据数组（16x16或32x32）
  - 定义 MONSTER_SPRITES 数组，包含多种妖怪像素图案
  - 定义 CLOUD_PATTERN 用于地面纹理
  - 定义 RUNE_PATTERN 用于触发线纹理
  - _Requirements: 1.2, 2.1, 3.2_

- [x] 3. 改造玩家角色为像素孙悟空






  - 修改 createPlayer() 函数
  - 使用 PixelTextureGenerator.createSpriteTexture() 创建孙悟空纹理
  - 将 SphereGeometry 替换为 THREE.Sprite 或 PlaneGeometry
  - 设置 SpriteMaterial 使用孙悟空纹理，启用透明度
  - 调整 scale 使角色大小合适（约0.5-0.8）
  - 移除或注释掉原有的拖尾球体创建代码
  - 保持 player.position 和碰撞体积不变
  - _Requirements: 1.1, 1.2, 1.3, 1.5_

- [x] 4. 改造音符方块为西游记主题





  - 修改 createNoteBlock() 函数
  - 根据 isTall 属性选择不同的像素纹理（妖怪或障碍物）
  - 使用 PixelTextureGenerator 创建纹理并设置 NearestFilter
  - 将 MeshPhysicalMaterial 替换为 MeshLambertMaterial
  - 移除透明度、transmission、clearcoat 等高级材质属性
  - 移除边缘发光效果（LineSegments）
  - 使用 PIXEL_PALETTE 中的颜色
  - _Requirements: 2.1, 2.2, 2.5, 5.3_

- [ ] 5. 重新设计音符触发特效
  - 修改 updateNoteBlocks() 中的触发效果代码
  - 移除当前的放大淡出动画
  - 创建 createPixelExplosion() 函数实现像素爆炸效果
  - 生成8个小方块（BoxGeometry 0.1x0.1x0.1）向外飞散
  - 使用 PIXEL_PALETTE 中的特效颜色
  - 添加简单的重力和淡出动画
  - _Requirements: 2.3, 7.1, 7.4_

- [ ] 6. 改造地面为云层像素风格
  - 修改 createGround() 函数
  - 使用 PixelTextureGenerator.createPatternTexture() 创建云层纹理
  - 将纹理应用到地面 PlaneGeometry
  - 设置纹理重复（wrapS, wrapT, repeat）
  - 将 MeshStandardMaterial 替换为 MeshLambertMaterial
  - 使用 PIXEL_PALETTE.CLOUD_WHITE 和 SKY_BLUE
  - 移除 metalness 和 roughness 属性
  - _Requirements: 3.1, 3.3, 5.3_

- [ ] 7. 改造轨道线为金色像素风格
  - 修改 createGround() 中的轨道线创建代码
  - 将轨道线颜色改为 PIXEL_PALETTE.UI_GOLD
  - 增加轨道线宽度（0.03 → 0.1）
  - 增加轨道线高度使其更明显
  - 调整不透明度为1.0（完全不透明）
  - 使用 MeshBasicMaterial 替代当前材质
  - _Requirements: 4.1, 4.2, 4.4_

- [ ] 8. 改造触发线为像素符文风格
  - 修改 createTriggerLine() 函数
  - 使用 PixelTextureGenerator 创建符文图案纹理
  - 将颜色改为金色或红色（PIXEL_PALETTE.UI_GOLD）
  - 保持 MeshBasicMaterial 但使用新纹理
  - 修改 animate() 中的脉动动画为简单的闪烁效果
  - 使用离散的透明度切换（0.9 ↔ 0.6）而非平滑过渡
  - _Requirements: 4.3, 7.3_

- [ ] 9. 简化光照系统
  - 修改 init() 函数中的光照设置
  - 增强环境光强度（0.3 → 0.7）
  - 减弱方向光强度（0.5 → 0.3）
  - 禁用阴影：设置 renderer.shadowMap.enabled = false
  - 移除方向光的阴影相关设置（castShadow, shadow.camera等）
  - 移除或注释掉 playerLight 相关代码
  - _Requirements: 5.1, 5.2, 5.3_

- [ ] 10. 调整场景背景和雾效
  - 修改 init() 函数中的场景设置
  - 设置 scene.background 为天蓝色（PIXEL_PALETTE.SKY_BLUE）
  - 修改雾效颜色为橙色或金色（0xFFB347）
  - 调整雾效距离（far: 80 → 60）
  - 移除 body 背景图的透明度依赖，或准备像素风格背景图
  - _Requirements: 3.1, 3.2, 3.4_

- [ ] 11. 更新 CSS 样式为像素风格
  - 在 index.html 的 <style> 中添加像素字体导入
  - 添加 image-rendering: pixelated 到 body 和 canvas
  - 修改 #dynamicIsland 样式：金色边框、棕色背景
  - 修改 .game-button 样式：像素风格边框和阴影
  - 修改 .midi-cover 样式：金橙渐变背景
  - 调整所有颜色使用西游记主题色（金、红、棕）
  - _Requirements: 6.1, 6.2, 6.3_

- [ ] 12. 替换背景图片为像素风格
  - 准备或创建像素风格的西游记背景图（花果山、云海等）
  - 替换 body 的 background-image URL
  - 确保图片使用 image-rendering: pixelated
  - 或使用纯色背景配合 CSS 渐变
  - _Requirements: 6.4_

- [ ] 13. 移除或简化拖尾效果
  - 修改 updatePlayer() 函数
  - 注释掉或移除 trailPositions 和 trailSpheres 相关代码
  - 移除 updateTrail() 函数调用
  - 可选：创建简单的像素云雾拖尾（3个渐变方块）
  - _Requirements: 1.5_

- [ ] 14. 添加跳跃像素特效
  - 创建 createJumpCloud() 函数
  - 在 jump() 函数中调用，当玩家起跳时生成云雾特效
  - 使用小型 PlaneGeometry 和云雾像素纹理
  - 添加放大和淡出动画
  - 使用 PIXEL_PALETTE 中的云雾颜色
  - _Requirements: 1.4, 7.2_

- [ ] 15. 移除光波扩散效果
  - 修改 updateNoteBlocks() 函数
  - 注释掉或移除 createTriggerWave() 函数调用
  - 删除 createTriggerWave() 函数定义
  - 或替换为简单的像素波纹效果
  - _Requirements: 7.3, 7.5_

- [ ] 16. 性能测试和优化
  - 运行游戏并监控 FPS
  - 确保帧率保持在 60fps 以上
  - 如果性能下降，减小纹理尺寸（32 → 16）
  - 如果性能下降，减少粒子特效数量
  - 验证移动设备上的性能表现
  - _Requirements: 8.1, 8.2, 8.3, 8.4_

- [ ] 17. 功能兼容性测试
  - 测试5条轨道的左右移动功能
  - 测试跳跃功能和碰撞检测准确性
  - 测试 MIDI 音符触发机制
  - 测试灵动岛的展开/收起功能
  - 测试重新开始和游戏结束流程
  - 测试触摸控制和键盘控制
  - 验证所有 UI 元素正常显示和交互
  - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5_

- [ ] 18. 可选增强功能
  - 创建多个妖怪像素图案增加视觉多样性
  - 添加远景装饰（山脉剪影、浮云）
  - 为孙悟空添加简单的帧动画（跳跃、移动）
  - 创建多个场景主题（花果山、火焰山、天宫）
  - 添加角色选择功能（唐僧、猪八戒、沙僧）
  - _Requirements: 1.2, 2.1, 3.5_
