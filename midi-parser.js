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
        
        const header = this.readString(data, pos, 4);
        pos += 4;
        
        if (header !== 'MThd') {
            throw new Error('Invalid MIDI file');
        }
        
        pos += 4;
        pos += 2;
        
        const trackCount = this.readInt16(data, pos);
        pos += 2;
        
        this.ticksPerBeat = this.readInt16(data, pos);
        pos += 2;
        
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
            const deltaTime = this.readVarLen(data, pos);
            currentTime += deltaTime.value;
            pos = deltaTime.pos;
            
            let status = data[pos];
            
            if (status < 0x80) {
                status = lastStatus;
            } else {
                pos++;
                lastStatus = status;
            }
            
            const eventType = status & 0xF0;
            
            if (eventType === 0x90) {
                const note = data[pos++];
                const velocity = data[pos++];
                
                if (velocity > 0) {
                    noteOnMap.set(note, {
                        time: currentTime,
                        note: note,
                        velocity: velocity
                    });
                } else {
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
                const note = data[pos++];
                pos++;
                
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
                pos += 2;
            } else if (eventType === 0xC0 || eventType === 0xD0) {
                pos += 1;
            } else if (status === 0xFF) {
                const metaType = data[pos++];
                const length = this.readVarLen(data, pos);
                
                if (metaType === 0x51 && length.value === 3) {
                    const tempo = (data[length.pos] << 16) | 
                                 (data[length.pos + 1] << 8) | 
                                 data[length.pos + 2];
                    this.tempo = tempo;
                }
                
                pos = length.pos + length.value;
            } else if (status === 0xF0 || status === 0xF7) {
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
