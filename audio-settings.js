// 音频设置管理器
class AudioSettings {
    constructor(audioEngine) {
        this.audioEngine = audioEngine;
        this.settings = {
            masterVolume: 0.8,
            performanceMode: 'high',
            reverbEnabled: true,
            spatialAudioEnabled: true,
            visualizerEnabled: false
        };
        
        // 从本地存储加载设置
        this.loadSettings();
    }
    
    // 加载设置
    loadSettings() {
        try {
            const saved = localStorage.getItem('audioSettings');
            if (saved) {
                this.settings = { ...this.settings, ...JSON.parse(saved) };
                this.applySettings();
            }
        } catch (error) {
            console.warn('加载音频设置失败:', error);
        }
    }
    
    // 保存设置
    saveSettings() {
        try {
            localStorage.setItem('audioSettings', JSON.stringify(this.settings));
        } catch (error) {
            console.warn('保存音频设置失败:', error);
        }
    }
    
    // 应用设置到音频引擎
    applySettings() {
        if (!this.audioEngine) return;
        
        this.audioEngine.setMasterVolume(this.settings.masterVolume);
        this.audioEngine.setPerformanceMode(this.settings.performanceMode);
        this.audioEngine.toggleReverb(this.settings.reverbEnabled);
        this.audioEngine.toggleSpatialAudio(this.settings.spatialAudioEnabled);
    }
    
    // 设置主音量
    setMasterVolume(volume) {
        this.settings.masterVolume = Math.max(0, Math.min(1, volume));
        this.audioEngine.setMasterVolume(this.settings.masterVolume);
        this.saveSettings();
    }
    
    // 设置性能模式
    setPerformanceMode(mode) {
        if (['high', 'medium', 'low'].includes(mode)) {
            this.settings.performanceMode = mode;
            this.audioEngine.setPerformanceMode(mode);
            this.saveSettings();
        }
    }
    
    // 切换混响
    toggleReverb(enabled) {
        this.settings.reverbEnabled = enabled;
        this.audioEngine.toggleReverb(enabled);
        this.saveSettings();
    }
    
    // 切换3D音频
    toggleSpatialAudio(enabled) {
        this.settings.spatialAudioEnabled = enabled;
        this.audioEngine.toggleSpatialAudio(enabled);
        this.saveSettings();
    }
    
    // 切换可视化器
    toggleVisualizer(enabled) {
        this.settings.visualizerEnabled = enabled;
        this.saveSettings();
    }
    
    // 获取当前设置
    getSettings() {
        return { ...this.settings };
    }
    
    // 重置为默认设置
    resetToDefaults() {
        this.settings = {
            masterVolume: 0.8,
            performanceMode: 'high',
            reverbEnabled: true,
            spatialAudioEnabled: true,
            visualizerEnabled: false
        };
        this.applySettings();
        this.saveSettings();
    }
    
    // 创建设置UI
    createSettingsUI(containerId) {
        const container = document.getElementById(containerId);
        if (!container) return;
        
        container.innerHTML = `
            <div class="audio-settings-panel">
                <h3>🎵 音频设置</h3>
                
                <div class="setting-item">
                    <label>主音量</label>
                    <input type="range" id="volumeSlider" min="0" max="100" 
                           value="${this.settings.masterVolume * 100}">
                    <span id="volumeValue">${Math.round(this.settings.masterVolume * 100)}%</span>
                </div>
                
                <div class="setting-item">
                    <label>性能模式</label>
                    <select id="performanceSelect">
                        <option value="high" ${this.settings.performanceMode === 'high' ? 'selected' : ''}>
                            高性能 (HRTF 3D音频)
                        </option>
                        <option value="medium" ${this.settings.performanceMode === 'medium' ? 'selected' : ''}>
                            中性能 (简化3D音频)
                        </option>
                        <option value="low" ${this.settings.performanceMode === 'low' ? 'selected' : ''}>
                            低性能 (立体声)
                        </option>
                    </select>
                </div>
                
                <div class="setting-item">
                    <label>
                        <input type="checkbox" id="reverbToggle" 
                               ${this.settings.reverbEnabled ? 'checked' : ''}>
                        混响效果
                    </label>
                </div>
                
                <div class="setting-item">
                    <label>
                        <input type="checkbox" id="spatialToggle" 
                               ${this.settings.spatialAudioEnabled ? 'checked' : ''}>
                        3D空间音频
                    </label>
                </div>
                
                <div class="setting-item">
                    <label>
                        <input type="checkbox" id="visualizerToggle" 
                               ${this.settings.visualizerEnabled ? 'checked' : ''}>
                        音频可视化
                    </label>
                </div>
                
                <button id="resetAudioSettings" class="reset-btn">重置为默认</button>
                
                <div class="audio-status">
                    <h4>系统状态</h4>
                    <div id="audioStatus"></div>
                </div>
            </div>
        `;
        
        this.bindUIEvents();
        this.updateStatusDisplay();
    }
    
    // 绑定UI事件
    bindUIEvents() {
        // 音量滑块
        const volumeSlider = document.getElementById('volumeSlider');
        const volumeValue = document.getElementById('volumeValue');
        if (volumeSlider) {
            volumeSlider.addEventListener('input', (e) => {
                const volume = e.target.value / 100;
                this.setMasterVolume(volume);
                if (volumeValue) {
                    volumeValue.textContent = `${Math.round(volume * 100)}%`;
                }
            });
        }
        
        // 性能模式选择
        const performanceSelect = document.getElementById('performanceSelect');
        if (performanceSelect) {
            performanceSelect.addEventListener('change', (e) => {
                this.setPerformanceMode(e.target.value);
                this.updateStatusDisplay();
            });
        }
        
        // 混响开关
        const reverbToggle = document.getElementById('reverbToggle');
        if (reverbToggle) {
            reverbToggle.addEventListener('change', (e) => {
                this.toggleReverb(e.target.checked);
            });
        }
        
        // 3D音频开关
        const spatialToggle = document.getElementById('spatialToggle');
        if (spatialToggle) {
            spatialToggle.addEventListener('change', (e) => {
                this.toggleSpatialAudio(e.target.checked);
            });
        }
        
        // 可视化器开关
        const visualizerToggle = document.getElementById('visualizerToggle');
        if (visualizerToggle) {
            visualizerToggle.addEventListener('change', (e) => {
                this.toggleVisualizer(e.target.checked);
            });
        }
        
        // 重置按钮
        const resetBtn = document.getElementById('resetAudioSettings');
        if (resetBtn) {
            resetBtn.addEventListener('click', () => {
                this.resetToDefaults();
                // 重新创建UI以反映默认值
                this.createSettingsUI(resetBtn.closest('.audio-settings-panel').parentElement.id);
            });
        }
    }
    
    // 更新状态显示
    updateStatusDisplay() {
        const statusDiv = document.getElementById('audioStatus');
        if (!statusDiv || !this.audioEngine) return;
        
        const status = this.audioEngine.getStatus();
        statusDiv.innerHTML = `
            <p>✅ 就绪状态: ${status.isReady ? '是' : '否'}</p>
            <p>🎹 已加载采样: ${status.samplesLoaded}/12 个音符</p>
            <p>🎵 活跃音符: ${status.activeNotes}</p>
            <p>🎮 性能模式: ${status.performanceMode}</p>
            <p>🎧 3D音频: ${status.spatialAudioEnabled ? '开启' : '关闭'}</p>
            <p>🌊 混响: ${status.reverbEnabled ? '开启' : '关闭'}</p>
            <p>⚡ 上下文状态: ${status.contextState}</p>
        `;
    }
}
