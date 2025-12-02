// 音乐解锁系统 - 管理音乐的锁定/解锁状态

class MusicUnlockSystem {
    constructor() {
        this.unlockedMusic = [];
        this.allMusic = [];
        this.unlockCost = 25;
        this.initialized = false;
    }

    async init(musicList) {
        this.allMusic = musicList.map(file => file.split('/').pop().replace('.mid', ''));
        const loadResult = await this.loadUnlockedMusic();
        if (loadResult.isNewUser && this.unlockedMusic.length === 0) {
            await this.initNewUser();
        }
        this.initialized = true;
    }

    async loadUnlockedMusic() {
        if (typeof getUnlockedMusic === 'function') {
            const result = await getUnlockedMusic();
            if (result.success) {
                this.unlockedMusic = result.music || [];
                let isLoggedIn = false;
                if (typeof getCurrentUser === 'function') {
                    const user = await getCurrentUser();
                    isLoggedIn = !!user;
                }
                return { isNewUser: isLoggedIn && this.unlockedMusic.length === 0 };
            }
        }
        this.unlockedMusic = [];
        return { isNewUser: false };
    }

    async initNewUser() {
        if (this.allMusic.length === 0) return;
        if (typeof getUnlockedMusic === 'function') {
            const checkResult = await getUnlockedMusic();
            if (checkResult.success && checkResult.music?.length > 0) {
                this.unlockedMusic = checkResult.music;
                return;
            }
        }
        const randomIndex = Math.floor(Math.random() * this.allMusic.length);
        const selectedMusic = this.allMusic[randomIndex];
        if (typeof unlockMusic === 'function') {
            const result = await unlockMusic(selectedMusic);
            if (result.success) this.unlockedMusic = [selectedMusic];
        }
    }

    isUnlocked(musicName) {
        return this.unlockedMusic.includes(musicName);
    }

    async unlock(musicName, puzzleSystem) {
        if (this.isUnlocked(musicName)) return { success: false, error: '该音乐已解锁' };
        if (puzzleSystem.getCount() < this.unlockCost) {
            return { success: false, error: `需要 ${this.unlockCost} 个拼图碎片，当前只有 ${puzzleSystem.getCount()} 个` };
        }
        if (!puzzleSystem.spend(this.unlockCost)) return { success: false, error: '拼图碎片不足' };
        this.unlockedMusic.push(musicName);
        if (typeof unlockMusic === 'function') await unlockMusic(musicName);
        return { success: true };
    }

    getUnlockedMusic() { return [...this.unlockedMusic]; }
    getLockedMusic() { return this.allMusic.filter(name => !this.isUnlocked(name)); }
    
    getRandomUnlockedMusic() {
        if (this.unlockedMusic.length === 0) return null;
        return this.unlockedMusic[Math.floor(Math.random() * this.unlockedMusic.length)];
    }
}

if (typeof window !== 'undefined') {
    window.MusicUnlockSystem = MusicUnlockSystem;
}
