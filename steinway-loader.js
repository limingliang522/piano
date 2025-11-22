// Steinway 音色加载器
// 支持多力度层 + Round Robin + Release 样本

class SteinwayLoader {
    constructor() {
        this.samples = new Map(); // 存储所有采样
        this.sampleDir = './piano-samples-steinway-optimized/';
        
        // 采样点定义（音符 -> MIDI 号）
        this.samplePoints = {
            'C0': 24, 'D1': 38, 'E2': 52, 'F#3': 66,
            'G#4': 80, 'A#5': 94, 'F6': 101,
            'G0': 31, 'A1': 45, 'B2': 59, 'C#4': 73, 'D#5': 87
        };
        
        // 力度层映射（MIDI velocity 0-127 -> Dyn1-4）
        this.velocityLayers = [
            { max: 60, name: 'Dyn1' },   // 0-60: 轻
            { max: 98, name: 'Dyn2' },   // 61-98: 中
            { max: 117, name: 'Dyn3' },  // 99-117: 重
            { max: 127, name: 'Dyn4' }   // 118-127: 最重
        ];
        
        this.roundRobinIndex = 0; // Round Robin 索引
    }
    
    // 根据 velocity 选择力度层
    getVelocityLayer(velocity) {
        for (const layer of this.velocityLayers) {
            if (velocity <= layer.max) {
                return layer.name;
            }
        }
        return 'Dyn4';
    }
    
    // 获取 Round Robin 编号
    getRoundRobin() {
        this.roundRobinIndex = (this.roundRobinIndex % 2) + 1;
        return `RR${this.roundRobinIndex}`;
    }
    
    // 找到最接近的采样点
    findClosestSample(midiNote) {
        let closestNote = null;
        let minDistance = Infinity;
        
        for (const [noteName, sampleMidi] of Object.entries(this.samplePoints)) {
            const distance = Math.abs(midiNote - sampleMidi);
            if (distance < minDistance) {
                minDistance = distance;
                closestNote = noteName;
            }
        }
        
        const semitoneOffset = midiNote - this.samplePoints[closestNote];
        return { noteName: closestNote, semitoneOffset };
    }
    
    // 加载所有采样
    async loadAll(audioContext, progressCallback) {
        const files = [];
        
        // 生成所有文件名
        for (const noteName of Object.keys(this.samplePoints)) {
            for (const layer of this.velocityLayers) {
                for (let rr = 1; rr <= 2; rr++) {
                    files.push(`Steinway_${noteName}_${layer.name}_RR${rr}.ogg`);
                }
            }
            // Release 样本
            files.push(`Steinway_Release_${noteName}.ogg`);
        }
        
        let loaded = 0;
        const total = files.length;
        
        // 并行加载
        const promises = files.map(async (filename) => {
            try {
                const response = await fetch(this.sampleDir + filename);
                if (!response.ok) throw new Error(`HTTP ${response.status}`);
                
                const arrayBuffer = await response.arrayBuffer();
                const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
                
                this.samples.set(filename, audioBuffer);
                loaded++;
                
                if (progressCallback) {
                    progressCallback(loaded, total);
                }
                
                return true;
            } catch (error) {
                console.warn(`加载失败: ${filename}`, error);
                return false;
            }
        });
        
        await Promise.all(promises);
        
        console.log(`🎹 Steinway 音色加载完成: ${this.samples.size}/${total} 个文件`);
        return this.samples.size > 0;
    }
    
    // 获取采样（根据 MIDI 音符和力度）
    getSample(midiNote, velocity) {
        const { noteName, semitoneOffset } = this.findClosestSample(midiNote);
        const velocityLayer = this.getVelocityLayer(velocity);
        const roundRobin = this.getRoundRobin();
        
        const filename = `Steinway_${noteName}_${velocityLayer}_${roundRobin}.ogg`;
        const buffer = this.samples.get(filename);
        
        return {
            buffer,
            semitoneOffset,
            noteName,
            velocityLayer,
            roundRobin
        };
    }
    
    // 获取 Release 采样
    getReleaseSample(midiNote) {
        const { noteName } = this.findClosestSample(midiNote);
        const filename = `Steinway_Release_${noteName}.ogg`;
        return this.samples.get(filename);
    }
}

// 导出
if (typeof module !== 'undefined' && module.exports) {
    module.exports = SteinwayLoader;
}
