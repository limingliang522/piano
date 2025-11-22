# 音频对齐测试脚本

## 在浏览器控制台运行以下代码来测试对齐

### 1. 监控黑块和音频的实时状态

```javascript
// 创建监控函数
function monitorAlignment() {
    if (!gameRunning || !audioEngine.bgmIsPlaying) {
        console.log('❌ 游戏未运行或音频未播放');
        return;
    }
    
    const gameTime = (Date.now() / 1000) - gameStartTime;
    const audioTime = audioEngine.getBGMCurrentTime();
    const firstNoteTime = midiNotes[0]?.time || 0;
    
    // 找到最近的黑块
    let closestBlock = null;
    let minDistance = Infinity;
    for (let block of noteObjects) {
        if (!block.userData.noteData.triggered) {
            const distance = Math.abs(block.position.z - 2);
            if (distance < minDistance) {
                minDistance = distance;
                closestBlock = block;
            }
        }
    }
    
    console.log('═══════════════════════════════════════');
    console.log(`⏱️  游戏时间: ${gameTime.toFixed(2)}秒`);
    console.log(`🎵 音频时间: ${audioTime.toFixed(2)}秒`);
    console.log(`🎯 第一个音符: ${firstNoteTime.toFixed(2)}秒`);
    console.log(`⚡ 速度倍数: ${speedMultiplier.toFixed(2)}x`);
    console.log(`🎮 midiSpeed: ${midiSpeed.toFixed(4)}`);
    console.log(`🎵 音频速度: ${audioEngine.bgmPlaybackRate.toFixed(2)}x`);
    
    if (closestBlock) {
        const blockZ = closestBlock.position.z;
        const blockTime = closestBlock.userData.noteData.time;
        const distanceToTrigger = 2 - blockZ;
        const timeToTrigger = distanceToTrigger / (midiSpeed * 60);
        const expectedAudioTime = audioTime + timeToTrigger;
        const diff = Math.abs(expectedAudioTime - blockTime);
        
        console.log(`📦 最近黑块:`);
        console.log(`   位置: z=${blockZ.toFixed(2)}`);
        console.log(`   音符时间: ${blockTime.toFixed(2)}秒`);
        console.log(`   距离触发线: ${distanceToTrigger.toFixed(2)}`);
        console.log(`   预计到达时间: ${timeToTrigger.toFixed(2)}秒后`);
        console.log(`   预期音频时间: ${expectedAudioTime.toFixed(2)}秒`);
        console.log(`   时间差: ${diff.toFixed(3)}秒 ${diff < 0.1 ? '✅' : '❌'}`);
    }
}

// 每秒监控一次
const monitorInterval = setInterval(monitorAlignment, 1000);

// 停止监控
// clearInterval(monitorInterval);
```

### 2. 测试第一个黑块的对齐

```javascript
// 在游戏开始时运行
function testFirstBlockAlignment() {
    const firstNote = midiNotes[0];
    const firstBlock = noteObjects.find(b => b.userData.noteData === firstNote);
    
    if (!firstBlock) {
        console.log('❌ 找不到第一个黑块');
        return;
    }
    
    const firstNoteTime = firstNote.time;
    const blockZ = firstBlock.position.z;
    const distanceToTrigger = 2 - blockZ;
    const moveSpeed = midiSpeed * 60;
    const timeToTrigger = distanceToTrigger / moveSpeed;
    
    const audioStartTime = audioEngine.bgmIsPlaying ? 
        (audioEngine.audioContext.currentTime - audioEngine.bgmStartTime) : 0;
    
    console.log('═══════════════════════════════════════');
    console.log('🧪 第一个黑块对齐测试');
    console.log('═══════════════════════════════════════');
    console.log(`🎯 音符时间: ${firstNoteTime.toFixed(2)}秒`);
    console.log(`📦 黑块位置: z=${blockZ.toFixed(2)}`);
    console.log(`📏 距离触发线: ${distanceToTrigger.toFixed(2)}`);
    console.log(`⚡ 移动速度: ${moveSpeed.toFixed(2)}/秒`);
    console.log(`⏱️  到达时间: ${timeToTrigger.toFixed(2)}秒`);
    console.log(`🎵 音频开始: ${audioStartTime.toFixed(2)}秒`);
    console.log(`🎵 音频速度: ${speedMultiplier.toFixed(2)}x`);
    console.log('');
    console.log(`📊 预期结果:`);
    console.log(`   ${timeToTrigger.toFixed(2)}秒后，黑块到达触发线`);
    console.log(`   此时音频播放到: ${(audioStartTime + timeToTrigger).toFixed(2)}秒`);
    console.log(`   应该等于音符时间: ${firstNoteTime.toFixed(2)}秒`);
    
    const diff = Math.abs((audioStartTime + timeToTrigger) - firstNoteTime);
    console.log(`   时间差: ${diff.toFixed(3)}秒 ${diff < 0.1 ? '✅ 对齐' : '❌ 不对齐'}`);
}

testFirstBlockAlignment();
```

### 3. 验证速度同步

```javascript
function verifySpeedSync() {
    console.log('═══════════════════════════════════════');
    console.log('🔍 速度同步验证');
    console.log('═══════════════════════════════════════');
    console.log(`originalBaseSpeed: ${originalBaseSpeed.toFixed(4)}`);
    console.log(`speedMultiplier: ${speedMultiplier.toFixed(2)}x`);
    console.log(`midiSpeed: ${midiSpeed.toFixed(4)}`);
    console.log(`预期 midiSpeed: ${(originalBaseSpeed * speedMultiplier).toFixed(4)}`);
    
    const expectedMidiSpeed = originalBaseSpeed * speedMultiplier;
    const diff = Math.abs(midiSpeed - expectedMidiSpeed);
    
    if (diff < 0.0001) {
        console.log('✅ midiSpeed 与 speedMultiplier 同步');
    } else {
        console.log(`❌ midiSpeed 不同步！差值: ${diff.toFixed(6)}`);
    }
    
    if (audioEngine.bgmIsPlaying) {
        console.log(`🎵 音频播放速度: ${audioEngine.bgmPlaybackRate.toFixed(2)}x`);
        console.log(`🎵 音频源速度: ${audioEngine.bgmSource?.playbackRate.value.toFixed(2)}x`);
        
        if (Math.abs(audioEngine.bgmPlaybackRate - speedMultiplier) < 0.01) {
            console.log('✅ 音频速度与 speedMultiplier 同步');
        } else {
            console.log('❌ 音频速度不同步！');
        }
    }
}

verifySpeedSync();
```

### 4. 手动触发对齐测试

```javascript
// 等待第一个黑块到达触发线时运行
function testAlignmentAtTrigger() {
    // 找到最接近触发线的黑块
    let closestBlock = null;
    let minDistance = Infinity;
    
    for (let block of noteObjects) {
        if (!block.userData.noteData.triggered) {
            const distance = Math.abs(block.position.z - 2);
            if (distance < minDistance) {
                minDistance = distance;
                closestBlock = block;
            }
        }
    }
    
    if (!closestBlock || minDistance > 0.5) {
        console.log('⚠️ 没有黑块接近触发线，请等待...');
        return;
    }
    
    const audioTime = audioEngine.getBGMCurrentTime();
    const noteTime = closestBlock.userData.noteData.time;
    const diff = Math.abs(audioTime - noteTime);
    
    console.log('═══════════════════════════════════════');
    console.log('🎯 触发线对齐测试');
    console.log('═══════════════════════════════════════');
    console.log(`📦 黑块位置: z=${closestBlock.position.z.toFixed(2)}`);
    console.log(`🎯 音符时间: ${noteTime.toFixed(2)}秒`);
    console.log(`🎵 当前音频时间: ${audioTime.toFixed(2)}秒`);
    console.log(`📊 时间差: ${diff.toFixed(3)}秒`);
    
    if (diff < 0.1) {
        console.log('✅ 对齐良好！');
    } else if (diff < 0.3) {
        console.log('⚠️ 轻微偏差');
    } else {
        console.log('❌ 严重不对齐！');
    }
}

// 每0.5秒检查一次
const triggerTestInterval = setInterval(testAlignmentAtTrigger, 500);

// 停止测试
// clearInterval(triggerTestInterval);
```

## 使用方法

1. 打开浏览器开发者工具（F12）
2. 切换到 Console 标签
3. 复制上面的代码并粘贴到控制台
4. 按 Enter 运行
5. 观察输出结果

## 预期结果

- ✅ 时间差 < 0.1秒：对齐良好
- ⚠️ 时间差 0.1-0.3秒：轻微偏差
- ❌ 时间差 > 0.3秒：严重不对齐

## 常见问题

### 如果第二轮不对齐

检查以下几点：
1. `speedMultiplier` 是否正确更新
2. `midiSpeed` 是否等于 `originalBaseSpeed * speedMultiplier`
3. 音频播放速度是否等于 `speedMultiplier`
4. 黑块移动速度是否使用了正确的 `midiSpeed`
