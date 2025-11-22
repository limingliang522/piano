# 调试工具

## 浏览器控制台命令

### 音频状态检查
```javascript
// 查看音频引擎状态
audioEngine.getStatus()

// 查看音频是否正在播放
audioEngine.bgmIsPlaying

// 查看当前播放时间
audioEngine.getBGMCurrentTime()

// 查看当前播放速度
audioEngine.bgmPlaybackRate

// 查看音频缓冲区
audioEngine.bgmBuffer
```

### 游戏状态检查
```javascript
// 查看游戏是否运行
gameRunning

// 查看当前速度倍数
speedMultiplier

// 查看获得的星星数
starsEarned

// 查看MIDI音符数据
midiNotes

// 查看第一个音符时间
midiNotes[0]?.time

// 查看音符方块数量
noteObjects.length

// 查看已触发的音符数
notesTriggered
```

### 灵动岛状态检查
```javascript
// 查看灵动岛是否展开
isIslandExpanded

// 查看暂停前的游戏状态
wasGameRunningBeforePause
```

### 性能监控
```javascript
// 查看当前FPS
currentFPS

// 查看渲染器信息
renderer.info

// 查看场景物体数量
scene.children.length

// 查看内存使用
{
    几何体: renderer.info.memory.geometries,
    纹理: renderer.info.memory.textures,
    场景物体: scene.children.length,
    音符方块: noteObjects.length
}
```

## 手动控制命令

### 音频控制
```javascript
// 播放音频（从0秒开始，1.0x速度）
audioEngine.playBGM(0, 1.0)

// 暂停音频
audioEngine.pauseBGM()

// 恢复音频
audioEngine.resumeBGM()

// 停止音频
audioEngine.stopBGM()

// 设置播放速度（例如：2倍速）
audioEngine.setBGMPlaybackRate(2.0)

// 设置音量（0.0 - 1.0）
audioEngine.setBGMVolume(0.5)
```

### 游戏控制
```javascript
// 暂停游戏
gameRunning = false

// 恢复游戏
gameRunning = true

// 展开灵动岛
toggleIsland()

// 跳跃
jump()

// 切换轨道（0-4）
targetLane = 2
```

### 速度控制
```javascript
// 设置速度倍数
speedMultiplier = 2.0

// 更新MIDI速度
midiSpeed = originalBaseSpeed * speedMultiplier

// 更新音频速度
audioEngine.setBGMPlaybackRate(speedMultiplier)
```

## 调试技巧

### 1. 查看音频同步情况
```javascript
// 创建一个监控函数
function monitorAudioSync() {
    const audioTime = audioEngine.getBGMCurrentTime();
    const firstNoteTime = midiNotes[0]?.time || 0;
    const gameTime = (Date.now() / 1000) - gameStartTime;
    
    console.log({
        音频播放时间: audioTime.toFixed(2) + '秒',
        第一个音符时间: firstNoteTime.toFixed(2) + '秒',
        游戏运行时间: gameTime.toFixed(2) + '秒',
        速度倍数: speedMultiplier.toFixed(2) + 'x',
        音频速度: audioEngine.bgmPlaybackRate.toFixed(2) + 'x'
    });
}

// 每秒监控一次
const monitorInterval = setInterval(monitorAudioSync, 1000);

// 停止监控
clearInterval(monitorInterval);
```

### 2. 测试音频对齐
```javascript
// 计算第一个黑块到达触发线的时间
function calculateTriggerTime() {
    const firstNoteTime = midiNotes[0]?.time || 0;
    const bufferDistance = 30;
    const distanceToTrigger = (firstNoteTime * originalBaseSpeed * 60) + bufferDistance;
    const currentSpeed = originalBaseSpeed * speedMultiplier;
    const timeToTrigger = distanceToTrigger / (currentSpeed * 60);
    const audioStartTime = Math.max(0, firstNoteTime - timeToTrigger);
    
    console.log({
        第一个音符时间: firstNoteTime.toFixed(2) + '秒',
        黑块到触发线距离: distanceToTrigger.toFixed(2),
        移动到触发线需要: timeToTrigger.toFixed(2) + '秒',
        音频开始时间: audioStartTime.toFixed(2) + '秒'
    });
}

calculateTriggerTime();
```

### 3. 强制重新同步
```javascript
// 如果音频不同步，可以手动重新同步
function resyncAudio() {
    const firstNoteTime = midiNotes[0]?.time || 0;
    const bufferDistance = 30;
    const distanceToTrigger = (firstNoteTime * originalBaseSpeed * 60) + bufferDistance;
    const currentSpeed = originalBaseSpeed * speedMultiplier;
    const timeToTrigger = distanceToTrigger / (currentSpeed * 60);
    const audioStartTime = Math.max(0, firstNoteTime - timeToTrigger);
    
    audioEngine.stopBGM();
    audioEngine.playBGM(audioStartTime, speedMultiplier);
    
    console.log('✅ 音频已重新同步');
}

resyncAudio();
```

### 4. 查看所有黑块位置
```javascript
// 显示前10个黑块的位置和状态
noteObjects.slice(0, 10).forEach((block, i) => {
    const data = block.userData.noteData;
    console.log(`黑块 ${i + 1}:`, {
        位置: block.position.z.toFixed(2),
        轨道: data.lane,
        时间: data.time.toFixed(2) + '秒',
        已触发: data.triggered,
        已碰撞: data.collided,
        超高: block.userData.isTall
    });
});
```

### 5. 测试暂停/恢复
```javascript
// 测试暂停
console.log('暂停前:', {
    游戏运行: gameRunning,
    音频播放: audioEngine.bgmIsPlaying,
    音频时间: audioEngine.getBGMCurrentTime()
});

audioEngine.pauseBGM();
gameRunning = false;

console.log('暂停后:', {
    游戏运行: gameRunning,
    音频播放: audioEngine.bgmIsPlaying,
    暂停时间: audioEngine.bgmPauseTime
});

// 等待几秒后恢复
setTimeout(() => {
    audioEngine.resumeBGM();
    gameRunning = true;
    
    console.log('恢复后:', {
        游戏运行: gameRunning,
        音频播放: audioEngine.bgmIsPlaying,
        音频时间: audioEngine.getBGMCurrentTime()
    });
}, 3000);
```

## 常用调试场景

### 场景1：音频不播放
```javascript
// 检查音频上下文状态
console.log('AudioContext状态:', audioEngine.audioContext.state);

// 如果是 suspended，尝试恢复
if (audioEngine.audioContext.state === 'suspended') {
    audioEngine.audioContext.resume().then(() => {
        console.log('✅ AudioContext已恢复');
    });
}

// 检查音频缓冲区
console.log('音频缓冲区:', audioEngine.bgmBuffer);

// 如果缓冲区为空，重新加载
if (!audioEngine.bgmBuffer) {
    audioEngine.loadBGM('midi/1.mp3').then(() => {
        console.log('✅ 音频已重新加载');
    });
}
```

### 场景2：音频与黑块不同步
```javascript
// 检查时间计算
const firstNoteTime = midiNotes[0]?.time || 0;
const audioTime = audioEngine.getBGMCurrentTime();
const diff = Math.abs(audioTime - firstNoteTime);

console.log({
    第一个音符时间: firstNoteTime.toFixed(2),
    当前音频时间: audioTime.toFixed(2),
    时间差: diff.toFixed(2) + '秒'
});

if (diff > 0.5) {
    console.warn('⚠️ 音频不同步！时间差超过0.5秒');
    console.log('建议执行: resyncAudio()');
}
```

### 场景3：速度不匹配
```javascript
// 检查速度设置
console.log({
    速度倍数: speedMultiplier,
    MIDI速度: midiSpeed,
    原始速度: originalBaseSpeed,
    音频速度: audioEngine.bgmPlaybackRate,
    音频源速度: audioEngine.bgmSource?.playbackRate.value
});

// 如果不匹配，手动设置
if (audioEngine.bgmSource) {
    audioEngine.setBGMPlaybackRate(speedMultiplier);
    console.log('✅ 音频速度已更新');
}
```

## 性能分析

### 帧率分析
```javascript
// 监控帧率
let frameCount = 0;
let lastTime = performance.now();

function monitorFPS() {
    frameCount++;
    const now = performance.now();
    
    if (now - lastTime >= 1000) {
        console.log('FPS:', frameCount);
        frameCount = 0;
        lastTime = now;
    }
    
    requestAnimationFrame(monitorFPS);
}

monitorFPS();
```

### 内存分析
```javascript
// 定期输出内存使用情况
setInterval(() => {
    console.log('内存使用:', {
        几何体: renderer.info.memory.geometries,
        纹理: renderer.info.memory.textures,
        程序: renderer.info.programs?.length || 0,
        场景物体: scene.children.length,
        音符方块: noteObjects.length,
        活跃音符: audioEngine.getActiveNoteCount()
    });
}, 5000);
```
