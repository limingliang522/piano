// 简化音频引擎 - 使用合成音
class AudioEngine {
    constructor() {
        this.audioContext = null;
        this.masterGain = null;
        this.isReady = false;
        
        // 简化音频处理链
        this.compressor = null; // 兼容性引用
        this.listener = null; // 3D 音频监听器
        
        // 音频增强功能
        this.activeNotes = new Map(); // 跟踪活跃音符
        this.performanceMode = 'high'; // 性能模式：high/medium/low
        this.reverbEnabled = true; // 混响开关
        this.spatialAudioEnabled = true; // 3D音频开关
        
        // 音频分析器（可视化支持）
        this.analyser = null;
        this.analyserData = null;
    }
    
    // 确保AudioContext已创建
    ensureAudioContext() {
        if (!this.audioContext) {
            try {
                // 使用平衡模式（性能优化）
                this.audioContext = new (window.AudioContext || window.webkitAudioContext)({
                    latencyHint: 'balanced',
                    sampleRate: 44100
                });
                
                // 初始化专业音频处理链
                this.initAudioChain();
                
                // 初始化音频分析器
                this.initAnalyser();
            } catch (error) {
                console.error('ensureAudioContext: 创建失败:', error);
                throw error;
            }
        }
    }
    
    // 初始化音频分析器（用于可视化）
    initAnalyser() {
        const ctx = this.audioContext;
        this.analyser = ctx.createAnalyser();
        this.analyser.fftSize = 2048;
        this.analyser.smoothingTimeConstant = 0.8;
        this.analyserData = new Uint8Array(this.analyser.frequencyBinCount);
        
        // 将分析器连接到主输出
        if (this.masterGain) {
            this.masterGain.connect(this.analyser);
        }
    }
    
    // 获取音频频谱数据（用于可视化）
    getFrequencyData() {
        if (this.analyser && this.analyserData) {
            this.analyser.getByteFrequencyData(this.analyserData);
            return this.analyserData;
        }
        return null;
    }
    
    // 获取音频波形数据
    getWaveformData() {
        if (this.analyser && this.analyserData) {
            this.analyser.getByteTimeDomainData(this.analyserData);
            return this.analyserData;
        }
        return null;
    }
    
    // 初始化音频处理链（简化版）
    initAudioChain() {
        const ctx = this.audioContext;
        
        try {
            console.log('initAudioChain: 初始化简化音频输出...');
            
            // 创建主音量控制
            this.masterGain = ctx.createGain();
            this.masterGain.gain.value = 12.0;
            
            // 直接连接到输出
            this.masterGain.connect(ctx.destination);
            
            // 兼容性：compressor 指向 masterGain
            this.compressor = this.masterGain;
            
            // 设置 3D 音频监听器位置
            this.listener = ctx.listener;
            if (this.listener.positionX) {
                this.listener.positionX.value = 0;
                this.listener.positionY.value = 0;
                this.listener.positionZ.value = 0;
                this.listener.forwardX.value = 0;
                this.listener.forwardY.value = 0;
                this.listener.forwardZ.value = -1;
                this.listener.upX.value = 0;
                this.listener.upY.value = 1;
                this.listener.upZ.value = 0;
            }
            
            console.log('✅ 简化音频系统已初始化');
        } catch (error) {
            console.error('initAudioChain: 初始化失败:', error);
            throw error;
        }
    }

    // MIDI 音符转频率
    midiToFrequency(midiNote) {
        return 440 * Math.pow(2, (midiNote - 69) / 12);
    }

    // 初始化（无需加载采样）
    async init(progressCallback) {
        this.ensureAudioContext();
        
        // 模拟加载进度
        const total = 12;
        for (let i = 0; i < total; i++) {
            if (progressCallback) {
                progressCallback(i + 1, total);
            }
            await new Promise(resolve => setTimeout(resolve, 50));
        }
        
        this.isReady = true;
        console.log('✅ 音频引擎初始化完成');
        return true;
    }

    // 播放音符（使用合成音）
    playNote(midiNote, duration = 0.5, velocity = 100, lane = 2) {
        if (!this.isReady) {
            console.warn('音频引擎未初始化');
            return null;
        }

        try {
            const ctx = this.audioContext;
            const now = ctx.currentTime;
            const noteDuration = Math.min(duration, 5);
            
            // 创建振荡器
            const oscillator = ctx.createOscillator();
            oscillator.type = 'sine';
            oscillator.frequency.value = this.midiToFrequency(midiNote);
            
            let panner = null;
            let stereoPanner = null;
            
            if (this.spatialAudioEnabled && (this.performanceMode === 'high' || this.performanceMode === 'medium')) {
                panner = ctx.createPanner();
                panner.panningModel = this.performanceMode === 'high' ? 'HRTF' : 'equalpower';
                panner.distanceModel = 'inverse';
                panner.refDistance = 1;
                panner.maxDistance = 10000;
                panner.rolloffFactor = 1;
                panner.coneInnerAngle = 360;
                panner.coneOuterAngle = 360;
                panner.coneOuterGain = 0;
                
                const laneWidth = 3;
                const xPosition = (lane - 2) * laneWidth;
                const yPosition = 0;
                const zPosition = -5;
                
                if (panner.positionX) {
                    panner.positionX.value = xPosition;
                    panner.positionY.value = yPosition;
                    panner.positionZ.value = zPosition;
                }
            } else {
                stereoPanner = ctx.createStereoPanner();
                const panValue = (lane - 2) / 3;
                stereoPanner.pan.value = Math.max(-0.8, Math.min(0.8, panValue));
            }
            
            const gainNode = ctx.createGain();
            const velocityFactor = Math.pow(velocity / 127, 1.0);
            const baseVolume = velocityFactor * 0.3;
            
            let pitchFactor = 1.0;
            if (midiNote < 48) {
                pitchFactor = 1.1;
            } else if (midiNote > 84) {
                pitchFactor = 0.9;
            }
            const volume = baseVolume * pitchFactor;
            
            gainNode.gain.setValueAtTime(0, now);
            gainNode.gain.linearRampToValueAtTime(volume, now + 0.005);
            
            const sustainTime = Math.max(noteDuration - 0.06, 0.02);
            gainNode.gain.setValueAtTime(volume, now + 0.005);
            gainNode.gain.exponentialRampToValueAtTime(volume * 0.6, now + 0.005 + sustainTime);
            gainNode.gain.exponentialRampToValueAtTime(0.001, now + noteDuration);
            
            if (panner) {
                oscillator.connect(panner);
                panner.connect(gainNode);
            } else if (stereoPanner) {
                oscillator.connect(stereoPanner);
                stereoPanner.connect(gainNode);
            } else {
                oscillator.connect(gainNode);
            }
            gainNode.connect(this.compressor);
            
            oscillator.start(now);
            oscillator.stop(now + noteDuration);
            
            oscillator.onended = () => {
                try {
                    oscillator.disconnect();
                    if (panner) panner.disconnect();
                    if (stereoPanner) stereoPanner.disconnect();
                    gainNode.disconnect();
                    this.activeNotes.delete(noteId);
                } catch (e) {
                    // 已经断开连接
                }
            };
            
            const noteId = `${midiNote}_${now}_${Math.random()}`;
            this.activeNotes.set(noteId, {
                oscillator,
                gainNode,
                startTime: now,
                endTime: now + noteDuration,
                midiNote
            });
            
            return noteId;

        } catch (error) {
            console.error('播放音符失败:', error);
            return null;
        }
    }
    
    // 提前停止音符
    stopNote(noteId, fadeOutTime = 0.05) {
        const noteData = this.activeNotes.get(noteId);
        if (!noteData) return;
        
        try {
            const ctx = this.audioContext;
            const now = ctx.currentTime;
            const { gainNode, oscillator, endTime } = noteData;
            
            if (now < endTime) {
                gainNode.gain.cancelScheduledValues(now);
                gainNode.gain.setValueAtTime(gainNode.gain.value, now);
                gainNode.gain.exponentialRampToValueAtTime(0.001, now + fadeOutTime);
                oscillator.stop(now + fadeOutTime);
            }
            
            this.activeNotes.delete(noteId);
        } catch (error) {
            console.warn('停止音符失败:', error);
        }
    }
    
    // 停止所有音符（用于暂停/停止游戏）
    stopAllNotes(fadeOutTime = 0.1) {
        const noteIds = Array.from(this.activeNotes.keys());
        noteIds.forEach(noteId => this.stopNote(noteId, fadeOutTime));
    }

    // 播放碰撞音效（简化版）
    playCollision() {
        const ctx = this.audioContext;
        const now = ctx.currentTime;
        
        // 低频冲击
        const bass = ctx.createOscillator();
        bass.type = 'sine';
        bass.frequency.setValueAtTime(80, now);
        bass.frequency.exponentialRampToValueAtTime(30, now + 0.4);
        
        const bassGain = ctx.createGain();
        bassGain.gain.setValueAtTime(0.5, now);
        bassGain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
        
        // 连接到主音量
        bass.connect(bassGain);
        bassGain.connect(this.masterGain);
        
        // 播放
        bass.start(now);
        bass.stop(now + 0.4);
    }

    // 启动音频上下文（优化版 - 非阻塞）
    async start() {
        this.ensureAudioContext();
        
        if (this.audioContext.state === 'suspended') {
            console.log('音频上下文被挂起，尝试恢复...');
            
            // 使用非阻塞方式恢复，不等待完成
            this.audioContext.resume().then(() => {
                console.log('✅ 音频上下文恢复成功');
            }).catch(error => {
                console.warn('音频上下文恢复失败（不影响使用）:', error);
            });
        }
        
        console.log('音频上下文状态:', this.audioContext.state);
        
        // 异步预热，不阻塞启动
        setTimeout(() => this.warmupAudio(), 100);
    }
    
    // 预热音频系统（轻量版 - 不阻塞）
    warmupAudio() {
        try {
            const ctx = this.audioContext;
            const now = ctx.currentTime;
            
            // 创建一个极短的静音振荡器（异步执行）
            const oscillator = ctx.createOscillator();
            const gainNode = ctx.createGain();
            
            oscillator.frequency.value = 440;
            gainNode.gain.value = 0.0001; // 几乎听不见
            
            oscillator.connect(gainNode);
            gainNode.connect(this.masterGain);
            
            oscillator.start(now);
            oscillator.stop(now + 0.005); // 5ms极短音
            
            console.log('✅ 音频系统预热完成');
        } catch (error) {
            console.warn('音频预热失败（不影响使用）:', error);
        }
    }
    
    // 设置主音量 (0.0 - 1.0)
    setMasterVolume(volume) {
        if (!this.masterGain) {
            console.warn('音频引擎未初始化，无法设置音量');
            return;
        }
        
        // 限制音量范围
        const clampedVolume = Math.max(0, Math.min(1, volume));
        
        // 简化版：直接使用音量值
        this.masterGain.gain.value = clampedVolume * 12.0;
        
        console.log(`🔊 主音量设置为: ${Math.round(clampedVolume * 100)}%`);
    }
    
    // 设置性能模式
    setPerformanceMode(mode) {
        if (['high', 'medium', 'low'].includes(mode)) {
            this.performanceMode = mode;
            console.log(`🎮 性能模式切换为: ${mode}`);
        }
    }
    
    // 切换混响效果
    toggleReverb(enabled) {
        this.reverbEnabled = enabled;
        console.log(`🎵 混响效果: ${enabled ? '开启' : '关闭'}`);
    }
    
    // 切换3D空间音频
    toggleSpatialAudio(enabled) {
        this.spatialAudioEnabled = enabled;
        console.log(`🎧 3D空间音频: ${enabled ? '开启' : '关闭'}`);
    }
    
    // 获取当前活跃音符数量
    getActiveNoteCount() {
        return this.activeNotes.size;
    }
    
    // 获取音频系统状态
    getStatus() {
        return {
            isReady: this.isReady,
            samplesLoaded: 0,
            activeNotes: this.activeNotes.size,
            performanceMode: this.performanceMode,
            reverbEnabled: this.reverbEnabled,
            spatialAudioEnabled: this.spatialAudioEnabled,
            contextState: this.audioContext ? this.audioContext.state : 'not initialized'
        };
    }
    
    // 播放UI点击音效
    playClickSound() {
        if (!this.isReady) {
            console.warn('音频引擎未初始化');
            return;
        }
        
        try {
            const highNotes = [72, 74, 76, 77, 79, 81, 83, 84];
            const randomNote = highNotes[Math.floor(Math.random() * highNotes.length)];
            this.playNote(randomNote, 0.3, 80, 2);
        } catch (error) {
            console.warn('播放点击音效失败:', error);
        }
    }
    
    // 播放开始游戏音效
    playStartSound() {
        if (!this.isReady) {
            console.warn('音频引擎未初始化');
            return;
        }
        
        try {
            this.playNote(72, 0.5, 100, 2);
        } catch (error) {
            console.warn('播放开始音效失败:', error);
        }
    }
}
