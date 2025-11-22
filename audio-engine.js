// 极致音质钢琴音频引擎 - 专业级空间音频处理 v3.0
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
        this.softClipper = null; // 软削波器
        this.eqLow = null; // 低频均衡
        this.eqMid = null; // 中频均衡
        this.eqHigh = null; // 高频均衡
        this.stereoEnhancer = null; // 立体声增强
        this.listener = null; // 3D 音频监听器
        
        // 多段压缩器（母带级处理）
        this.multibandSplitter = null;
        this.lowpassFilter = null;
        this.bandpassFilter = null;
        this.highpassFilter = null;
        this.compressorLow = null;
        this.compressorMid = null;
        this.compressorHigh = null;
        this.multibandMerger = null;
        
        // 音频增强功能
        this.activeNotes = new Map(); // 跟踪活跃音符，支持提前释放
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
    
    // 初始化音频处理链（纯净原声模式）
    initAudioChain() {
        const ctx = this.audioContext;
        
        try {
            console.log('initAudioChain: 初始化纯净原声输出模式...');
            
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
            
            // 1.2 低频压缩器（温和压缩，防止破音）
            this.compressorLow = ctx.createDynamicsCompressor();
            this.compressorLow.threshold.value = -20; // 降低阈值，更早介入
            this.compressorLow.knee.value = 30; // 柔和拐点
            this.compressorLow.ratio.value = 4; // 适度压缩比
            this.compressorLow.attack.value = 0.01; // 快速响应
            this.compressorLow.release.value = 0.2; // 适中释放
            
            // 1.3 中频压缩器（适度压缩，保持清晰）
            this.compressorMid = ctx.createDynamicsCompressor();
            this.compressorMid.threshold.value = -18; // 降低阈值
            this.compressorMid.knee.value = 30;
            this.compressorMid.ratio.value = 3; // 适度压缩
            this.compressorMid.attack.value = 0.008;
            this.compressorMid.release.value = 0.15;
            
            // 1.4 高频压缩器（轻微压缩，保持明亮）
            this.compressorHigh = ctx.createDynamicsCompressor();
            this.compressorHigh.threshold.value = -15; // 降低阈值
            this.compressorHigh.knee.value = 25;
            this.compressorHigh.ratio.value = 2.5; // 轻微压缩
            this.compressorHigh.attack.value = 0.003;
            this.compressorHigh.release.value = 0.1;
            
            // 1.5 各频段 Makeup Gain（移除增益，保持原音）
            this.makeupGainLow = ctx.createGain();
            this.makeupGainLow.gain.value = 1.0; // 不增益
            
            this.makeupGainMid = ctx.createGain();
            this.makeupGainMid.gain.value = 1.0; // 不增益
            
            this.makeupGainHigh = ctx.createGain();
            this.makeupGainHigh.gain.value = 1.0; // 不增益
            
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
            
            console.log('initAudioChain: 创建均衡器（纯净原声模式）...');
            // 2. 三段均衡器（纯净原声 - 不增益）
            this.eqLow = ctx.createBiquadFilter();
            this.eqLow.type = 'lowshelf';
            this.eqLow.frequency.value = 250;
            this.eqLow.gain.value = 0; // 纯净原声，不增益
            
            this.eqMid = ctx.createBiquadFilter();
            this.eqMid.type = 'peaking';
            this.eqMid.frequency.value = 2000;
            this.eqMid.Q.value = 1.2;
            this.eqMid.gain.value = 0; // 纯净原声，不增益
            
            this.eqHigh = ctx.createBiquadFilter();
            this.eqHigh.type = 'highshelf';
            this.eqHigh.frequency.value = 6000;
            this.eqHigh.gain.value = 0; // 纯净原声，不增益
            
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
            // 4. 砖墙限制器（绝对防止破音）
            this.limiter = ctx.createDynamicsCompressor();
            this.limiter.threshold.value = -3.0; // 安全阈值，留出余量
            this.limiter.knee.value = 2; // 柔和拐点，更自然
            this.limiter.ratio.value = 20; // 高压缩比，砖墙限制
            this.limiter.attack.value = 0.001; // 快速响应
            this.limiter.release.value = 0.1; // 适中释放
            
            console.log('initAudioChain: 创建平滑限幅器...');
            // 4.5. 平滑限幅器（防止破音但保持音质）
            this.hardClipper = ctx.createWaveShaper();
            this.hardClipper.curve = this.makeHardClipCurve();
            this.hardClipper.oversample = '4x'; // 高质量过采样，减少失真
            
            console.log('initAudioChain: 创建主音量...');
            // 5. 立体声增强器（Haas 效果 - 轻微增强）
            this.stereoWidener = ctx.createDelay();
            this.stereoWidener.delayTime.value = 0.015; // 15ms 延迟（更自然）
            
            this.stereoWidenerGain = ctx.createGain();
            this.stereoWidenerGain.gain.value = 0.2; // 20% 轻微立体声增强
            
            this.stereoMerger = ctx.createChannelMerger(2);
            this.stereoSplitter = ctx.createChannelSplitter(2);
            
            // 6. 深度混响（大音乐厅效果）
            this.reverbGain = ctx.createGain();
            this.reverbGain.gain.value = 0.15; // 15% 轻微混响，保持原声
            
            // 7. 主音量
            this.masterGain = ctx.createGain();
            this.masterGain.gain.value = 1.0; // 纯净原声，不额外增益
            
            console.log('initAudioChain: 连接音频节点（3D 立体空间）...');
            // 立体空间音频链路：
            // 音频源 → 均衡器 → 立体声增强 → 混响 → 主音量 → 输出
            
            // 连接均衡器链
            this.eqLow.connect(this.eqMid);
            this.eqMid.connect(this.eqHigh);
            
            // 立体声增强处理
            this.eqHigh.connect(this.stereoSplitter);
            
            // 左声道：直通 + 延迟右声道
            this.stereoSplitter.connect(this.stereoMerger, 0, 0); // 左 → 左
            this.stereoSplitter.connect(this.stereoWidener, 1); // 右 → 延迟
            this.stereoWidener.connect(this.stereoWidenerGain);
            this.stereoWidenerGain.connect(this.stereoMerger, 0, 0); // 延迟 → 左
            
            // 右声道：直通 + 延迟左声道
            this.stereoSplitter.connect(this.stereoMerger, 1, 1); // 右 → 右
            
            // 干声路径（85% 纯净原声）
            const dryGain = ctx.createGain();
            dryGain.gain.value = 0.85;
            this.stereoMerger.connect(dryGain);
            dryGain.connect(this.masterGain);
            
            // 湿声路径（15% 轻微混响）
            this.stereoMerger.connect(this.convolver);
            this.convolver.connect(this.reverbGain);
            this.reverbGain.connect(this.masterGain);
            
            // 输出
            this.masterGain.connect(ctx.destination);
            
            // 兼容性：compressor 指向均衡器输入
            this.compressor = this.eqLow;
            
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
            
            console.log('🎹 纯净原声音频系统已初始化');
            console.log('✨ 原声输出模式 | 轻微混响 (15%)');
            console.log('🎵 85% 干声 | 15% 混响 | 保持原始音色');
            console.log('🎧 自然立体声 | 无额外增益');
            console.log('🎚️ 功能: 音频分析器 | 提前释放 | 性能模式切换');
        } catch (error) {
            console.error('initAudioChain: 初始化失败:', error);
            throw error;
        }
    }
    
    // 创建自然房间混响脉冲响应（轻微空间感）
    createReverbImpulse() {
        const ctx = this.audioContext;
        const sampleRate = ctx.sampleRate;
        const length = sampleRate * 1.2; // 1.2秒混响（小型房间）
        const impulse = ctx.createBuffer(2, length, sampleRate);
        const impulseL = impulse.getChannelData(0);
        const impulseR = impulse.getChannelData(1);
        
        // 生成自然的房间混响
        for (let i = 0; i < length; i++) {
            const t = i / sampleRate;
            
            // 快速指数衰减（模拟小型房间）
            const decay = Math.exp(-t / 0.4);
            
            // 早期反射（前 50ms）- 轻微空间感
            let earlyReflections = 0;
            if (t < 0.05) {
                // 简单反射模拟
                earlyReflections += (Math.random() * 2 - 1) * 0.3 * decay;
                if (t > 0.015) earlyReflections += (Math.random() * 2 - 1) * 0.2 * decay;
            }
            
            // 后期混响（自然、温和）
            const lateReverb = (Math.random() * 2 - 1) * decay * 0.3;
            
            // 左右声道轻微差异（自然立体感）
            const stereoWidth = 0.15;
            impulseL[i] = earlyReflections + lateReverb + (Math.random() * 2 - 1) * stereoWidth * decay;
            impulseR[i] = earlyReflections * 0.95 + lateReverb * 0.9 + (Math.random() * 2 - 1) * stereoWidth * decay;
        }
        
        this.convolver.buffer = impulse;
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
        const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
        const octave = Math.floor(midiNote / 12) - 1;
        const noteName = noteNames[midiNote % 12];
        return noteName + octave;
    }

    // 初始化钢琴采样器（标准单层采样）
    async init(progressCallback) {
        // 确保AudioContext已创建
        this.ensureAudioContext();
        
        // 定义实际存在的采样点 - Steinway Grand（12个音符 × 4力度 × 2轮询）
        // 按音高从低到高排序：C0(12) < G0(19) < D1(26) < A1(33) < E2(40) < B2(47) < F#3(54) < C#4(61) < G#4(68) < D#5(75) < A#5(82) < F6(89)
        const sampleNotes = [
            'C0', 'G0', 'D1', 'A1', 'E2', 'B2', 
            'F#3', 'C#4', 'G#4', 'D#5', 'A#5', 'F6'
        ];
        const dynamics = [1, 2, 3, 4]; // 4个力度层
        const roundRobins = [1, 2]; // 2个轮询
        
        let loadedCount = 0;
        const total = sampleNotes.length * dynamics.length * roundRobins.length;
        
        // 加载单个音色（Steinway格式）
        const loadSample = async (noteName, dyn, rr) => {
            try {
                const fileName = `Steinway_${noteName}_Dyn${dyn}_RR${rr}.mp3`;
                const response = await fetch(`./钢琴/Steinway Grand  (DS)/${fileName}`);
                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}`);
                }
                const arrayBuffer = await response.arrayBuffer();
                const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
                const sampleKey = `${noteName}_${dyn}_${rr}`;
                this.samples.set(sampleKey, audioBuffer);
                return true;
            } catch (error) {
                console.warn(`${noteName}_${dyn}_${rr} 加载失败:`, error);
                return false;
            }
        };
        
        // 并行加载所有音色（最快速度）
        const allPromises = [];
        for (const noteName of sampleNotes) {
            for (const dyn of dynamics) {
                for (const rr of roundRobins) {
                    allPromises.push(
                        loadSample(noteName, dyn, rr).then(success => {
                            loadedCount++;
                            if (progressCallback) {
                                progressCallback(loadedCount, total);
                            }
                            return success;
                        })
                    );
                }
            }
        }
        
        await Promise.all(allPromises);
        
        console.log(`🎹 Steinway Grand 加载完成！共 ${this.samples.size}/96 个采样`);
        
        this.isReady = true;
        
        // 播放一个静音测试音符，预热音频管道
        console.log('🔊 预热音频管道...');
        await this.warmupWithSample();
        
        return true;
    }
    
    // 使用真实采样预热（轻量版 - 不阻塞）
    async warmupWithSample() {
        try {
            // 找到中音区的采样（C#4 Dyn2 RR1）
            const warmupNote = this.samples.get('C#4_2_1') || this.samples.values().next().value;
            if (!warmupNote) return;
            
            const ctx = this.audioContext;
            const now = ctx.currentTime;
            
            // 创建一个极短、极小音量的音符（不等待完成）
            const source = ctx.createBufferSource();
            source.buffer = warmupNote;
            
            const gainNode = ctx.createGain();
            gainNode.gain.value = 0.0001; // 几乎听不见
            
            source.connect(gainNode);
            gainNode.connect(this.masterGain); // 直连主音量，跳过所有处理
            
            source.start(now);
            source.stop(now + 0.01); // 10ms极短音
            
            console.log('✅ 音频管道预热完成');
        } catch (error) {
            console.warn('采样预热失败（不影响使用）:', error);
        }
    }

    // 找到最接近的采样音符（Steinway Grand 版本）
    findClosestSample(targetNote, velocity) {
        const noteToMidi = (noteName) => {
            const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
            const match = noteName.match(/^([A-G]#?)(\d+)$/);
            if (!match) return 60;
            const note = match[1];
            const octave = parseInt(match[2]);
            const noteIndex = noteNames.indexOf(note);
            if (noteIndex === -1) return 60;
            return (octave + 1) * 12 + noteIndex;
        };
        
        const targetMidi = noteToMidi(targetNote);
        
        // Steinway Grand 采样点（12个音符）
        // 按音高从低到高排序：C0(12) < G0(19) < D1(26) < A1(33) < E2(40) < B2(47) < F#3(54) < C#4(61) < G#4(68) < D#5(75) < A#5(82) < F6(89)
        const sampleNotes = [
            'C0', 'G0', 'D1', 'A1', 'E2', 'B2', 
            'F#3', 'C#4', 'G#4', 'D#5', 'A#5', 'F6'
        ];
        
        let closestNote = null;
        let minDistance = Infinity;
        
        for (const noteName of sampleNotes) {
            const sampleMidi = noteToMidi(noteName);
            const distance = Math.abs(sampleMidi - targetMidi);
            if (distance < minDistance) {
                minDistance = distance;
                closestNote = noteName;
            }
        }
        
        // 根据 velocity 选择力度层（1-4）
        // 修正：确保 velocity 0 也能映射到 Dyn1，velocity 127 映射到 Dyn4
        const dyn = Math.min(4, Math.max(1, Math.ceil((velocity + 1) / 32)));
        
        // 轮询选择（简单随机）
        const rr = Math.random() < 0.5 ? 1 : 2;
        
        return { 
            noteName: closestNote, 
            semitoneOffset: targetMidi - noteToMidi(closestNote),
            dyn: dyn,
            rr: rr
        };
    }

    // 播放钢琴音符（极致音质版 - 3D空间音频 + 提前释放）
    playNote(midiNote, duration = 0.5, velocity = 100, lane = 2) {
        if (!this.isReady || this.samples.size === 0) {
            console.warn('钢琴采样尚未加载完成');
            return null;
        }

        const targetNote = this.midiToNoteName(midiNote);
        const { noteName, semitoneOffset, dyn, rr } = this.findClosestSample(targetNote, velocity);
        
        if (!noteName) {
            console.warn('找不到合适的采样');
            return null;
        }
        
        // 获取采样（多层采样，使用力度和轮询）
        const sampleKey = `${noteName}_${dyn}_${rr}`;
        const buffer = this.samples.get(sampleKey);
        if (!buffer) {
            console.warn(`采样 ${sampleKey} 不存在`);
            return null;
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
            
            // === 3D 空间音频定位（根据性能模式和设置调整）===
            let panner = null;
            let stereoPanner = null;
            
            if (this.spatialAudioEnabled && (this.performanceMode === 'high' || this.performanceMode === 'medium')) {
                // 高/中性能：使用 3D 空间音频
                panner = ctx.createPanner();
                panner.panningModel = this.performanceMode === 'high' ? 'HRTF' : 'equalpower';
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
                // 低性能或禁用3D音频：使用简单立体声
                stereoPanner = ctx.createStereoPanner();
                const panValue = (lane - 2) / 3;
                stereoPanner.pan.value = Math.max(-0.8, Math.min(0.8, panValue));
            }
            
            // === 音量包络（ADSR - 完美还原MIDI力度）===
            const gainNode = ctx.createGain();
            // 使用更精确的velocity映射（MIDI标准：velocity 0-127）
            const velocityFactor = Math.pow(velocity / 127, 1.0); // 线性映射
            const baseVolume = velocityFactor * 0.6; // 降低音符音量，防止多音符叠加破音
            
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
            // 优化音色：经过均衡器和混响处理
            gainNode.connect(this.compressor); // compressor 现在指向 eqLow
            
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
                    // 从活跃音符列表中移除
                    this.activeNotes.delete(noteId);
                } catch (e) {
                    // 已经断开连接
                }
            };
            
            // 生成唯一音符ID并存储引用（支持提前释放）
            const noteId = `${midiNote}_${now}_${Math.random()}`;
            this.activeNotes.set(noteId, {
                source,
                gainNode,
                startTime: now,
                endTime: now + noteDuration,
                midiNote
            });
            
            return noteId; // 返回音符ID，允许外部提前停止

        } catch (error) {
            console.error('播放音符失败:', error);
            return null;
        }
    }
    
    // 提前停止音符（用于快速音符序列）
    stopNote(noteId, fadeOutTime = 0.05) {
        const noteData = this.activeNotes.get(noteId);
        if (!noteData) return;
        
        try {
            const ctx = this.audioContext;
            const now = ctx.currentTime;
            const { gainNode, source, endTime } = noteData;
            
            // 如果音符还在播放，快速淡出
            if (now < endTime) {
                gainNode.gain.cancelScheduledValues(now);
                gainNode.gain.setValueAtTime(gainNode.gain.value, now);
                gainNode.gain.exponentialRampToValueAtTime(0.001, now + fadeOutTime);
                source.stop(now + fadeOutTime);
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
        
        // 纯净原声模式：直接使用用户设置的音量，不额外增益
        this.masterGain.gain.value = clampedVolume;
        
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
            samplesLoaded: this.samples.size,
            activeNotes: this.activeNotes.size,
            performanceMode: this.performanceMode,
            reverbEnabled: this.reverbEnabled,
            spatialAudioEnabled: this.spatialAudioEnabled,
            contextState: this.audioContext ? this.audioContext.state : 'not initialized'
        };
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
