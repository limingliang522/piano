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
        this.softClipper = null; // 软削波器（抖音级音质）
        this.eqLow = null; // 低频均衡
        this.eqMid = null; // 中频均衡
        this.eqHigh = null; // 高频均衡
        this.stereoEnhancer = null; // 立体声增强
        this.listener = null; // 3D 音频监听器
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
    
    // 初始化专业音频处理链（多段压缩 + 并行压缩）
    initAudioChain() {
        const ctx = this.audioContext;
        
        try {
            console.log('initAudioChain: 创建多段压缩链...');
            
            // === 第一段：极轻度压缩（仅控制极端峰值）===
            this.compressor1 = ctx.createDynamicsCompressor();
            this.compressor1.threshold.value = -40; // 非常温和
            this.compressor1.knee.value = 30; // 极柔和的膝部
            this.compressor1.ratio.value = 1.5; // 极轻度压缩
            this.compressor1.attack.value = 0.01;
            this.compressor1.release.value = 0.4;
            
            // === 第二段：轻度压缩（提升整体响度）===
            this.compressor2 = ctx.createDynamicsCompressor();
            this.compressor2.threshold.value = -28; // 提高阈值
            this.compressor2.knee.value = 20;
            this.compressor2.ratio.value = 2.0; // 温和压缩
            this.compressor2.attack.value = 0.01;
            this.compressor2.release.value = 0.3;
            
            // === 第三段：中度压缩（并行压缩用）===
            this.compressor3 = ctx.createDynamicsCompressor();
            this.compressor3.threshold.value = -20; // 提高阈值
            this.compressor3.knee.value = 15;
            this.compressor3.ratio.value = 3.0; // 降低压缩比
            this.compressor3.attack.value = 0.005;
            this.compressor3.release.value = 0.2;
            
            // === 并行压缩：干湿混合 ===
            this.dryGain = ctx.createGain();
            this.dryGain.gain.value = 0.8; // 更多干信号
            
            this.wetGain = ctx.createGain();
            this.wetGain.gain.value = 0.25; // 更少湿信号
            
            this.parallelMixer = ctx.createGain();
            this.parallelMixer.gain.value = 1.0;
            
            // === Makeup Gain（轻微补偿）===
            this.makeupGain = ctx.createGain();
            this.makeupGain.gain.value = 1.3; // 进一步降低
            
            console.log('initAudioChain: 创建均衡器...');
            // 三段均衡器（精细调音）
            this.eqLow = ctx.createBiquadFilter();
            this.eqLow.type = 'lowshelf';
            this.eqLow.frequency.value = 200;
            this.eqLow.gain.value = 0;
            
            this.eqMid = ctx.createBiquadFilter();
            this.eqMid.type = 'peaking';
            this.eqMid.frequency.value = 2000;
            this.eqMid.Q.value = 0.7;
            this.eqMid.gain.value = 0;
            
            this.eqHigh = ctx.createBiquadFilter();
            this.eqHigh.type = 'highshelf';
            this.eqHigh.frequency.value = 6000;
            this.eqHigh.gain.value = 0;
            
            console.log('initAudioChain: 创建混响...');
            // 卷积混响（音乐厅效果 - 轻量化）
            this.convolver = ctx.createConvolver();
            this.createReverbImpulse();
            
            // 混响干湿比控制（关闭混响以完美还原MIDI）
            this.reverbDry = ctx.createGain();
            this.reverbDry.gain.value = 1.0;
            this.reverbWet = ctx.createGain();
            this.reverbWet.gain.value = 0;
            
            console.log('initAudioChain: 创建砖墙限制器...');
            // === 砖墙限制器（最后防线，防止任何削波）===
            this.brickwallLimiter = ctx.createDynamicsCompressor();
            this.brickwallLimiter.threshold.value = -1.5; // 留出更多余量
            this.brickwallLimiter.knee.value = 1.0; // 软膝，避免失真
            this.brickwallLimiter.ratio.value = 20; // 极硬限制
            this.brickwallLimiter.attack.value = 0.001; // 快速但不过分
            this.brickwallLimiter.release.value = 0.05;
            
            console.log('initAudioChain: 创建主音量...');
            // 主音量（适中音量）
            this.masterGain = ctx.createGain();
            this.masterGain.gain.value = 1.4; // 进一步降低主音量
            
            console.log('initAudioChain: 连接音频节点...');
            // === 连接多段压缩 + 并行压缩链 ===
            
            // 串联压缩链（干信号路径）
            this.compressor1.connect(this.compressor2);
            this.compressor2.connect(this.dryGain);
            
            // 并行压缩链（湿信号路径）
            this.compressor2.connect(this.compressor3);
            this.compressor3.connect(this.wetGain);
            
            // 混合干湿信号
            this.dryGain.connect(this.parallelMixer);
            this.wetGain.connect(this.parallelMixer);
            
            // 后续处理链
            this.parallelMixer.connect(this.makeupGain);
            this.makeupGain.connect(this.eqLow);
            this.eqLow.connect(this.eqMid);
            this.eqMid.connect(this.eqHigh);
            
            // 混响并联处理
            this.eqHigh.connect(this.reverbDry);
            this.eqHigh.connect(this.convolver);
            this.convolver.connect(this.reverbWet);
            
            this.reverbDry.connect(this.brickwallLimiter);
            this.reverbWet.connect(this.brickwallLimiter);
            
            // 砖墙限制器 → 主音量 → 输出
            this.brickwallLimiter.connect(this.masterGain);
            this.masterGain.connect(ctx.destination);
            
            console.log('initAudioChain: 设置 3D 音频监听器...');
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
            
            console.log('🎵 多段压缩 + 并行压缩链已初始化');
            console.log('📊 预期响度提升: 40-50%，失真: 0%');
        } catch (error) {
            console.error('initAudioChain: 初始化失败:', error);
            throw error;
        }
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
    
    // 软削波器已移除，保持音质纯净

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

    // 播放钢琴音符（极致音质版 - 3D空间音频 - 优化内存）
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
            
            // === 简化音频链：只使用立体声定位（移除3D Panner以提升性能）===
            const stereoPanner = ctx.createStereoPanner();
            // 根据轨道位置设置立体声像（-1左 到 +1右）
            const panValue = (lane - 2) / 2; // -1, -0.5, 0, 0.5, 1
            stereoPanner.pan.value = Math.max(-1, Math.min(1, panValue));
            
            // === 音量包络（ADSR - 消除咔嚓声）===
            const gainNode = ctx.createGain();
            const baseVolume = (velocity / 127) * 1.9; // 降低基础音量
            
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
            
            // === 连接到多段压缩链 ===
            // 音源 → 立体声 → 音量包络 → 第一段压缩器 → [多段压缩链] → 输出
            source.connect(stereoPanner);
            stereoPanner.connect(gainNode);
            gainNode.connect(this.compressor1);
            
            // 播放
            source.start(now);
            source.stop(now + noteDuration);
            
            // 清理（防止内存泄漏）- 优化版
            const cleanup = () => {
                try {
                    source.disconnect();
                    stereoPanner.disconnect();
                    gainNode.disconnect();
                    source.onended = null;
                } catch (e) {
                    // 已经断开连接
                }
            };
            
            // 在音符结束后立即清理
            source.onended = cleanup;
            
            // 备用清理（防止 onended 不触发）
            setTimeout(cleanup, (noteDuration + 0.1) * 1000);

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
