// 极致音质钢琴音频引擎 - 专业级空间音频处理
class AudioEngine {
    constructor() {
        this.audioContext = null;
        this.masterGain = null;
        this.samples = new Map();
        this.isReady = false;
        
        // 专业音频处理链
        this.convolver = null; // 卷积混响
        this.compressor = null; // 动态压缩（保留用于兼容）
        this.limiter = null; // 限制器
        this.softClipper = null; // 软削波器（抖音级音质）
        this.eqLow = null; // 低频均衡
        this.eqMid = null; // 中频均衡
        this.eqHigh = null; // 高频均衡
        this.stereoEnhancer = null; // 立体声增强
        this.listener = null; // 3D 音频监听器
        
        // 多段压缩器（母带级处理）
        this.multibandSplitter = null; // 分频器输入
        this.lowpassFilter = null; // 低频分离
        this.bandpassFilter = null; // 中频分离
        this.highpassFilter = null; // 高频分离
        this.compressorLow = null; // 低频压缩器
        this.compressorMid = null; // 中频压缩器
        this.compressorHigh = null; // 高频压缩器
        this.multibandMerger = null; // 合并器
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
    
    // 初始化专业音频处理链
    initAudioChain() {
        const ctx = this.audioContext;
        
        try {
            console.log('initAudioChain: 创建多段压缩器（母带级）...');
            
            // === 1. 多段压缩器系统 ===
            
            // 1.1 分频器（将音频分成三个频段 - Linkwitz-Riley 交叉）
            this.multibandSplitter = ctx.createGain(); // 输入节点
            
            // 低频通道（20Hz - 150Hz）- 只处理极低音
            this.lowpassFilter = ctx.createBiquadFilter();
            this.lowpassFilter.type = 'lowpass';
            this.lowpassFilter.frequency.value = 150; // 降低分频点
            this.lowpassFilter.Q.value = 0.707; // Butterworth 响应
            
            // 中频通道（150Hz - 5kHz）- 主要音乐内容
            this.bandpassFilterLow = ctx.createBiquadFilter();
            this.bandpassFilterLow.type = 'highpass';
            this.bandpassFilterLow.frequency.value = 150;
            this.bandpassFilterLow.Q.value = 0.707;
            
            this.bandpassFilterHigh = ctx.createBiquadFilter();
            this.bandpassFilterHigh.type = 'lowpass';
            this.bandpassFilterHigh.frequency.value = 5000;
            this.bandpassFilterHigh.Q.value = 0.707;
            
            // 高频通道（5kHz - 20kHz）- 空气感和明亮度
            this.highpassFilter = ctx.createBiquadFilter();
            this.highpassFilter.type = 'highpass';
            this.highpassFilter.frequency.value = 5000;
            this.highpassFilter.Q.value = 0.707;
            
            // 1.2 低频压缩器（极轻微压缩，保持原音）
            this.compressorLow = ctx.createDynamicsCompressor();
            this.compressorLow.threshold.value = -30; // 高阈值，很少触发
            this.compressorLow.knee.value = 40; // 极柔和拐点
            this.compressorLow.ratio.value = 3; // 温和压缩比
            this.compressorLow.attack.value = 0.02; // 慢响应，保留瞬态
            this.compressorLow.release.value = 0.25; // 慢释放
            
            // 1.3 中频压缩器（几乎不压缩，保持清晰）
            this.compressorMid = ctx.createDynamicsCompressor();
            this.compressorMid.threshold.value = -30;
            this.compressorMid.knee.value = 40;
            this.compressorMid.ratio.value = 2; // 极温和压缩
            this.compressorMid.attack.value = 0.01;
            this.compressorMid.release.value = 0.2;
            
            // 1.4 高频压缩器（几乎不工作，保持明亮）
            this.compressorHigh = ctx.createDynamicsCompressor();
            this.compressorHigh.threshold.value = -20; // 极高阈值
            this.compressorHigh.knee.value = 30;
            this.compressorHigh.ratio.value = 1.5; // 极轻微压缩
            this.compressorHigh.attack.value = 0.005;
            this.compressorHigh.release.value = 0.15;
            
            // 1.5 各频段 Makeup Gain（平衡增益，保持音色）
            this.makeupGainLow = ctx.createGain();
            this.makeupGainLow.gain.value = 1.8; // 降低增益，避免破音
            
            this.makeupGainMid = ctx.createGain();
            this.makeupGainMid.gain.value = 2.0; // 降低增益，避免破音
            
            this.makeupGainHigh = ctx.createGain();
            this.makeupGainHigh.gain.value = 2.0; // 降低增益，避免破音
            
            // 1.6 合并器
            this.multibandMerger = ctx.createGain();
            
            // 连接分频器（三个并行通道）
            // 低频通道
            this.multibandSplitter.connect(this.lowpassFilter);
            this.lowpassFilter.connect(this.compressorLow);
            this.compressorLow.connect(this.makeupGainLow);
            this.makeupGainLow.connect(this.multibandMerger);
            
            // 中频通道（串联两个滤波器形成带通）
            this.multibandSplitter.connect(this.bandpassFilterLow);
            this.bandpassFilterLow.connect(this.bandpassFilterHigh);
            this.bandpassFilterHigh.connect(this.compressorMid);
            this.compressorMid.connect(this.makeupGainMid);
            this.makeupGainMid.connect(this.multibandMerger);
            
            // 高频通道
            this.multibandSplitter.connect(this.highpassFilter);
            this.highpassFilter.connect(this.compressorHigh);
            this.compressorHigh.connect(this.makeupGainHigh);
            this.makeupGainHigh.connect(this.multibandMerger);
            
            // 保留旧的 compressor 引用（用于兼容性）
            this.compressor = this.multibandSplitter;
            this.makeupGain = this.multibandMerger;
            
            console.log('initAudioChain: 创建均衡器...');
            // 2. 三段均衡器（精细调音）
            this.eqLow = ctx.createBiquadFilter();
            this.eqLow.type = 'lowshelf';
            this.eqLow.frequency.value = 200;
            this.eqLow.gain.value = 0.5; // 轻微增强，避免过度
            
            this.eqMid = ctx.createBiquadFilter();
            this.eqMid.type = 'peaking';
            this.eqMid.frequency.value = 2500;
            this.eqMid.Q.value = 0.8;
            this.eqMid.gain.value = 0.5; // 轻微提升，避免过度
            
            this.eqHigh = ctx.createBiquadFilter();
            this.eqHigh.type = 'highshelf';
            this.eqHigh.frequency.value = 8000;
            this.eqHigh.gain.value = 1.0; // 降低增益，避免破音
            
            console.log('initAudioChain: 创建混响...');
            // 3. 卷积混响（音乐厅效果 - 轻量化）
            this.convolver = ctx.createConvolver();
            this.createReverbImpulse();
            
            // 混响干湿比控制（轻微混响，增加空间感）
            this.reverbDry = ctx.createGain();
            this.reverbDry.gain.value = 0.85; // 85% 干声
            this.reverbWet = ctx.createGain();
            this.reverbWet.gain.value = 0.15; // 15% 湿声（轻微混响）
            
            console.log('initAudioChain: 创建限制器...');
            // 4. 限制器（温和保护，保持音质）
            this.limiter = ctx.createDynamicsCompressor();
            this.limiter.threshold.value = -1.0; // 温和阈值
            this.limiter.knee.value = 6; // 柔和拐点，减少失真
            this.limiter.ratio.value = 4; // 温和压缩比，保持音质
            this.limiter.attack.value = 0.003; // 稍慢响应，保留瞬态
            this.limiter.release.value = 0.1; // 较慢释放，更自然
            
            console.log('initAudioChain: 创建主音量...');
            // 5. 主音量（适度提升，避免破音）
            this.masterGain = ctx.createGain();
            this.masterGain.gain.value = 2.2; // 降低主音量，避免破音
            
            console.log('initAudioChain: 连接音频节点...');
            // 连接音频处理链（多段压缩器 → EQ → 混响 → 限制器）
            // 注意：multibandSplitter 是输入，multibandMerger 是输出
            this.multibandMerger.connect(this.eqLow);
            this.eqLow.connect(this.eqMid);
            this.eqMid.connect(this.eqHigh);
            
            // 混响并联处理
            this.eqHigh.connect(this.reverbDry);
            this.eqHigh.connect(this.convolver);
            this.convolver.connect(this.reverbWet);
            
            this.reverbDry.connect(this.limiter);
            this.reverbWet.connect(this.limiter);
            
            // 直接连接到主音量，跳过软削波器（保持清晰度）
            this.limiter.connect(this.masterGain);
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
            
            console.log('🎵 母带级多段压缩音频处理链已初始化');
            console.log('📊 频段分配: 低频(20-150Hz) | 中频(150-5kHz) | 高频(5-20kHz)');
            console.log('🎚️ 压缩策略: 低频激进 | 中频透明 | 高频轻微');
        } catch (error) {
            console.error('initAudioChain: 初始化失败:', error);
            throw error;
        }
    }
    
    // 创建自然混响脉冲响应（钢琴房效果）
    createReverbImpulse() {
        const ctx = this.audioContext;
        const sampleRate = ctx.sampleRate;
        const length = sampleRate * 0.8; // 0.8秒混响（更短，更自然）
        const impulse = ctx.createBuffer(2, length, sampleRate);
        const impulseL = impulse.getChannelData(0);
        const impulseR = impulse.getChannelData(1);
        
        // 生成自然混响（钢琴房效果）
        for (let i = 0; i < length; i++) {
            // 更快的指数衰减（模拟小房间）
            const decay = Math.exp(-i / (sampleRate * 0.3));
            
            // 早期反射（前 20ms）- 更清晰
            let earlyReflections = 0;
            if (i < sampleRate * 0.02) {
                earlyReflections = (Math.random() * 2 - 1) * 0.3 * decay;
            }
            
            // 后期混响（更轻微）
            const lateReverb = (Math.random() * 2 - 1) * decay * 0.15;
            
            // 左右声道略有不同
            impulseL[i] = earlyReflections + lateReverb;
            impulseR[i] = earlyReflections + lateReverb * 0.92;
        }
        
        this.convolver.buffer = impulse;
    }
    
    // 创建软削波曲线（清晰版 - 减少失真）
    makeSoftClipCurve() {
        const samples = 2048;
        const curve = new Float32Array(samples);
        const drive = 1.05; // 降低驱动，减少失真
        
        for (let i = 0; i < samples; i++) {
            const x = (i / samples) * 2 - 1; // -1 到 1
            const driven = x * drive;
            
            // 使用 tanh 软削波（平滑过渡，不失真）
            curve[i] = Math.tanh(driven) / Math.tanh(drive);
        }
        
        return curve;
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
        
        // 播放一个静音测试音符，预热音频管道
        console.log('🔊 预热音频管道...');
        await this.warmupWithSample();
        
        return true;
    }
    
    // 使用真实采样预热（更彻底）
    async warmupWithSample() {
        try {
            // 找到中音区的采样（C4）
            const warmupNote = this.samples.get('C4') || this.samples.values().next().value;
            if (!warmupNote) return;
            
            const ctx = this.audioContext;
            const now = ctx.currentTime;
            
            // 创建一个极短、极小音量的音符
            const source = ctx.createBufferSource();
            source.buffer = warmupNote;
            
            const gainNode = ctx.createGain();
            gainNode.gain.setValueAtTime(0.001, now); // 几乎听不见
            gainNode.gain.exponentialRampToValueAtTime(0.0001, now + 0.05);
            
            source.connect(gainNode);
            gainNode.connect(this.multibandSplitter); // 连接到多段压缩器输入
            
            source.start(now);
            source.stop(now + 0.05);
            
            // 等待播放完成
            await new Promise(resolve => setTimeout(resolve, 100));
            
            console.log('✅ 音频管道预热完成');
        } catch (error) {
            console.warn('采样预热失败（不影响使用）:', error);
        }
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
        // 固定使用高性能模式
        const performanceMode = 'high';
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
            
            // === 3D 空间音频定位（根据性能模式调整）===
            let panner = null;
            let stereoPanner = null;
            
            if (performanceMode === 'high' || performanceMode === 'medium') {
                // 高/中性能：使用 3D 空间音频
                panner = ctx.createPanner();
                panner.panningModel = performanceMode === 'high' ? 'HRTF' : 'equalpower'; // 中性能用简化算法
                panner.distanceModel = 'inverse';
                panner.refDistance = 1;
                panner.maxDistance = 10000;
                panner.rolloffFactor = 1;
                panner.coneInnerAngle = 360;
                panner.coneOuterAngle = 360;
                panner.coneOuterGain = 0;
                
                // 根据轨道位置设置 3D 空间位置
                const laneWidth = 3;
                const xPosition = (lane - 2) * laneWidth;
                const yPosition = 0;
                const zPosition = -5;
                
                if (panner.positionX) {
                    panner.positionX.value = xPosition;
                    panner.positionY.value = yPosition;
                    panner.positionZ.value = zPosition;
                } else {
                    panner.setPosition(xPosition, yPosition, zPosition);
                }
            } else {
                // 低性能：只使用简单立体声
                stereoPanner = ctx.createStereoPanner();
                const panValue = (lane - 2) / 3;
                stereoPanner.pan.value = Math.max(-0.8, Math.min(0.8, panValue));
            }
            
            // === 音量包络（ADSR - 完美还原MIDI力度）===
            const gainNode = ctx.createGain();
            // 使用更精确的velocity映射（MIDI标准：velocity 0-127）
            const velocityFactor = Math.pow(velocity / 127, 1.3);
            const baseVolume = velocityFactor * 2.0; // 降低基础音量，避免破音
            
            // 根据音高调整音量（模拟真实钢琴）
            let pitchFactor = 1.0;
            if (midiNote < 48) {
                // 低音区：稍微增强
                pitchFactor = 1.1;
            } else if (midiNote > 84) {
                // 高音区：稍微减弱
                pitchFactor = 0.9;
            }
            const volume = baseVolume * pitchFactor;
            
            // Attack（快速起音，5ms - 保留钢琴的瞬态特性）
            gainNode.gain.setValueAtTime(0, now);
            gainNode.gain.linearRampToValueAtTime(volume, now + 0.005);
            
            // Decay + Sustain（自然衰减）
            const sustainTime = Math.max(noteDuration - 0.06, 0.02);
            gainNode.gain.setValueAtTime(volume, now + 0.005);
            // 钢琴的自然衰减（指数衰减更自然）
            gainNode.gain.exponentialRampToValueAtTime(volume * 0.6, now + 0.005 + sustainTime);
            
            // Release（快速释放，50ms）
            gainNode.gain.exponentialRampToValueAtTime(0.001, now + noteDuration);
            
            // === 完美还原MIDI，不添加随机音高偏移 ===
            // 已移除随机 detune，保持音高精确
            
            // === 连接音频处理链（根据性能模式）===
            if (panner) {
                // 高/中性能：3D 音频链
                source.connect(panner);
                panner.connect(gainNode);
            } else if (stereoPanner) {
                // 低性能：简单立体声
                source.connect(stereoPanner);
                stereoPanner.connect(gainNode);
            } else {
                // 超低性能：直连
                source.connect(gainNode);
            }
            gainNode.connect(this.compressor);
            
            // 播放
            source.start(now);
            source.stop(now + noteDuration);
            
            // 清理（防止内存泄漏）
            source.onended = () => {
                try {
                    source.disconnect();
                    if (panner) panner.disconnect();
                    if (stereoPanner) stereoPanner.disconnect();
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
        
        filter.connect(this.multibandSplitter); // 连接到多段压缩器输入
        
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
        
        // 播放静音音符预热音频系统（消除"咔"声）
        this.warmupAudio();
    }
    
    // 预热音频系统（消除第一次播放的"咔"声）
    warmupAudio() {
        try {
            const ctx = this.audioContext;
            const now = ctx.currentTime;
            
            // 创建一个极短的静音振荡器
            const oscillator = ctx.createOscillator();
            const gainNode = ctx.createGain();
            
            oscillator.frequency.value = 440; // A4
            gainNode.gain.setValueAtTime(0.001, now); // 极小音量
            gainNode.gain.exponentialRampToValueAtTime(0.0001, now + 0.01);
            
            oscillator.connect(gainNode);
            gainNode.connect(this.masterGain);
            
            oscillator.start(now);
            oscillator.stop(now + 0.01);
            
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
        
        // 使用原始音量值乘以基础增益
        const baseGain = 2.2; // 适度基础增益，避免破音
        this.masterGain.gain.value = clampedVolume * baseGain;
        
        console.log(`🔊 主音量设置为: ${Math.round(clampedVolume * 100)}%`);
    }
    
    // 播放UI点击音效（使用钢琴音色）
    playClickSound() {
        if (!this.isReady || this.samples.size === 0) {
            console.warn('钢琴采样尚未加载，无法播放点击音效');
            return;
        }
        
        try {
            // 随机选择一个高音区音符（C5-C6）
            const highNotes = [72, 74, 76, 77, 79, 81, 83, 84]; // C5, D5, E5, F5, G5, A5, B5, C6
            const randomNote = highNotes[Math.floor(Math.random() * highNotes.length)];
            
            // 播放短促的钢琴音
            this.playNote(randomNote, 0.3, 80, 2);
            
        } catch (error) {
            console.warn('播放点击音效失败:', error);
        }
    }
    
    // 播放开始游戏音效（使用钢琴音色的上升音阶）
    playStartSound() {
        if (!this.isReady || this.samples.size === 0) {
            console.warn('钢琴采样尚未加载，无法播放开始音效');
            return;
        }
        
        try {
            // 播放上升音阶（C5-E5-G5，大三和弦）
            const chordNotes = [72, 76, 79]; // C5, E5, G5
            
            chordNotes.forEach((note, index) => {
                setTimeout(() => {
                    this.playNote(note, 0.4, 90, 2);
                }, index * 80); // 每个音符间隔80ms
            });
            
        } catch (error) {
            console.warn('播放开始音效失败:', error);
        }
    }
}
