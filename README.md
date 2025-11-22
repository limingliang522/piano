# 钢琴跑酷 - MIDI 音乐节奏游戏

## 🎮 游戏简介
一款结合音乐节奏和跑酷元素的 3D 网页游戏，通过躲避黑色音符方块来演奏完整的钢琴曲。

## ✨ 功能特点

### 🎹 MIDI 音乐系统
- 自动加载并解析 MIDI 文件
- 将音符映射到 5 条轨道
- 黑色方块代表音符，有普通和超高两种高度
- 绿色触发线自动播放钢琴音

### 🎮 游戏玩法
- **躲避黑块**：左右切换轨道躲开黑色音符方块
- **跳跃机制**：跳跃可以越过普通高度的黑块
- **快速下落**：空中点击/按键快速下落
- **自动触发**：黑块到达触发线时自动播放钢琴音

### 🎯 操作方式

**电脑**：
- **← →** 或 **A D**：切换轨道
- **↑ W 空格**：跳跃（空中再按快速下落）
- **↓ S**：快速下落

**手机**：
- **左右滑动**：切换轨道
- **点击屏幕**：跳跃（空中再点击快速下落）

## 🚀 部署方式

### 本地运行
```bash
python start-server-simple.py
```
然后访问 `http://localhost:8001`

### 云端部署（推荐）

#### 使用 Vercel（最简单）
1. Fork 或上传项目到 GitHub
2. 访问 [vercel.com](https://vercel.com)
3. 用 GitHub 账号登录
4. 点击 "Import Project"
5. 选择你的仓库
6. 点击 "Deploy"

#### 使用 Netlify
1. 访问 [netlify.com](https://netlify.com)
2. 拖拽项目文件夹到网页
3. 自动部署完成

#### 使用 GitHub Pages
1. 上传到 GitHub 仓库
2. 在仓库设置中启用 GitHub Pages
3. 选择主分支作为源

## 📁 项目结构
```
.
├── index.html              # 主页面
├── game.js                 # 游戏主逻辑
├── midi-parser.js          # MIDI 解析器
├── audio-engine.js         # 音频引擎
├── piano-samples/          # 钢琴音色采样（30个MP3文件）
├── 2025-09-08 17.35.08.mp3.mid  # MIDI 音乐文件
├── vercel.json            # Vercel 部署配置
└── README.md              # 说明文档
```

## 🎵 技术栈
- **Three.js** - 3D 渲染
- **Web Audio API** - 音频播放
- **原生 JavaScript** - 游戏逻辑
- **MIDI 解析** - 自定义解析器
- **University of Iowa Piano Samples** - Steinway 钢琴音色（88个完整音符）

## 📝 开发说明
- 游戏支持 60/90/120Hz 高刷新率
- 自动检测屏幕刷新率并适配
- 黑块高度随机（70%普通，30%超高）
- 音色采样分批加载，避免手机卡顿

## 🎹 音色设置
项目使用 **University of Iowa Piano Samples**（Steinway 三角钢琴）

### 安装音色
```bash
# 一键安装（推荐）
python quick-setup-iowa.py

# 或手动安装
python download-iowa-samples.py
python convert-iowa-to-mp3.py
```

详细说明请查看 [IOWA-PIANO-SETUP.md](IOWA-PIANO-SETUP.md)

## 🎯 游戏目标
完美演奏整首曲子，躲避所有黑块，零碰撞通关！

祝你玩得开心！🎮🎵
