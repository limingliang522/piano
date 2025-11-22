// 音频引擎 - MP3播放 + MIDI同步
class AudioEngine {
    constructor() {
        this.audioContext = null;
        this.masterGain = null;
        this.isReady = false;
        
        // MP3音频播放
        this.audioElement = null; // HTML5 Audio元素
        this.audioSource = null; // AudioContext音频源
        this.currentMusicPath = null; // 当前音乐路径
        
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
    
    // 初始化音频处理链（简化版 - 只需要主音量控制）
    initAudioChain() {
        const ctx = this.audioContext;
        
        // 只创建主音量控制
        this.masterGain = ctx.createGain();
        this.masterGain.gain.value = 0.8;
        this.masterGain.connect(ctx.destination);
        
        console.log('✅ 音频处理链初始化完成（简化版）');
        return;
        
        // 以下是旧代码，暂时保留但不执行
        /*
        
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
            
            console.log('initAudioChain: 创建均衡器...');
            // 2. 三段均衡器（精细调音）
            // 优化 FluidR3 GM 音色的均衡器设置
            this.eqLow = ctx.createBiquadFilter();
            this.eqLow.type = 'lowshelf';
            this.eqLow.frequency.value = 250;
            this.eqLow.gain.value = 3.0; // 增强低频，增加温暖度和厚度
            
            this.eqMid = ctx.createBiquadFilter();
            this.eqMid.type = 'peaking';
            this.eqMid.frequency.value = 2000;
            this.eqMid.Q.value = 1.2;
            this.eqMid.gain.value = 2.0; // 提升中频，增加清晰度和存在感
            
            this.eqHigh = ctx.createBiquadFilter();
            this.eqHigh.type = 'highshelf';
            this.eqHigh.frequency.value = 6000;
            this.eqHigh.gain.value = 4.0; // 增强高频，增加明亮度和空气感
            
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
            // === 施坦威 D 型音色模拟 ===
            
            // 1. 低频增强（温暖厚实）
            this.steinwayLow = ctx.createBiquadFilter();
            this.steinwayLow.type = 'lowshelf';
            this.steinwayLow.frequency.value = 200;
            this.steinwayLow.gain.value = 4.0; // 温暖的低频
            
            // 2. 中低频共鸣（施坦威特色）
            this.steinwayBody = ctx.createBiquadFilter();
            this.steinwayBody.type = 'peaking';
            this.steinwayBody.frequency.value = 400;
            this.steinwayBody.Q.value = 1.5;
            this.steinwayBody.gain.value = 3.0; // 琴体共鸣
            
            // 3. 中频清晰度
            this.steinwayClarity = ctx.createBiquadFilter();
            this.steinwayClarity.type = 'peaking';
            this.steinwayClarity.frequency.value = 2500;
            this.steinwayClarity.Q.value = 1.0;
            this.steinwayClarity.gain.value = 2.5; // 清晰但不刺耳
            
            // 4. 高频明亮度（施坦威的"钻石般"高音）
            this.steinwayBrilliance = ctx.createBiquadFilter();
            this.steinwayBrilliance.type = 'highshelf';
            this.steinwayBrilliance.frequency.value = 5000;
            this.steinwayBrilliance.gain.value = 5.0; // 明亮但优雅
            
            // 5. 音乐厅混响（施坦威在卡内基音乐厅的感觉）
            this.steinwayReverbWet = ctx.createGain();
            this.steinwayReverbWet.gain.value = 0.35; // 35% 混响
            
            this.steinwayReverbDry = ctx.createGain();
            this.steinwayReverbDry.gain.value = 0.65; // 65% 干声
            
            // 6. 主音量
            this.masterGain = ctx.createGain();
            this.masterGain.gain.value = 12.0; // 适中音量
            
            console.log('initAudioChain: 连接音频节点（施坦威 D 型模拟）...');
            // 施坦威音色链路：
            // 音频源 → 低频增强 → 琴体共鸣 → 清晰度 → 明亮度 → 混响 → 主音量 → 输出
            
            // 连接 EQ 链
            this.steinwayLow.connect(this.steinwayBody);
            this.steinwayBody.connect(this.steinwayClarity);
            this.steinwayClarity.connect(this.steinwayBrilliance);
            
            // 干声路径
            this.steinwayBrilliance.connect(this.steinwayReverbDry);
            this.steinwayReverbDry.connect(this.masterGain);
            
            // 湿声路径（混响）
            this.steinwayBrilliance.connect(this.convolver);
            this.convolver.connect(this.steinwayReverbWet);
            this.steinwayReverbWet.connect(this.masterGain);
            
            // 输出
            this.masterGain.connect(ctx.destination);
            
            // 兼容性：compressor 指向 EQ 链起点
            this.compressor = this.steinwayLow;
            
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
            
            console.log('🎹 施坦威 D 型音色模拟系统已初始化');
            console.log('✨ 温暖低频 | 琴体共鸣 | 钻石般高音 | 卡内基音乐厅混响');
            console.log('🎵 4段专业 EQ | 35% 音乐厅混响 | 施坦威特色音色');
            console.log('🎚️ 功能: 音频分析器 | 提前释放 | 性能模式切换');
        } catch (error) {
            console.error('initAudioChain: 初始化失败:', error);
            throw error;
        }
        */
    }
    
    // 创建卡内基音乐厅混响（施坦威专属）
    createReverbImpulse() {
        const ctx = this.audioContext;
        const sampleRate = ctx.sampleRate;
        const length = sampleRate * 2.2; // 2.2秒混响（卡内基音乐厅）
        const impulse = ctx.createBuffer(2, length, sampleRate);
        const impulseL = impulse.getChannelData(0);
        const impulseR = impulse.getChannelData(1);
        
        // 模拟卡内基音乐厅的声学特性
        for (let i = 0; i < length; i++) {
            const t = i / sampleRate;
            
            // 优雅的指数衰减（施坦威的延音特性）
            const decay = Math.exp(-t / 0.7);
            
            // 早期反射（前 60ms）- 卡内基音乐厅的特征
            let earlyReflections = 0;
            if (t < 0.06) {
                // 第一次反射（15ms）
                if (t > 0.015 && t < 0.02) {
                    earlyReflections += (Math.random() * 2 - 1) * 0.4 * decay;
                }
                // 第二次反射（30ms）
                if (t > 0.03 && t < 0.035) {
                    earlyReflections += (Math.random() * 2 - 1) * 0.35 * decay;
                }
                // 第三次反射（45ms）
                if (t > 0.045 && t < 0.05) {
                    earlyReflections += (Math.random() * 2 - 1) * 0.3 * decay;
                }
            }
            
            // 后期混响（温暖、丰富、不过度）
            const lateReverb = (Math.random() * 2 - 1) * decay * 0.35;
            
            // 左右声道自然差异（施坦威的立体感）
            const stereoWidth = 0.25;
            impulseL[i] = earlyReflections + lateReverb + (Math.random() * 2 - 1) * stereoWidth * decay;
            impulseR[i] = earlyReflections * 0.93 + lateReverb * 0.88 + (Math.random() * 2 - 1) * stereoWidth * decay;
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
        const noteNames = ['C', 'Cs', 'D', 'Ds', 'E', 'F', 'Fs', 'G', 'Gs', 'A', 'As', 'B'];
        const octave = Math.floor(midiNote / 12) - 1;
        const noteName = noteNames[midiNote % 12];
        return noteName + octave;
    }

    // 初始化音频引擎（简化版，不需要加载钢琴音色）
    async init(progressCallback) {
        // 确保AudioContext已创建
        this.ensureAudioContext();
        
        console.log('🎵 音频引擎初始化完成');
        
        this.isReady = true;
        
        // 模拟进度回调
        if (progressCallback) {
            progressCallback(1, 1);
        }
        
        return true;
    }
    
    // 加载MP3音乐文件
    async loadMusic(musicPath) {
        try {
            console.log(`🎵 加载音乐: ${musicPath}`);
            
            // 停止当前播放的音乐
            this.stopMusic();
            
            // 断开旧的音频源
            if (this.audioSource) {
                this.audioSource.disconnect();
                this.audioSource = null;
            }
            
            // 创建新的Audio元素
            this.audioElement = new Audio(musicPath);
            this.audioElement.crossOrigin = 'anonymous';
            this.audioElement.preload = 'auto';
            
            // 等待音频加载完成
            await new Promise((resolve, reject) => {
                this.audioElement.addEventListener('canplaythrough', resolve, { once: true });
                this.audioElement.addEventListener('error', reject, { once: true });
                this.audioElement.load();
            });
            
            // 连接到AudioContext（每次都重新创建）
            this.audioSource = this.audioContext.createMediaElementSource(this.audioElement);
            this.audioSource.connect(this.masterGain);
            
            this.currentMusicPath = musicPath;
            console.log('✅ 音乐加载完成');
            
            return true;
        } catch (error) {
            console.error('加载音乐失败:', error);
            return false;
        }
    }
    
    // 播放音乐
    playMusic() {
        if (this.audioElement) {
            this.audioElement.currentTime = 0;
            this.audioElement.play().catch(error => {
                console.error('播放音乐失败:', error);
            });
            console.log('▶️ 音乐开始播放');
        }
    }
    
    // 停止音乐
    stopMusic() {
        if (this.audioElement) {
            this.audioElement.pause();
            this.audioElement.currentTime = 0;
        }
    }
    
    // 暂停音乐
    pauseMusic() {
        if (this.audioElement) {
            this.audioElement.pause();
        }
    }
    
    // 恢复音乐
    resumeMusic() {
        if (this.audioElement) {
            this.audioElement.play().catch(error => {
                console.error('恢复音乐失败:', error);
            });
        }
    }
    
    // 获取当前播放时间
    getCurrentTime() {
        return this.audioElement ? this.audioElement.currentTime : 0;
    }
    
    // 设置播放时间
    setCurrentTime(time) {
        if (this.audioElement) {
            this.audioElement.currentTime = time;
        }
    }
    
    // 获取音乐总时长
    getDuration() {
        return this.audioElement ? this.audioElement.duration : 0;
    }
    
    // 使用真实采样预热（轻量版 - 不阻塞）
    async warmupWithSample() {
        try {
            // 找到中音区的采样（C4）
            const warmupNote = this.samples.get('C4') || this.samples.values().next().value;
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

    // 播放音符（不再需要，因为使用MP3）
    playNote(midiNote, duration = 0.5, velocity = 100, lane = 2) {
        // 不再播放单独的音符，音乐由MP3提供
        return null;
    }
    
    // 停止所有音符（用于暂停/停止游戏）
    stopAllNotes(fadeOutTime = 0.1) {
        // 停止MP3音乐
        this.stopMusic();
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
        
        // 纯净原声模式：使用用户设置的音量 × 15 倍基础增益
        this.masterGain.gain.value = clampedVolume * 15.0;
        
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
    
    // 播放UI点击音效（简单音效）
    playClickSound() {
        try {
            const ctx = this.audioContext;
            const now = ctx.currentTime;
            
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            
            osc.frequency.value = 800;
            gain.gain.setValueAtTime(0.1, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
            
            osc.connect(gain);
            gain.connect(this.masterGain);
            
            osc.start(now);
            osc.stop(now + 0.1);
        } catch (error) {
            console.warn('播放点击音效失败:', error);
        }
    }
    
    // 播放开始游戏音效
    playStartSound() {
        try {
            const ctx = this.audioContext;
            const now = ctx.currentTime;
            
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            
            osc.frequency.value = 1000;
            gain.gain.setValueAtTime(0.2, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
            
            osc.connect(gain);
            gain.connect(this.masterGain);
            
            osc.start(now);
            osc.stop(now + 0.3);
        } catch (error) {
            console.warn('播放开始音效失败:', error);
        }
    }
}
