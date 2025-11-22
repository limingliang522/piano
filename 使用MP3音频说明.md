# 使用MP3音频 + MIDI黑块系统

## 系统架构

### 文件结构
```
音乐/
  └── 1/
      ├── 2025-11-19 17.06.11.mp3      # 音频文件（背景音乐）
      └── 2025-11-19 17.06.11.mp3.mid  # MIDI文件（生成黑块）
      └── cover.jpg (可选)              # 封面图片
```

### 工作原理

1. **MIDI文件** → 生成黑块
   - 解析MIDI音符的时间、音高、力度
   - 根据音符时间计算黑块的初始位置
   - 黑块按固定速度向玩家移动

2. **MP3音频** → 背景音乐
   - 直接播放完整的音频文件
   - 不再使用钢琴音色合成
   - 音频播放时间与黑块到达触发线的时间对齐

3. **同步机制**
   - 游戏启动时，计算第一个黑块到达触发线需要的时间
   - 根据这个时间延迟播放MP3，确保音频和黑块完美对齐
   - 黑块触发时检查音频时间，输出同步误差（调试用）

## 添加新音乐

### 步骤1：准备文件
在 `音乐/` 文件夹下创建新文件夹，例如 `音乐/2/`：
```
音乐/
  └── 2/
      ├── song.mp3      # 你的音频文件
      └── song.mp3.mid  # 对应的MIDI文件
      └── cover.jpg     # 封面图片（可选）
```

### 步骤2：修改代码
编辑 `game.js`，找到 `getMidiFiles()` 函数：

```javascript
async function getMidiFiles() {
    const musicFolders = ['1', '2']; // 添加新文件夹名
    
    const musicList = [];
    for (const folder of musicFolders) {
        // 根据你的文件名修改
        const baseName = folder === '1' 
            ? '2025-11-19 17.06.11.mp3' 
            : 'song.mp3';
            
        musicList.push({
            name: folder,
            mp3: `音乐/${folder}/${baseName}`,
            midi: `音乐/${folder}/${baseName}.mid`,
            image: `音乐/${folder}/cover.jpg` // 可选
        });
    }
    
    return musicList;
}
```

## 音频同步调试

黑块触发时会在控制台输出同步信息：
```
⚠️ 音频不同步: 期望2.50s, 实际2.53s, 差异0.030s
```

如果差异过大（>0.1秒），可能需要调整：
1. 检查MP3文件是否有静音前奏
2. 调整 `midiSpeed` 参数
3. 检查MIDI文件的时间偏移

## 主要修改

### audio-engine.js
- 移除了钢琴音色采样系统
- 添加了 `loadMusic()` - 加载MP3文件
- 添加了 `playMusic()` - 播放音乐
- 添加了 `stopMusic()` / `pauseMusic()` / `resumeMusic()` - 控制播放
- 添加了 `getCurrentTime()` / `setCurrentTime()` - 时间控制

### game.js
- 修改了 `getMidiFiles()` - 返回音乐对象（包含mp3/midi/image路径）
- 修改了 `loadMidiFile()` - 同时加载MP3和MIDI
- 修改了 `startMIDIGame()` - 计算音频延迟，确保同步
- 修改了 `updateNoteBlocks()` - 添加同步检查
- 修改了 `gameOver()` - 停止音乐
- 修改了 `continueGame()` - 恢复音乐

## 优势

1. **音质完美** - 使用原始MP3，不受音色采样限制
2. **加载快速** - 不需要加载30个钢琴音色文件
3. **灵活性高** - 可以使用任何音频文件（钢琴、吉他、人声等）
4. **同步精确** - 音频和黑块完美对齐
