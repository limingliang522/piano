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
                // 使用交互模式（最低延迟，最佳游戏体验）
                this.audioContext = new (window.AudioContext || window.webkitAudioContext)({
                    latencyHint: 'interactive', // 交互模式，低延迟
                    sampleRate: 44100 // 标准采样率
                });
                
                // 初始化专业音频处理链
                this.initAudioChain();
            } catch (error) {
                console.error('ensureAudioContext: 创建失败:', error);
                throw error;
            }
        }
    }
    
    // 初始化专业音频处理链（顶级音质版本）
    initAudioChain() {
        const ctx = this.audioContext;
        
        try {
            console.log('🎛️ 初始化顶级音频处理链...');
            
            // === 1. 输入增益控制 ===
            this.inputGain = ctx.createGain();
            this.inputGain.gain.value = 1.2; // 轻微提升输入信号
            
            // === 2. 高精度均衡器（5段参数均衡）===
            console.log('🎚️ 创建5段参数均衡器...');
            
            // 超低频（Sub Bass）- 增强低音基础
            this.eqSubBass = ctx.createBiquadFilter();
            this.eqSubBass.type = 'lowshelf';
            this.eqSubBass.frequency.value = 80;
            this.eqSubBass.gain.value = 2.0; // 增强低音
            
            // 低频（Bass）- 温暖度
            this.eqLow = ctx.createBiquadFilter();
            this.eqLow.type = 'peaking';
            this.eqLow.frequency.value = 250;
            this.eqLow.Q.value = 1.0;
            this.eqLow.gain.value = 1.5; // 增加温暖度
            
            // 中频（Midrange）- 清晰度
            this.eqMid = ctx.createBiquadFilter();
            this.eqMid.type = 'peaking';
            this.eqMid.frequency.value = 1500;
            this.eqMid.Q.value = 0.7;
            this.eqMid.gain.value = 1.0; // 保持清晰
            
            // 高中频（Presence）- 存在感
            this.eqPresence = ctx.createBiquadFilter();
            this.eqPresence.type = 'peaking';
            this.eqPresence.frequency.value = 4000;
            this.eqPresence.Q.value = 1.2;
            this.eqPresence.gain.value = 2.0; // 增强存在感
            
            // 高频（Treble）- 明亮度和空气感
            this.eqHigh = ctx.createBiquadFilter();
            this.eqHigh.type = 'highshelf';
            this.eqHigh.frequency.value = 8000;
            this.eqHigh.gain.value = 3.0; // 显著增强明亮度
            
            // === 3. 立体声增强器 ===
            console.log('🎧 创建立体声增强器...');
            this.stereoWidener = ctx.createStereoPanner();
            this.stereoWidener.pan.value = 0; // 中心位置
            
            // === 4. 卷积混响（音乐厅效果）===
            console.log('🏛️ 创建卷积混响...');
            this.convolver = ctx.createConvolver();
            this.createReverbImpulse();
            
            // 混响干湿比控制
            this.reverbDry = ctx.createGain();
            this.reverbDry.gain.value = 0.75; // 75% 干声
            this.reverbWet = ctx.createGain();
            this.reverbWet.gain.value = 0.25; // 25% 湿声（增加空间感）
            
            // === 5. 多段动态压缩器（母带级）===
            console.log('🎛️ 创建多段动态压缩器...');
            
            // 分频器输入
            this.multibandSplitter = ctx.createGain();
            
            // 低频通道（20Hz - 250Hz）
            this.lowpassFilter = ctx.createBiquadFilter();
            this.lowpassFilter.type = 'lowpass';
            this.lowpassFilter.frequency.value = 250;
            this.lowpassFilter.Q.value = 0.707;
            
            this.compressorLow = ctx.createDynamicsCompressor();
            this.compressorLow.threshold.value = -24;
            this.compressorLow.knee.value = 30;
            this.compressorLow.ratio.value = 4;
            this.compressorLow.attack.value = 0.003;
            this.compressorLow.release.value = 0.25;
            
            // 中频通道（250Hz - 5kHz）
            this.bandpassFilterLow = ctx.createBiquadFilter();
            this.bandpassFilterLow.type = 'highpass';
            this.bandpassFilterLow.frequency.value = 250;
            this.bandpassFilterLow.Q.value = 0.707;
            
            this.bandpassFilterHigh = ctx.createBiquadFilter();
            this.bandpassFilterHigh.type = 'lowpass';
            this.bandpassFilterHigh.frequency.value = 5000;
            this.bandpassFilterHigh.Q.value = 0.707;
            
            this.compressorMid = ctx.createDynamicsCompressor();
            this.compressorMid.threshold.value = -20;
            this.compressorMid.knee.value = 30;
            this.compressorMid.ratio.value = 3;
            this.compressorMid.attack.value = 0.005;
            this.compressorMid.release.value = 0.2;
            
            // 高频通道（5kHz - 20kHz）
            this.highpassFilter = ctx.createBiquadFilter();
            this.highpassFilter.type = 'highpass';
            this.highpassFilter.frequency.value = 5000;
            this.highpassFilter.Q.value = 0.707;
            
            this.compressorHigh = ctx.createDynamicsCompressor();
            this.compressorHigh.threshold.value = -18;
            this.compressorHigh.knee.value = 20;
            this.compressorHigh.ratio.value = 2.5;
            this.compressorHigh.attack.value = 0.001;
            this.compressorHigh.release.value = 0.1;
            
            // Makeup Gain（补偿压缩损失）
            this.makeupGainLow = ctx.createGain();
            this.makeupGainLow.gain.value = 1.3;
            
            this.makeupGainMid = ctx.createGain();
            this.makeupGainMid.gain.value = 1.2;
            
            this.makeupGainHigh = ctx.createGain();
            this.makeupGainHigh.gain.value = 1.4;
            
            // 合并器
            this.multibandMerger = ctx.createGain();
            
            // === 6. 激励器（谐波增强）===
            console.log('✨ 创建谐波激励器...');
            this.exciter = ctx.createWaveShaper();
            this.exciter.curve = this.makeExciterCurve();
            this.exciter.oversample = '4x';
            
            this.exciterMix = ctx.createGain();
            this.exciterMix.gain.value = 0.15; // 15% 激励效果
            
            // === 7. 砖墙限制器（最终保护）===
            console.log('🧱 创建砖墙限制器...');
            this.limiter = ctx.createDynamicsCompressor();
            this.limiter.threshold.value = -1.0;
            this.limiter.knee.value = 0;
            this.limiter.ratio.value = 20;
            this.limiter.attack.value = 0.001;
            this.limiter.release.value = 0.1;
            
            // === 8. 主音量控制 ===
            console.log('🔊 创建主音量控制...');
            this.masterGain = ctx.createGain();
            this.masterGain.gain.value = 2.5; // 适中音量，避免削波
            
            // === 连接音频处理链 ===
            console.log('🔗 连接音频处理链...');
            
            // 输入 → 均衡器链
            this.inputGain.connect(this.eqSubBass);
            this.eqSubBass.connect(this.eqLow);
            this.eqLow.connect(this.eqMid);
            this.eqMid.connect(this.eqPresence);
            this.eqPresence.connect(this.eqHigh);
            
            // 均衡器 → 混响（并行处理）
            this.eqHigh.connect(this.reverbDry);
            this.eqHigh.connect(this.convolver);
            this.convolver.connect(this.reverbWet);
            
            // 混响合并 → 多段压缩器
            const reverbMerger = ctx.createGain();
            this.reverbDry.connect(reverbMerger);
            this.reverbWet.connect(reverbMerger);
            reverbMerger.connect(this.multibandSplitter);
            
            // 多段压缩器（三个并行通道）
            // 低频通道
            this.multibandSplitter.connect(this.lowpassFilter);
            this.lowpassFilter.connect(this.compressorLow);
            this.compressorLow.connect(this.makeupGainLow);
            this.makeupGainLow.connect(this.multibandMerger);
            
            // 中频通道
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
            
            // 多段压缩器 → 激励器（并行）
            const exciterSplitter = ctx.createGain();
            this.multibandMerger.connect(exciterSplitter);
            
            exciterSplitter.connect(this.exciter);
            this.exciter.connect(this.exciterMix);
            
            const exciterMerger = ctx.createGain();
            exciterSplitter.connect(exciterMerger);
            this.exciterMix.connect(exciterMerger);
            
            // 激励器 → 限制器 → 主音量 → 输出
            exciterMerger.connect(this.limiter);
            this.limiter.connect(this.masterGain);
            this.masterGain.connect(ctx.destination);
            
            // 兼容性引用
            this.compressor = this.inputGain;
            
            // === 设置 3D 音频监听器 ===
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
            
            console.log('✅ 顶级音频处理链初始化完成！');
            console.log('📊 处理链: 输入增益 → 5段EQ → 混响 → 多段压缩 → 激励器 → 限制器 → 输出');
            console.log('🎚️ 特性: 母带级压缩 | 谐波激励 | 空间混响 | 砖墙限制');
        } catch (error) {
            console.error('❌ 音频链初始化失败:', error);
            throw error;
        }
    }
    
    // 创建激励器曲线（谐波增强）
    makeExciterCurve() {
        const samples = 2048;
        const curve = new Float32Array(samples);
        
        for (let i = 0; i < samples; i++) {
            const x = (i / samples) * 2 - 1;
            // 使用双曲正切函数添加谐波
            curve[i] = Math.tanh(x * 1.5);
        }
        
        return curve;
    }
    
    // 创建音乐厅级混响脉冲响应
    createReverbImpulse() {
        const ctx = this.audioContext;
        const sampleRate = ctx.sampleRate;
        const length = sampleRate * 2.5; // 2.5秒混响（音乐厅效果）
        const impulse = ctx.createBuffer(2, length, sampleRate);
        const impulseL = impulse.getChannelData(0);
        const impulseR = impulse.getChannelData(1);
        
        // 生成高质量音乐厅混响
        for (let i = 0; i < length; i++) {
            const t = i / sampleRate;
            
            // 指数衰减（模拟音乐厅）
            const decay = Math.exp(-t / 0.8);
            
            // 早期反射（前 80ms）- 模拟墙壁反射
            let earlyReflections = 0;
            if (t < 0.08) {
                // 多个离散反射
                const reflections = [
                    { time: 0.012, gain: 0.6 },
                    { time: 0.025, gain: 0.4 },
                    { time: 0.038, gain: 0.3 },
                    { time: 0.051, gain: 0.25 },
                    { time: 0.067, gain: 0.2 }
                ];
                
                for (const ref of reflections) {
                    if (Math.abs(t - ref.time) < 0.001) {
                        earlyReflections += (Math.random() * 2 - 1) * ref.gain * decay;
                    }
                }
            }
            
            // 后期混响（扩散混响）
            const lateReverb = (Math.random() * 2 - 1) * decay * 0.3;
            
            // 调制效果（模拟空气流动）
            const modulation = Math.sin(t * 2 * Math.PI * 0.5) * 0.1;
            
            // 左右声道差异（增强立体感）
            const stereoWidth = 0.3;
            impulseL[i] = (earlyReflections + lateReverb) * (1 + modulation);
            impulseR[i] = (earlyReflections + lateReverb) * (1 - modulation) * (1 - stereoWidth);
        }
        
        this.convolver.buffer = impulse;
        console.log('🏛️ 音乐厅级混响已创建（2.5秒衰减）');
    }
    
    // 创建极温和的限幅曲线（几乎透明的保护）
    makeHardClipCurve() {
        const samples = 2048;
        const curve = new Float32Array(samples);
        
        for (let i = 0; i < samples; i++) {
            const x = (i / samples) * 2 - 1; // -1 到 1
            
            // 使用 tanh 实现极温和的限幅
            // 系数 1.2 让它在正常范围内几乎是线性的
            curve[i] = Math.tanh(x * 1.2) / Math.tanh(1.2);
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
    
    // 使用真实采样预热（完整版 - 确保完全加载）
    async warmupWithSample() {
        try {
            // 找到中音区的采样（C4）
            const warmupNote = this.samples.get('C4') || this.samples.values().next().value;
            if (!warmupNote) return;
            
            const ctx = this.audioContext;
            const now = ctx.currentTime;
            
            // 创建一个极短、极小音量的音符，并等待完成
            const source = ctx.createBufferSource();
            source.buffer = warmupNote;
            
            const gainNode = ctx.createGain();
            gainNode.gain.value = 0.0001; // 几乎听不见
            
            source.connect(gainNode);
            gainNode.connect(this.multibandSplitter);
            
            // 等待预热完成
            await new Promise((resolve) => {
                source.onended = resolve;
                source.start(now);
                source.stop(now + 0.01); // 10ms极短音
            });
            
            console.log('✅ 音频管道预热完成（完整加载）');
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
                panner.panningModel = performanceMode === 'high' ? 'HRTF' : 'equalpower';
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
            const velocityFactor = Math.pow(velocity / 127, 1.0); // 线性映射
            const baseVolume = velocityFactor * 1.0; // 不增益，保持原音
            
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

    // 启动音频上下文（完整版 - 确保完全加载）
    async start() {
        this.ensureAudioContext();
        
        if (this.audioContext.state === 'suspended') {
            console.log('音频上下文被挂起，尝试恢复...');
            
            // 等待音频上下文恢复完成
            await this.audioContext.resume();
            console.log('✅ 音频上下文恢复成功');
        }
        
        console.log('音频上下文状态:', this.audioContext.state);
        
        // 完整预热音频系统，等待完成
        await this.warmupAudio();
        
        // 使用真实采样预热，等待完成
        await this.warmupWithSample();
    }
    
    // 预热音频系统（完整版 - 等待完成）
    async warmupAudio() {
        try {
            const ctx = this.audioContext;
            const now = ctx.currentTime;
            
            // 创建一个极短的静音振荡器，并等待完成
            const oscillator = ctx.createOscillator();
            const gainNode = ctx.createGain();
            
            oscillator.frequency.value = 440;
            gainNode.gain.value = 0.0001; // 几乎听不见
            
            oscillator.connect(gainNode);
            gainNode.connect(this.masterGain);
            
            // 等待预热完成
            await new Promise((resolve) => {
                oscillator.onended = resolve;
                oscillator.start(now);
                oscillator.stop(now + 0.005); // 5ms极短音
            });
            
            console.log('✅ 音频系统预热完成（完整加载）');
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
        
        // 使用平滑的音量曲线（对数缩放，更符合人耳感知）
        const baseGain = 2.5; // 适中基础音量
        const volumeCurve = Math.pow(clampedVolume, 0.5); // 平方根曲线
        this.masterGain.gain.setValueAtTime(volumeCurve * baseGain, this.audioContext.currentTime);
        
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
    
    // 播放开始游戏音效（单个音符）
    playStartSound() {
        if (!this.isReady || this.samples.size === 0) {
            console.warn('钢琴采样尚未加载，无法播放开始音效');
            return;
        }
        
        try {
            // 播放单个清脆的高音（C6）
            this.playNote(72, 0.5, 100, 2); // C5，中等时长，最大力度
            
        } catch (error) {
            console.warn('播放开始音效失败:', error);
        }
    }
}
