// 云端数据同步系统
class CloudSyncManager {
    constructor() {
        this.syncInProgress = false;
        this.lastSyncTime = 0;
        this.autoSyncInterval = 60000;
        this.autoSyncTimer = null;
    }

    async init() {
        const user = await getCurrentUser();
        if (!user) return { success: false, error: '用户未登录' };
        const result = await this.pullAllDataFromCloud();
        if (result.success) this.startAutoSync();
        return result;
    }

    async pullAllDataFromCloud() {
        if (this.syncInProgress) return { success: false, error: '同步正在进行中' };
        this.syncInProgress = true;
        try {
            const result = await loadAllDataFromCloud();
            if (!result.success) throw new Error(result.error);
            const data = result.data;
            if (data.settings) this.applySettings(data.settings);
            if (data.inventory && typeof puzzlePieceSystem !== 'undefined') {
                puzzlePieceSystem.puzzlePieces = data.inventory.puzzlePieces || 0;
                puzzlePieceSystem.updateUI();
            }
            if (data.unlockedMusic && typeof musicUnlockSystem !== 'undefined') {
                musicUnlockSystem.unlockedMusic = data.unlockedMusic || [];
            }
            if (data.stats) this.updateStatsUI(data.stats);
            this.lastSyncTime = Date.now();
            return { success: true, data };
        } catch (error) {
            return { success: false, error: error.message };
        } finally {
            this.syncInProgress = false;
        }
    }

    async pushAllDataToCloud() {
        if (this.syncInProgress) return { success: false, error: '同步正在进行中' };
        this.syncInProgress = true;
        try {
            const allData = {
                settings: this.collectSettings(),
                inventory: { puzzlePieces: typeof puzzlePieceSystem !== 'undefined' ? puzzlePieceSystem.getCount() : 0 }
            };
            const result = await syncAllDataToCloud(allData);
            if (!result.success) throw new Error(result.error);
            this.lastSyncTime = Date.now();
            return { success: true };
        } catch (error) {
            return { success: false, error: error.message };
        } finally {
            this.syncInProgress = false;
        }
    }

    applySettings(settings) {
        if (settings.volume !== undefined) {
            const volumeSlider = document.getElementById('volumeSlider');
            const volumeValue = document.getElementById('volumeValue');
            if (volumeSlider && volumeValue) {
                volumeSlider.value = settings.volume;
                volumeValue.textContent = settings.volume + '%';
                if (typeof audioEngine !== 'undefined' && audioEngine) {
                    audioEngine.setMasterVolume(settings.volume / 100);
                }
            }
        }
        if (settings.quality_level !== undefined && typeof renderManager !== 'undefined' && renderManager) {
            renderManager.setQualityLevel(settings.quality_level);
            document.querySelectorAll('.quality-btn').forEach(btn => {
                btn.classList.toggle('active', btn.getAttribute('data-quality') === settings.quality_level);
            });
        }
        if (settings.auto_quality_adjust !== undefined && typeof renderManager !== 'undefined' && renderManager) {
            const toggle = document.getElementById('autoQualityToggle');
            const status = document.getElementById('autoQualityStatus');
            if (toggle && status) {
                toggle.checked = settings.auto_quality_adjust;
                status.textContent = settings.auto_quality_adjust ? '启用' : '禁用';
                settings.auto_quality_adjust ? renderManager.qualityAdapter.enableAutoAdjust() : renderManager.qualityAdapter.disableAutoAdjust();
            }
        }
        if (settings.post_processing_enabled !== undefined && typeof renderManager !== 'undefined' && renderManager) {
            const toggle = document.getElementById('postProcessingToggle');
            const status = document.getElementById('postProcessingStatus');
            if (toggle && status) {
                toggle.checked = settings.post_processing_enabled;
                status.textContent = settings.post_processing_enabled ? '启用' : '禁用';
                renderManager.setPostProcessing(settings.post_processing_enabled);
            }
        }
        if (settings.bloom_intensity !== undefined && typeof renderManager !== 'undefined' && renderManager?.postProcessing) {
            const slider = document.getElementById('bloomIntensitySlider');
            const value = document.getElementById('bloomIntensityValue');
            if (slider && value) {
                slider.value = settings.bloom_intensity * 100;
                value.textContent = settings.bloom_intensity.toFixed(1);
                renderManager.postProcessing.setBloomIntensity(settings.bloom_intensity);
            }
        }
    }

    collectSettings() {
        const settings = {};
        const volumeSlider = document.getElementById('volumeSlider');
        if (volumeSlider) settings.volume = parseInt(volumeSlider.value);
        if (typeof renderManager !== 'undefined' && renderManager?.qualityAdapter) {
            settings.quality_level = renderManager.qualityAdapter.getCurrentQuality();
        }
        const autoQualityToggle = document.getElementById('autoQualityToggle');
        if (autoQualityToggle) settings.auto_quality_adjust = autoQualityToggle.checked;
        const postProcessingToggle = document.getElementById('postProcessingToggle');
        if (postProcessingToggle) settings.post_processing_enabled = postProcessingToggle.checked;
        const bloomIntensitySlider = document.getElementById('bloomIntensitySlider');
        if (bloomIntensitySlider) settings.bloom_intensity = parseFloat(bloomIntensitySlider.value) / 100;
        if (typeof currentMidiName !== 'undefined') settings.last_selected_music = currentMidiName;
        return settings;
    }

    updateStatsUI(stats) {
        const el = (id) => document.getElementById(id);
        if (el('statTotalGames')) el('statTotalGames').textContent = stats.totalGames || 0;
        if (el('statBestScore')) el('statBestScore').textContent = stats.bestScore || 0;
        if (el('statAvgAccuracy')) el('statAvgAccuracy').textContent = (stats.averageAccuracy || 0).toFixed(1) + '%';
        if (el('statMaxCombo')) el('statMaxCombo').textContent = stats.maxCombo || 0;
    }

    startAutoSync() {
        if (this.autoSyncTimer) clearInterval(this.autoSyncTimer);
        this.autoSyncTimer = setInterval(async () => {
            const user = await getCurrentUser();
            if (user) await this.pushAllDataToCloud();
            else this.stopAutoSync();
        }, this.autoSyncInterval);
    }

    stopAutoSync() {
        if (this.autoSyncTimer) {
            clearInterval(this.autoSyncTimer);
            this.autoSyncTimer = null;
        }
    }

    async manualSync() {
        await this.pushAllDataToCloud();
        await this.pullAllDataFromCloud();
    }
}

let cloudSyncManager = null;

async function initCloudSync() {
    if (!cloudSyncManager) cloudSyncManager = new CloudSyncManager();
    return await cloudSyncManager.init();
}

function setupSettingsSyncListeners() {
    const syncOnChange = async () => { if (cloudSyncManager) await cloudSyncManager.pushAllDataToCloud(); };
    const addListener = (id, event = 'change') => {
        const el = document.getElementById(id);
        if (el) el.addEventListener(event, syncOnChange);
    };
    addListener('volumeSlider');
    addListener('autoQualityToggle');
    addListener('postProcessingToggle');
    addListener('bloomIntensitySlider');
    document.querySelectorAll('.quality-btn').forEach(btn => {
        btn.addEventListener('click', () => setTimeout(syncOnChange, 500));
    });
}

if (typeof window !== 'undefined') {
    window.CloudSyncManager = CloudSyncManager;
    window.cloudSyncManager = cloudSyncManager;
    window.initCloudSync = initCloudSync;
    window.setupSettingsSyncListeners = setupSettingsSyncListeners;
}
