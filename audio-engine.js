// 完美还原钢琴MIDI - 零后处理音频引擎
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
                // 使用最低延迟模式，确保精确触发
                this.audioContext = new (window.AudioContext || window.webkitAudioContext)({
                    latencyHint: 'interactive', // 最低延迟
                    sampleRate: 48000 // 高品质采样率
                });
                
                // 初始化简化音频链（仅主音量控制）
                this.initAudioChain();
            } catch (error) {
                console.error('ensureAudioContext: 创建失败:', error);
                throw error;
            }
        }
    }
    
    // 初始化零后处理音频链（完美还原）
    initAudioChain() {
        const ctx = this.audioContext;
        
        try {
            // 创建压缩器（防止失真）
            this.compressor = ctx.createDynamicsCompressor();
            this.compressor.threshold.value = -12; // 温和阈值
            this.compressor.knee.value = 30; // 平滑过渡
            this.compressor.ratio.value = 4; // 温和压缩比，保持音质
            this.compressor.attack.value = 0.003; // 自然响应
            this.compressor.release.value = 0.25; // 自然释放
            
            // 创建主音量控制节点
            this.masterGain = ctx.createGain();
            this.masterGain.gain.value = 4.2; // 增大音量但保持清晰
            
            // 音频链：主音量 → 压缩器 → 输出
            this.masterGain.connect(this.compressor);
            this.compressor.connect(ctx.destination);
            
            console.log('🎵 零后处理音频链已初始化 - 完美还原MIDI + 动态压缩');
        } catch (error) {
            console.error('initAudioChain: 初始化失败:', error);
            throw error;
        }
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

    // 播放钢琴音符（零后处理版 - 完美还原MIDI）
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
            
            // 根据音高偏移调整播放速率（精确还原MIDI音高）
            const playbackRate = Math.pow(2, semitoneOffset / 12);
            source.playbackRate.value = playbackRate;
            
            // 音量控制（基于力度）
            const gainNode = ctx.createGain();
            const volume = (velocity / 127) * 0.7; // 平衡音量，保持清晰度
            
            // 简单的淡入淡出（消除咔嚓声）
            gainNode.gain.setValueAtTime(0, now);
            gainNode.gain.linearRampToValueAtTime(volume, now + 0.005); // 5ms淡入
            gainNode.gain.setValueAtTime(volume, now + noteDuration - 0.05);
            gainNode.gain.linearRampToValueAtTime(0, now + noteDuration); // 50ms淡出
            
            // 连接音频链：音源 → 音量 → 主输出
            source.connect(gainNode);
            gainNode.connect(this.masterGain);
            
            // 播放
            source.start(now);
            source.stop(now + noteDuration);
            
            // 清理（防止内存泄漏）
            source.onended = () => {
                try {
                    source.disconnect();
                    gainNode.disconnect();
                } catch (e) {
                    // 已经断开连接
                }
            };

        } catch (error) {
            console.error('播放音符失败:', error);
        }
    }

    // 播放碰撞音效（简化版）
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
        
        // 连接到主输出
        bass.connect(bassGain);
        bassGain.connect(this.masterGain);
        
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
