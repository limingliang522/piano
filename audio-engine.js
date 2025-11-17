// 简化的钢琴音频引擎 - 直接使用 Web Audio API
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
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            this.masterGain = this.audioContext.createGain();
            this.masterGain.gain.value = 0.9;
            this.masterGain.connect(this.audioContext.destination);
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
        const batchSize = 5; // 每次只加载5个，避免手机卡顿
        
        // 加载单个音色（带重试）
        const loadSample = async (noteName, maxRetries = 3) => {
            for (let attempt = 0; attempt < maxRetries; attempt++) {
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
                    if (attempt < maxRetries - 1) {
                        await new Promise(resolve => setTimeout(resolve, 300));
                    } else {
                        console.warn(`${noteName} 加载失败:`, error);
                        return false;
                    }
                }
            }
        };
        
        // 分批加载（每批5个）
        for (let i = 0; i < sampleNotes.length; i += batchSize) {
            const batch = sampleNotes.slice(i, i + batchSize);
            const batchPromises = batch.map(async (noteName) => {
                const success = await loadSample(noteName);
                loadedCount++;
                if (progressCallback) {
                    progressCallback(loadedCount, total);
                }
                return success;
            });
            await Promise.all(batchPromises);
        }
        
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

    // 播放钢琴音符
    playNote(midiNote, duration = 0.5, velocity = 100) {
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
            // 创建音频源
            const source = this.audioContext.createBufferSource();
            source.buffer = buffer;
            
            // 根据音高偏移调整播放速率
            const playbackRate = Math.pow(2, semitoneOffset / 12);
            source.playbackRate.value = playbackRate;
            
            // 创建增益节点控制音量（带淡入淡出消除咔哒声）
            const gainNode = this.audioContext.createGain();
            const volume = (velocity / 127) * 1.0;  // 增加音量
            const now = this.audioContext.currentTime;
            const noteDuration = Math.min(duration, 5);
            
            // 淡入（5ms）消除开始的咔哒声
            gainNode.gain.setValueAtTime(0, now);
            gainNode.gain.linearRampToValueAtTime(volume, now + 0.005);
            
            // 淡出（10ms）消除结束的咔哒声
            gainNode.gain.setValueAtTime(volume, now + noteDuration - 0.01);
            gainNode.gain.linearRampToValueAtTime(0, now + noteDuration);
            
            // 连接节点
            source.connect(gainNode);
            gainNode.connect(this.masterGain);
            
            // 播放
            source.start(now);
            source.stop(now + noteDuration);
            

        } catch (error) {
            console.error('播放音符失败:', error);
        }
    }

    // 播放碰撞音效
    playCollision() {
        const now = this.audioContext.currentTime;
        const oscillator = this.audioContext.createOscillator();
        oscillator.frequency.setValueAtTime(150, now);
        oscillator.frequency.exponentialRampToValueAtTime(50, now + 0.3);
        
        const gainNode = this.audioContext.createGain();
        gainNode.gain.setValueAtTime(0.3, now);
        gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
        
        oscillator.connect(gainNode);
        gainNode.connect(this.masterGain);
        
        oscillator.start(now);
        oscillator.stop(now + 0.3);
    }

    // 启动音频上下文
    async start() {
        this.ensureAudioContext();
        if (this.audioContext.state === 'suspended') {
            await this.audioContext.resume();
        }
        console.log('音频上下文已启动');
    }
}
