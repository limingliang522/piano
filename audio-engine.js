// 极致音质钢琴音频引擎 - 专业级空间音频处理
class AudioEngine {
    constructor() {
        this.audioContext = null;
        this.masterGain = null;
        this.samples = new Map();
        this.isReady = false;
        
        // 专业音频处理链
        this.convolver = null; // 卷积混响
        this.compressor = null; // 动态压缩
        this.limiter = null; // 限制器
        this.eqLow = null; // 低频均衡
        this.eqMid = null; // 中频均衡
        this.eqHigh = null; // 高频均衡
        this.stereoEnhancer = null; // 立体声增强
        this.listener = null; // 3D 音频监听器
    }
    
    // 确保AudioContext已创建
    ensureAudioContext() {
        console.log('ensureAudioContext: 检查 audioContext...');
        if (!this.audioContext) {
            console.log('ensureAudioContext: 创建新的 AudioContext...');
            try {
                // 使用平衡模式（性能优化）
                this.audioContext = new (window.AudioContext || window.webkitAudioContext)({
                    latencyHint: 'balanced', // 平衡延迟和性能
                    sampleRate: 44100 // 标准采样率（降低CPU负担）
                });
                console.log('ensureAudioContext: AudioContext 创建成功');
                
                // 初始化专业音频处理链
                console.log('ensureAudioContext: 初始化音频处理链...');
                this.initAudioChain();
                console.log('ensureAudioContext: 音频处理链初始化完成');
            } catch (error) {
                console.error('ensureAudioContext: 创建失败:', error);
                throw error;
            }
        } else {
            console.log('ensureAudioContext: audioContext 已存在');
        }
    }
    
    // 初始化专业音频处理链
    initAudioChain() {
        const ctx = this.audioContext;
        
        // 1. 动态压缩器（平衡音量，增加冲击力 - 柔和设置）
        this.compressor = ctx.createDynamicsCompressor();
        this.compressor.threshold.value = -24; // 阈值（提高，减少压缩）
        this.compressor.knee.value = 40; // 更柔和的压缩
        this.compressor.ratio.value = 4; // 压缩比（降低，避免失真）
        this.compressor.attack.value = 0.003; // 快速响应
        this.compressor.release.value = 0.25; // 释放时间
        
        // 2. 三段均衡器（精细调音）
        // 低频增强（温暖厚实）
        this.eqLow = ctx.createBiquadFilter();
        this.eqLow.type = 'lowshelf';
        this.eqLow.frequency.value = 200;
        this.eqLow.gain.value = 3; // +3dB
        
        // 中频塑形（清晰度）
        this.eqMid = ctx.createBiquadFilter();
        this.eqMid.type = 'peaking';
        this.eqMid.frequency.value = 2000;
        this.eqMid.Q.value = 0.7;
        this.eqMid.gain.value = 2; // +2dB
        
        // 高频提亮（明亮空气感）
        this.eqHigh = ctx.createBiquadFilter();
        this.eqHigh.type = 'highshelf';
        this.eqHigh.frequency.value = 6000;
        this.eqHigh.gain.value = 4; // +4dB
        
        // 3. 卷积混响（音乐厅效果 - 轻量化）
        this.convolver = ctx.createConvolver();
        this.createReverbImpulse(); // 创建混响脉冲响应
        
        // 混响干湿比控制（减少混响，提升性能）
        this.reverbDry = ctx.createGain();
        this.reverbDry.gain.value = 0.85; // 85% 干声
        this.reverbWet = ctx.createGain();
        this.reverbWet.gain.value = 0.15; // 15% 湿声（减少混响）
        
        // 4. 限制器（防止削波 - 柔和限制）
        this.limiter = ctx.createDynamicsCompressor();
        this.limiter.threshold.value = -3; // 提高阈值，减少限制
        this.limiter.knee.value = 6; // 更柔和的拐点
        this.limiter.ratio.value = 12; // 降低压缩比
        this.limiter.attack.value = 0.003;
        this.limiter.release.value = 0.1;
        
        // 5. 主音量（适中音量，避免失真）
        this.masterGain = ctx.createGain();
        this.masterGain.gain.value = 1.8;
        
        // 连接音频处理链：
        // 压缩 → 均衡器 → 混响 → 限制器 → 主音量 → 输出
        this.compressor.connect(this.eqLow);
        this.eqLow.connect(this.eqMid);
        this.eqMid.connect(this.eqHigh);
        
        // 混响并联处理
        this.eqHigh.connect(this.reverbDry);
        this.eqHigh.connect(this.convolver);
        this.convolver.connect(this.reverbWet);
        
        this.reverbDry.connect(this.limiter);
        this.reverbWet.connect(this.limiter);
        
        this.limiter.connect(this.masterGain);
        this.masterGain.connect(ctx.destination);
        
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
        
        console.log('🎵 专业音频处理链已初始化');
    }
    
    // 创建音乐厅混响脉冲响应（轻量化版本 - 提升性能）
    createReverbImpulse() {
        const ctx = this.audioContext;
        const sampleRate = ctx.sampleRate;
        const length = sampleRate * 1.2; // 1.2秒混响（减少计算量）
        const impulse = ctx.createBuffer(2, length, sampleRate);
        const impulseL = impulse.getChannelData(0);
        const impulseR = impulse.getChannelData(1);
        
        // 生成轻量级混响（减少随机数生成）
        for (let i = 0; i < length; i++) {
            // 指数衰减
            const decay = Math.exp(-i / (sampleRate * 0.5));
            
            // 早期反射（前 30ms）
            let earlyReflections = 0;
            if (i < sampleRate * 0.03) {
                earlyReflections = (Math.random() * 2 - 1) * 0.4 * decay;
            }
            
            // 后期混响（扩散 - 简化）
            const lateReverb = (Math.random() * 2 - 1) * decay * 0.2;
            
            // 左右声道略有不同
            impulseL[i] = earlyReflections + lateReverb;
            impulseR[i] = earlyReflections + lateReverb * 0.95;
        }
        
        this.convolver.buffer = impulse;
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

    // 播放钢琴音符（极致音质版 - 3D空间音频）
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
            
            // === 3D 空间音频定位 ===
            const panner = ctx.createPanner();
            panner.panningModel = 'HRTF'; // 使用头部相关传输函数（最真实）
            panner.distanceModel = 'inverse'; // 距离衰减模型
            panner.refDistance = 1;
            panner.maxDistance = 10000;
            panner.rolloffFactor = 1;
            panner.coneInnerAngle = 360;
            panner.coneOuterAngle = 360;
            panner.coneOuterGain = 0;
            
            // 根据轨道位置设置 3D 空间位置
            // 5条轨道：lane 0-4，中间是 lane 2
            const laneWidth = 3; // 轨道间距
            const xPosition = (lane - 2) * laneWidth; // -6, -3, 0, 3, 6
            const yPosition = 0; // 水平高度
            const zPosition = -5; // 音符从前方传来
            
            if (panner.positionX) {
                panner.positionX.value = xPosition;
                panner.positionY.value = yPosition;
                panner.positionZ.value = zPosition;
            } else {
                panner.setPosition(xPosition, yPosition, zPosition);
            }
            
            // === 立体声增强 ===
            const stereoPanner = ctx.createStereoPanner();
            // 根据轨道位置设置立体声像（-1左 到 +1右）
            const panValue = (lane - 2) / 2; // -1, -0.5, 0, 0.5, 1
            stereoPanner.pan.value = Math.max(-1, Math.min(1, panValue));
            
            // === 音量包络（ADSR - 消除咔嚓声）===
            const gainNode = ctx.createGain();
            const baseVolume = (velocity / 127) * 2.8; // 基础音量（适中，避免失真）
            
            // 根据音高调整音量（高音稍微轻一点）
            const pitchFactor = 1 - (midiNote - 60) / 200;
            const volume = baseVolume * Math.max(0.9, Math.min(1.5, pitchFactor));
            
            // Attack（柔和起音，10ms - 消除咔嚓声）
            gainNode.gain.setValueAtTime(0, now);
            gainNode.gain.linearRampToValueAtTime(volume, now + 0.01);
            
            // Decay + Sustain（保持）
            const sustainTime = Math.max(noteDuration - 0.08, 0.02);
            gainNode.gain.setValueAtTime(volume, now + 0.01);
            // 自然衰减
            gainNode.gain.linearRampToValueAtTime(volume * 0.7, now + 0.01 + sustainTime);
            
            // Release（柔和释放，70ms - 消除咔嚓声）
            gainNode.gain.linearRampToValueAtTime(0, now + noteDuration);
            
            // === 微妙的音高调制（模拟真实钢琴的不完美）===
            const detuneAmount = (Math.random() - 0.5) * 2; // ±1 cent
            source.detune.value = detuneAmount;
            
            // === 连接音频处理链 ===
            // 音源 → 3D定位 → 立体声 → 音量包络 → 压缩器 → [效果链] → 输出
            source.connect(panner);
            panner.connect(stereoPanner);
            stereoPanner.connect(gainNode);
            gainNode.connect(this.compressor);
            
            // 播放
            source.start(now);
            source.stop(now + noteDuration);
            
            // 清理（防止内存泄漏）
            source.onended = () => {
                try {
                    source.disconnect();
                    panner.disconnect();
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

    // 播放碰撞音效（增强版 - 更有冲击力）
    playCollision() {
        const ctx = this.audioContext;
        const now = ctx.currentTime;
        
        // === 低频冲击 ===
        const bass = ctx.createOscillator();
        bass.type = 'sine';
        bass.frequency.setValueAtTime(80, now);
        bass.frequency.exponentialRampToValueAtTime(30, now + 0.4);
        
        const bassGain = ctx.createGain();
        bassGain.gain.setValueAtTime(0.5, now);
        bassGain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
        
        // === 中频撞击声 ===
        const mid = ctx.createOscillator();
        mid.type = 'square';
        mid.frequency.setValueAtTime(200, now);
        mid.frequency.exponentialRampToValueAtTime(80, now + 0.2);
        
        const midGain = ctx.createGain();
        midGain.gain.setValueAtTime(0.3, now);
        midGain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
        
        // === 高频碎裂声（噪音） ===
        const noiseBuffer = ctx.createBuffer(1, ctx.sampleRate * 0.1, ctx.sampleRate);
        const noiseData = noiseBuffer.getChannelData(0);
        for (let i = 0; i < noiseData.length; i++) {
            noiseData[i] = Math.random() * 2 - 1;
        }
        
        const noise = ctx.createBufferSource();
        noise.buffer = noiseBuffer;
        
        const noiseFilter = ctx.createBiquadFilter();
        noiseFilter.type = 'highpass';
        noiseFilter.frequency.value = 2000;
        
        const noiseGain = ctx.createGain();
        noiseGain.gain.setValueAtTime(0.2, now);
        noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
        
        // === 低通滤波器（模拟撞击的闷响）===
        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(1000, now);
        filter.Q.value = 5;
        
        // 连接音频节点
        bass.connect(bassGain);
        mid.connect(midGain);
        noise.connect(noiseFilter);
        noiseFilter.connect(noiseGain);
        
        bassGain.connect(filter);
        midGain.connect(filter);
        noiseGain.connect(filter);
        
        filter.connect(this.compressor);
        
        // 播放
        bass.start(now);
        bass.stop(now + 0.4);
        mid.start(now);
        mid.stop(now + 0.2);
        noise.start(now);
        noise.stop(now + 0.15);
    }

    // 启动音频上下文
    async start() {
        console.log('start() 方法开始执行...');
        try {
            console.log('调用 ensureAudioContext()...');
            this.ensureAudioContext();
            console.log('ensureAudioContext() 完成，audioContext 状态:', this.audioContext ? this.audioContext.state : 'null');
            
            if (!this.audioContext) {
                throw new Error('AudioContext 创建失败');
            }
            
            if (this.audioContext.state === 'suspended') {
                console.log('音频上下文被挂起，尝试恢复...');
                await this.audioContext.resume();
                console.log('音频上下文恢复成功，新状态:', this.audioContext.state);
            }
            
            console.log('start() 方法执行完成');
            return true;
        } catch (error) {
            console.error('start() 方法执行失败:', error);
            throw error;
        }
    }
}
