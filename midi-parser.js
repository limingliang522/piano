// MIDI 解析器
class MIDIParser {
    constructor() {
        this.tracks = [];
        this.tempo = 500000; // 默认120 BPM
        this.ticksPerBeat = 480;
    }

    async loadMIDI(url) {
        const response = await fetch(url);
        const arrayBuffer = await response.arrayBuffer();
        const data = new Uint8Array(arrayBuffer);
        return this.parse(data);
    }

    parse(data) {
        let pos = 0;
        
        // 读取头部
        const header = this.readString(data, pos, 4);
        pos += 4;
        
        if (header !== 'MThd') {
            throw new Error('Invalid MIDI file');
        }
        
        const headerLength = this.readInt32(data, pos);
        pos += 4;
        
        const format = this.readInt16(data, pos);
        pos += 2;
        
        const trackCount = this.readInt16(data, pos);
        pos += 2;
        
        this.ticksPerBeat = this.readInt16(data, pos);
        pos += 2;
        
        console.log(`MIDI格式: ${format}, 轨道数: ${trackCount}, Ticks/Beat: ${this.ticksPerBeat}`);
        
        // 读取所有轨道
        const allNotes = [];
        
        for (let i = 0; i < trackCount; i++) {
            const trackHeader = this.readString(data, pos, 4);
            pos += 4;
            
            if (trackHeader !== 'MTrk') {
                throw new Error('Invalid track header');
            }
            
            const trackLength = this.readInt32(data, pos);
            pos += 4;
            
            const trackEnd = pos + trackLength;
            const notes = this.parseTrack(data, pos, trackEnd);
            allNotes.push(...notes);
            
            pos = trackEnd;
        }
        
        console.log(`最终 Tempo: ${this.tempo} 微秒/拍 (${Math.round(60000000 / this.tempo)} BPM)`);
        
        // 按时间排序
        allNotes.sort((a, b) => a.time - b.time);
        
        return allNotes;
    }

    parseTrack(data, start, end) {
        let pos = start;
        let currentTime = 0;
        let lastStatus = 0;
        const notes = [];
        const noteOnMap = new Map();
        
        while (pos < end) {
            // 读取 delta time
            const deltaTime = this.readVarLen(data, pos);
            currentTime += deltaTime.value;
            pos = deltaTime.pos;
            
            // 读取事件
            let status = data[pos];
            
            if (status < 0x80) {
                // Running status
                status = lastStatus;
            } else {
                pos++;
                lastStatus = status;
            }
            
            const eventType = status & 0xF0;
            const channel = status & 0x0F;
            
            if (eventType === 0x90) {
                // Note On
                const note = data[pos++];
                const velocity = data[pos++];
                
                if (velocity > 0) {
                    noteOnMap.set(note, {
                        time: currentTime,
                        note: note,
                        velocity: velocity
                    });
                } else {
                    // Velocity 0 = Note Off
                    if (noteOnMap.has(note)) {
                        const noteOn = noteOnMap.get(note);
                        notes.push({
                            time: noteOn.time,
                            duration: currentTime - noteOn.time,
                            note: note,
                            velocity: noteOn.velocity
                        });
                        noteOnMap.delete(note);
                    }
                }
            } else if (eventType === 0x80) {
                // Note Off
                const note = data[pos++];
                const velocity = data[pos++];
                
                if (noteOnMap.has(note)) {
                    const noteOn = noteOnMap.get(note);
                    notes.push({
                        time: noteOn.time,
                        duration: currentTime - noteOn.time,
                        note: note,
                        velocity: noteOn.velocity
                    });
                    noteOnMap.delete(note);
                }
            } else if (eventType === 0xB0 || eventType === 0xE0) {
                // Control Change or Pitch Bend
                pos += 2;
            } else if (eventType === 0xC0 || eventType === 0xD0) {
                // Program Change or Channel Pressure
                pos += 1;
            } else if (status === 0xFF) {
                // Meta event
                const metaType = data[pos++];
                const length = this.readVarLen(data, pos);
                
                // 检查是否是 Set Tempo 事件 (0x51)
                if (metaType === 0x51 && length.value === 3) {
                    const tempo = (data[length.pos] << 16) | 
                                 (data[length.pos + 1] << 8) | 
                                 data[length.pos + 2];
                    this.tempo = tempo;
                    console.log(`检测到 Tempo: ${tempo} 微秒/拍 (${Math.round(60000000 / tempo)} BPM)`);
                }
                
                pos = length.pos + length.value;
            } else if (status === 0xF0 || status === 0xF7) {
                // SysEx
                const length = this.readVarLen(data, pos);
                pos = length.pos + length.value;
            }
        }
        
        return notes;
    }

    readVarLen(data, pos) {
        let value = 0;
        let byte;
        
        do {
            byte = data[pos++];
            value = (value << 7) | (byte & 0x7F);
        } while (byte & 0x80);
        
        return { value, pos };
    }

    readInt32(data, pos) {
        return (data[pos] << 24) | (data[pos + 1] << 16) | 
               (data[pos + 2] << 8) | data[pos + 3];
    }

    readInt16(data, pos) {
        return (data[pos] << 8) | data[pos + 1];
    }

    readString(data, pos, length) {
        let str = '';
        for (let i = 0; i < length; i++) {
            str += String.fromCharCode(data[pos + i]);
        }
        return str;
    }

    ticksToSeconds(ticks) {
        return (ticks / this.ticksPerBeat) * (this.tempo / 1000000);
    }
}
