class TimbreConfig {
    constructor() {
        this.timbres = new Map();
        this.currentTimbre = null;
        this.initializeDefaultTimbres();
    }
    
    // 初始化默认音色配置
    initializeDefaultTimbres() {
        // Steinway Grand Piano - 专业级多层采样
        this.registerTimbre('steinway', {
            name: 'Steinway Grand Piano',
            description: '专业级多层采样，温暖厚重，真实动态',
            type: 'multilayer',
            basePath: './钢琴/',
            filePattern: 'Steinway_{note}_Dyn{dyn}_RR{rr}.mp3',
            samplePoints: ['C0', 'G0', 'D1', 'A1', 'E2', 'B2', 'Fs3', 'Cs4', 'Gs4', 'Ds5', 'As5', 'F6'],
            dynamics: [1, 2, 3, 4],
            roundRobins: [1, 2],
            velocityMapping: {
                1: [0, 31],    // pp
                2: [32, 63],   // mp
                3: [64, 95],   // mf
                4: [96, 127]   // ff
            },
            totalFiles: 96,
            estimatedSize: '30-50 MB',
            features: {
                multiDynamics: true,
                roundRobin: true,
                spatialAudio: true
            }
        });
        
        // Bright Acoustic Piano - 标准单层采样
        this.registerTimbre('bright', {
            name: 'Bright Acoustic Piano',
            description: '明亮清晰，快速加载，适合游戏',
            type: 'singlelayer',
            basePath: './piano-samples/',
            filePattern: '{note}.mp3',
            samplePoints: [
                'A0', 'B0',
                'C1', 'D1', 'E1', 'F1', 'G1', 'A1', 'B1',
                'C2', 'D2', 'E2', 'F2', 'G2', 'A2', 'B2',
                'C3', 'D3', 'E3', 'F3', 'G3', 'A3', 'B3',
                'C4', 'D4', 'E4', 'F4', 'G4', 'A4', 'B4',
                'C5', 'D5', 'E5', 'F5', 'G5', 'A5', 'B5',
                'C6', 'D6', 'E6', 'F6', 'G6', 'A6', 'B6',
                'C7', 'D7', 'E7', 'F7', 'G7', 'A7', 'B7',
                'C8'
            ],
            dynamics: null,
            roundRobins: null,
            velocityMapping: null,
            totalFiles: 52,
            estimatedSize: '15-25 MB',
            features: {
                multiDynamics: false,
                roundRobin: false,
                spatialAudio: true
            }
        });
        
        // 设置默认音色
        this.currentTimbre = 'steinway';
    }
    
    // 注册新音色
    registerTimbre(id, config) {
        this.timbres.set(id, config);
    }
    
    // 获取音色配置
    getTimbre(id) {
        return this.timbres.get(id);
    }
    
    // 获取当前音色
    getCurrentTimbre() {
        return this.timbres.get(this.currentTimbre);
    }
    
    // 切换音色
    setCurrentTimbre(id) {
        if (this.timbres.has(id)) {
            this.currentTimbre = id;
            return true;
        }
        return false;
    }
    
    // 获取所有音色列表
    getAllTimbres() {
        const list = [];
        this.timbres.forEach((config, id) => {
            list.push({
                id,
                name: config.name,
                description: config.description,
                type: config.type,
                totalFiles: config.totalFiles,
                estimatedSize: config.estimatedSize
            });
        });
        return list;
    }
    
    // 生成文件名
    generateFileName(timbreId, note, dyn = null, rr = null) {
        const config = this.timbres.get(timbreId);
        if (!config) return null;
        
        let fileName = config.filePattern;
        fileName = fileName.replace('{note}', note);
        
        if (dyn !== null) {
            fileName = fileName.replace('{dyn}', dyn);
        }
        if (rr !== null) {
            fileName = fileName.replace('{rr}', rr);
        }
        
        // 不对文件名进行 URL 编码，因为 # 符号在文件名中是合法的
        return config.basePath + fileName;
    }
    
    // 生成采样键名
    generateSampleKey(note, dyn = null, rr = null) {
        if (dyn !== null && rr !== null) {
            return `${note}_${dyn}_${rr}`;
        }
        return note;
    }
    
    // 根据 velocity 选择力度层
    selectDynamicLayer(timbreId, velocity) {
        const config = this.timbres.get(timbreId);
        if (!config || !config.velocityMapping) return null;
        
        for (const [dyn, range] of Object.entries(config.velocityMapping)) {
            if (velocity >= range[0] && velocity <= range[1]) {
                return parseInt(dyn);
            }
        }
        return 2; // 默认中等力度
    }
    
    // 随机选择轮询
    selectRoundRobin(timbreId) {
        const config = this.timbres.get(timbreId);
        if (!config || !config.roundRobins) return null;
        
        const index = Math.floor(Math.random() * config.roundRobins.length);
        return config.roundRobins[index];
    }
    
    // 将 MIDI 音符号转换为音符名称
    midiToNoteName(midiNote) {
        const noteNames = ['C', 'Cs', 'D', 'Ds', 'E', 'F', 'Fs', 'G', 'Gs', 'A', 'As', 'B'];
        const octave = Math.floor(midiNote / 12) - 1;
        const noteName = noteNames[midiNote % 12];
        return noteName + octave;
    }
    
    // 将音符名称转换为 MIDI 音符号
    noteNameToMidi(noteName) {
        const noteNames = ['C', 'Cs', 'D', 'Ds', 'E', 'F', 'Fs', 'G', 'Gs', 'A', 'As', 'B'];
        const match = noteName.match(/^([A-G]s?)(\d+)$/);
        if (!match) return 60; // 默认 C4
        
        const note = match[1];
        const octave = parseInt(match[2]);
        const noteIndex = noteNames.indexOf(note);
        if (noteIndex === -1) return 60;
        
        return (octave + 1) * 12 + noteIndex;
    }
    
    // 找到最接近的采样点
    findClosestSample(timbreId, targetMidi) {
        const config = this.timbres.get(timbreId);
        if (!config) return null;
        
        let closestNote = null;
        let minDistance = Infinity;
        
        for (const noteName of config.samplePoints) {
            const sampleMidi = this.noteNameToMidi(noteName);
            const distance = Math.abs(sampleMidi - targetMidi);
            if (distance < minDistance) {
                minDistance = distance;
                closestNote = noteName;
            }
        }
        
        if (!closestNote) return null;
        
        const closestMidi = this.noteNameToMidi(closestNote);
        const semitoneOffset = targetMidi - closestMidi;
        
        return {
            noteName: closestNote,
            semitoneOffset: semitoneOffset
        };
    }
    
    // 获取加载列表（用于批量加载）
    getLoadList(timbreId) {
        const config = this.timbres.get(timbreId);
        if (!config) return [];
        
        const loadList = [];
        
        for (const note of config.samplePoints) {
            if (config.type === 'multilayer') {
                // 多层采样：遍历所有力度和轮询
                for (const dyn of config.dynamics) {
                    for (const rr of config.roundRobins) {
                        loadList.push({
                            note,
                            dyn,
                            rr,
                            fileName: this.generateFileName(timbreId, note, dyn, rr),
                            sampleKey: this.generateSampleKey(note, dyn, rr)
                        });
                    }
                }
            } else {
                // 单层采样
                loadList.push({
                    note,
                    dyn: null,
                    rr: null,
                    fileName: this.generateFileName(timbreId, note),
                    sampleKey: this.generateSampleKey(note)
                });
            }
        }
        
        return loadList;
    }
}
