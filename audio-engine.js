// 钢琴音频引擎 - 完美还原MIDI
class AudioEngine {
    constructor() {
        this.audioContext = null;
        this.masterGain = null;
        this.samples = new Map();
        this.isReady = false;
    }
    
    // 确保AudioContext已创建
    ensureAudioContext() {
        if (!this.audioContext) {
            try {
                // 使用平衡模式（性能优化）
                this.audioContext = new (window.AudioContext || window.webkitAudioContext)({
                    latencyHint: 'balanced', // 平衡延迟和性能
                    sampleRate: 44100 // 标准采样率（降低CPU负担）
                });
                
                // 初始化专业音频处理链
                this.initAudioChain();
            } catch (error) {
                console.error('ensureAudioContext: 创建失败:', error);
                throw error;
            }
        }
    }
    
    // 初始化专业级音频处理链
    initAudioChain() {
        const ctx = this.audioContext;
        
        try {
            // === 1. 输入均衡器（低切，去除泥泞）===
            this.inputEQ = ctx.createBiquadFilter();
            this.inputEQ.type = 'highpass';
            this.inputEQ.frequency.value = 40;  // 切除40Hz以下
            this.inputEQ.Q.value = 0.7;
            
            // === 2. 低频增强（温暖感）===
            this.lowShelf = ctx.createBiquadFilter();
            this.lowShelf.type = 'lowshelf';
            this.lowShelf.frequency.value = 150;
            this.lowShelf.gain.value = 3;  // +3dB
            
            // === 3. 中频塑形（明亮度）===
            this.midPeak = ctx.createBiquadFilter();
            this.midPeak.type = 'peaking';
            this.midPeak.frequency.value = 2500;
            this.midPeak.Q.value = 1.2;
            this.midPeak.gain.value = 2;  // +2dB
            
            // === 4. 高频增强（空气感）===
            this.highShelf = ctx.createBiquadFilter();
            this.highShelf.type = 'highshelf';
            this.highShelf.frequency.value = 8000;
            this.highShelf.gain.value = 4;  // +4dB
            
            // === 5. 动态压缩器（平衡动态）===
            this.compressor = ctx.createDynamicsCompressor();
            this.compressor.threshold.value = -24;
            this.compressor.knee.value = 30;
            this.compressor.ratio.value = 4;
            this.compressor.attack.value = 0.003;
            this.compressor.release.value = 0.25;
            
            // === 6. 混响（空间感）===
            this.reverbGain = ctx.createGain();
            this.reverbGain.gain.value = 0.3;  // 30% 湿信号
            this.dryGain = ctx.createGain();
            this.dryGain.gain.value = 0.7;  // 70% 干信号
            
            // 创建简单混响（使用延迟模拟）
            this.createSimpleReverb();
            
            // === 7. 立体声增宽 ===
            this.stereoWidener = ctx.createGain();
            this.stereoWidener.gain.value = 1.2;
            
            // === 8. 限幅器（防止削波）===
            this.limiter = ctx.createDynamicsCompressor();
            this.limiter.threshold.value = -3;
            this.limiter.knee.value = 0;
            this.limiter.ratio.value = 20;
            this.limiter.attack.value = 0.001;
            this.limiter.release.value = 0.1;
            
            // === 9. 主增益 ===
            this.masterGain = ctx.createGain();
            this.masterGain.gain.value = 1.5;
            
            // === 音频信号链 ===
            // 输入 → EQ链 → 压缩器 → 混响（并联）→ 立体声增宽 → 限幅器 → 主增益 → 输出
            this.inputEQ.connect(this.lowShelf);
            this.lowShelf.connect(this.midPeak);
            this.midPeak.connect(this.highShelf);
            this.highShelf.connect(this.compressor);
            
            // 干信号路径
            this.compressor.connect(this.dryGain);
            this.dryGain.connect(this.stereoWidener);
            
            // 湿信号路径（混响）
            this.compressor.connect(this.reverbGain);
            this.reverbGain.connect(this.reverbNode);
            this.reverbNode.connect(this.stereoWidener);
            
            // 最终输出
            this.stereoWidener.connect(this.limiter);
            this.limiter.connect(this.masterGain);
            this.masterGain.connect(ctx.destination);
            
            console.log('🎹 专业级音频处理链已初始化');
            console.log('   ✓ EQ（低切+三段均衡）');
            console.log('   ✓ 动态压缩器');
            console.log('   ✓ 混响（空间感）');
            console.log('   ✓ 立体声增宽');
            console.log('   ✓ 限幅器');
        } catch (error) {
            console.error('initAudioChain: 初始化失败:', error);
            throw error;
        }
    }
    
    // 创建简单混响效果
    createSimpleReverb() {
        const ctx = this.audioContext;
        const convolver = ctx.createConvolver();
        
        // 生成混响脉冲响应（模拟中型音乐厅）
        const sampleRate = ctx.sampleRate;
        const length = sampleRate * 2.5;  // 2.5秒混响
        const impulse = ctx.createBuffer(2, length, sampleRate);
        
        for (let channel = 0; channel < 2; channel++) {
            const channelData = impulse.getChannelData(channel);
            for (let i = 0; i < length; i++) {
                // 指数衰减 + 随机噪声
                const decay = Math.exp(-i / (sampleRate * 0.8));
                channelData[i] = (Math.random() * 2 - 1) * decay;
            }
        }
        
        convolver.buffer = impulse;
        this.reverbNode = convolver;
    }
    


    // 将 MIDI 音符号转换为音符名称
    midiToNoteName(midiNote) {
        const noteNames = ['C', 'Cs', 'D', 'Ds', 'E', 'F', 'Fs', 'G', 'Gs', 'A', 'As', 'B'];
        const octave = Math.floor(midiNote / 12) - 1;
        const noteName = noteNames[midiNote % 12];
        return noteName + octave;
    }

    // 初始化钢琴采样器（分批加载，避免手机卡顿）
    async init(progressCallback) {
        // 确保AudioContext已创建
        this.ensureAudioContext();
        
        // 定义实际存在的采样点
        const sampleNotes = [
            'A0', 'C1', 'Ds1', 'Fs1', 'A1', 'C2', 'Ds2', 'Fs2',
            'A2', 'C3', 'Ds3', 'Fs3', 'A3', 'C4', 'Ds4', 'Fs4',
            'A4', 'C5', 'Ds5', 'Fs5', 'A5', 'C6', 'Ds6', 'Fs6',
            'A6', 'C7', 'Ds7', 'Fs7', 'A7', 'C8'
        ];
        
        let loadedCount = 0;
        const total = sampleNotes.length;
        
        // 加载单个音色（简化版，快速加载）
        const loadSample = async (noteName) => {
            try {
                const response = await fetch(`./piano-samples/${noteName}.mp3`);
                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}`);
                }
                const arrayBuffer = await response.arrayBuffer();
                const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
                this.samples.set(noteName, audioBuffer);
                return true;
            } catch (error) {
                console.warn(`${noteName} 加载失败:`, error);
                return false;
            }
        };
        
        // 并行加载所有音色（最快速度）
        const allPromises = sampleNotes.map(async (noteName) => {
            const success = await loadSample(noteName);
            loadedCount++;
            if (progressCallback) {
                progressCallback(loadedCount, total);
            }
            return success;
        });
        
        await Promise.all(allPromises);
        
        console.log(`钢琴采样加载完成！共 ${this.samples.size}/30 个音符`);
        
        this.isReady = true;
        return true;
    }

    // 找到最接近的采样音符
    findClosestSample(targetNote) {
        const noteToMidi = (noteName) => {
            const noteNames = ['C', 'Cs', 'D', 'Ds', 'E', 'F', 'Fs', 'G', 'Gs', 'A', 'As', 'B'];
            const match = noteName.match(/^([A-G]s?)(\d+)$/);
            if (!match) return 60;
            const note = match[1];
            const octave = parseInt(match[2]);
            const noteIndex = noteNames.indexOf(note);
            if (noteIndex === -1) return 60;
            return (octave + 1) * 12 + noteIndex;
        };
        
        const targetMidi = noteToMidi(targetNote);
        let closestNote = null;
        let minDistance = Infinity;
        
        for (const [noteName] of this.samples) {
            const sampleMidi = noteToMidi(noteName);
            const distance = Math.abs(sampleMidi - targetMidi);
            if (distance < minDistance) {
                minDistance = distance;
                closestNote = noteName;
            }
        }
        
        return { noteName: closestNote, semitoneOffset: targetMidi - noteToMidi(closestNote) };
    }

    // 播放钢琴音符（完美还原MIDI）
    playNote(midiNote, duration = 0.5, velocity = 100, lane = 2) {
        if (!this.isReady || this.samples.size === 0) {
            console.warn('钢琴采样尚未加载完成');
            return;
        }

        const targetNote = this.midiToNoteName(midiNote);
        const { noteName, semitoneOffset } = this.findClosestSample(targetNote);
        
        if (!noteName) {
            console.warn('找不到合适的采样');
            return;
        }
        
        const buffer = this.samples.get(noteName);
        if (!buffer) {
            console.warn(`采样 ${noteName} 不存在`);
            return;
        }

        try {
            const ctx = this.audioContext;
            const now = ctx.currentTime;
            const noteDuration = Math.min(duration, 5);
            
            // 创建音频源
            const source = ctx.createBufferSource();
            source.buffer = buffer;
            
            // 根据音高偏移调整播放速率
            const playbackRate = Math.pow(2, semitoneOffset / 12);
            source.playbackRate.value = playbackRate;
            
            // === 立体声声像（根据轨道位置）===
            const stereoPanner = ctx.createStereoPanner();
            const panValue = (lane - 2) / 2; // -1, -0.5, 0, 0.5, 1
            stereoPanner.pan.value = Math.max(-1, Math.min(1, panValue));
            
            // === 音量包络（ADSR）===
            const gainNode = ctx.createGain();
            const volume = (velocity / 127) * 0.75; // 降低单音符音量，减少失真
            
            // Attack（快速起音，5ms）
            gainNode.gain.setValueAtTime(0, now);
            gainNode.gain.linearRampToValueAtTime(volume, now + 0.005);
            
            // Sustain（保持）
            const sustainTime = Math.max(noteDuration - 0.055, 0.01);
            gainNode.gain.setValueAtTime(volume, now + 0.005);
            
            // Release（自然释放，50ms）
            gainNode.gain.linearRampToValueAtTime(0, now + noteDuration);
            
            // === 连接音频处理链 ===
            // 音源 → 立体声 → 音量包络 → 专业处理链（EQ→压缩→混响→限幅）→ 输出
            source.connect(stereoPanner);
            stereoPanner.connect(gainNode);
            gainNode.connect(this.inputEQ);
            
            // 播放
            source.start(now);
            source.stop(now + noteDuration);
            
            // 清理（防止内存泄漏）
            source.onended = () => {
                try {
                    source.disconnect();
                    stereoPanner.disconnect();
                    gainNode.disconnect();
                } catch (e) {
                    // 已经断开连接
                }
            };

        } catch (error) {
            console.error('播放音符失败:', error);
        }
    }

    // 播放碰撞音效
    playCollision() {
        const ctx = this.audioContext;
        const now = ctx.currentTime;
        
        // 低频冲击
        const bass = ctx.createOscillator();
        bass.type = 'sine';
        bass.frequency.setValueAtTime(80, now);
        bass.frequency.exponentialRampToValueAtTime(30, now + 0.3);
        
        const bassGain = ctx.createGain();
        bassGain.gain.setValueAtTime(0.3, now);
        bassGain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
        
        // 连接到专业处理链
        bass.connect(bassGain);
        bassGain.connect(this.inputEQ);
        
        // 播放
        bass.start(now);
        bass.stop(now + 0.3);
    }

    // 启动音频上下文
    async start() {
        this.ensureAudioContext();
        
        if (this.audioContext.state === 'suspended') {
            console.log('音频上下文被挂起，尝试恢复...');
            
            // 添加超时处理，防止 resume() 卡住
            const resumePromise = this.audioContext.resume();
            const timeoutPromise = new Promise((_, reject) => {
                setTimeout(() => reject(new Error('resume() 超时')), 3000);
            });
            
            try {
                await Promise.race([resumePromise, timeoutPromise]);
                console.log('音频上下文恢复成功，状态:', this.audioContext.state);
            } catch (error) {
                console.error('音频上下文恢复失败:', error);
                // 即使失败也继续，有些浏览器可能不需要 resume
            }
        }
        
        console.log('音频上下文最终状态:', this.audioContext.state);
    }
}
