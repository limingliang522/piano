/**
 * 渲染系统增强模块
 * 提供性能监控、视锥剔除、对象池、LOD管理、批处理渲染等功能
 */

// ============================================================================
// 1. RenderManager - 渲染管理器（核心控制器）
// ============================================================================

/**
 * 渲染管理器 - 统一管理所有渲染相关的子系统
 */
class RenderManager {
    constructor(scene, camera, renderer) {
        this.scene = scene;
        this.camera = camera;
        this.renderer = renderer;
        
        // 子系统引用
        this.performanceMonitor = null;
        this.qualityAdapter = null;
        this.frustumCuller = null;
        this.objectPool = null;
        this.lodManager = null;
        this.batchRenderer = null;
        this.postProcessing = null;
        this.memoryManager = null;
        
        this.initialized = false;
    }
    
    /**
     * 初始化所有子系统
     */
    initialize() {
        console.log('🎨 初始化渲染系统...');
        
        // 初始化性能监控器
        this.performanceMonitor = new PerformanceMonitor(this.renderer);
        
        // 初始化画质适配器
        this.qualityAdapter = new QualityAdapter(this.renderer, this.performanceMonitor);
        this.qualityAdapter.initialize();
        
        // 初始化视锥剔除器
        this.frustumCuller = new FrustumCuller(this.camera);
        
        // 初始化LOD管理器
        this.lodManager = new LODManager(this.camera);
        
        // 初始化批处理渲染器
        this.batchRenderer = new BatchRenderer(this.scene);
        
        // 初始化内存管理器
        this.memoryManager = new MemoryManager(this.scene, this.renderer, this.performanceMonitor);
        this.memoryManager.setQualityAdapter(this.qualityAdapter);
        
        // 初始化后处理管理器
        this.postProcessing = new PostProcessing(this.renderer, this.scene, this.camera);
        const postInitSuccess = this.postProcessing.initialize();
        
        if (postInitSuccess) {
            // 设置性能监控器引用
            this.postProcessing.setPerformanceMonitor(this.performanceMonitor);
            
            // 添加泛光效果
            this.postProcessing.addBloomEffect();
            
            // 根据当前画质级别决定是否添加SSAO
            const currentQuality = this.qualityAdapter.getCurrentQuality();
            this.postProcessing.setQualityLevel(currentQuality);
            
            // 如果是high或ultra画质，添加SSAO
            if (currentQuality === 'high' || currentQuality === 'ultra') {
                this.postProcessing.addSSAOEffect();
            }
            
            // 根据画质预设决定是否启用后处理
            const preset = this.qualityAdapter.getCurrentPreset();
            if (preset && preset.postProcessing) {
                this.postProcessing.setEnabled(true);
            }
            
            // 监听画质变化，同步更新后处理设置
            this.qualityAdapter.onQualityChange((oldQuality, newQuality, preset) => {
                this.postProcessing.setQualityLevel(newQuality);
                this.postProcessing.setEnabled(preset.postProcessing);
            });
        }
        
        this.initialized = true;
        console.log('✅ 渲染系统初始化完成');
    }
    
    /**
     * 每帧更新
     */
    update(deltaTime) {
        if (!this.initialized) return;
        
        // 更新画质适配器（检查是否需要调整画质）
        this.qualityAdapter.update();
        
        // 更新视锥剔除
        this.frustumCuller.updateFrustum();
        
        // 更新LOD管理器
        this.lodManager.update();
        
        // 更新批处理渲染器
        this.batchRenderer.updateBatches();
        
        // 检查内存使用情况（定期检查）
        if (this.memoryManager) {
            this.memoryManager.checkMemoryUsage(this.camera);
        }
        
        // 检查性能并自动调整后处理（每秒检查一次）
        if (this.postProcessing && Math.random() < 0.016) { // 约60fps时每秒检查一次
            this.postProcessing.checkPerformanceAndAdjust();
        }
    }
    
    /**
     * 渲染场景
     */
    render() {
        if (!this.initialized) {
            this.renderer.render(this.scene, this.camera);
            return;
        }
        
        // 使用后处理渲染或直接渲染
        if (this.postProcessing && this.postProcessing.enabled) {
            this.postProcessing.render();
        } else {
            this.renderer.render(this.scene, this.camera);
        }
    }

    
    /**
     * 获取性能统计
     */
    getPerformanceStats() {
        if (!this.performanceMonitor) return null;
        
        return {
            fps: this.performanceMonitor.getCurrentFPS(),
            averageFPS: this.performanceMonitor.getAverageFPS(),
            renderStats: this.performanceMonitor.getRenderStats(),
            cullingStats: this.frustumCuller ? this.frustumCuller.getCullingStats() : null,
            lodStats: this.lodManager ? this.lodManager.getStats() : null,
            batchStats: this.batchRenderer ? this.batchRenderer.getStats() : null,
            memoryStats: this.memoryManager ? this.memoryManager.getStats() : null,
            memorySummary: this.performanceMonitor ? this.performanceMonitor.getMemorySummary() : null
        };
    }
    
    /**
     * 清理场景资源（场景切换时调用）
     */
    cleanupScene() {
        if (this.memoryManager) {
            return this.memoryManager.cleanupUnusedResources();
        }
        return null;
    }
    
    /**
     * 跟踪对象用于内存管理
     */
    trackObject(object) {
        if (this.memoryManager) {
            this.memoryManager.trackObject(object);
        }
    }
    
    /**
     * 取消跟踪对象
     */
    untrackObject(object) {
        if (this.memoryManager) {
            this.memoryManager.untrackObject(object);
        }
    }
    
    /**
     * 设置对象池引用（用于内存溢出保护）
     */
    setObjectPool(pool) {
        this.objectPool = pool;
        if (this.memoryManager) {
            this.memoryManager.setObjectPool(pool);
        }
    }
    
    /**
     * 获取内存管理器
     */
    getMemoryManager() {
        return this.memoryManager;
    }
    
    /**
     * 设置画质级别
     */
    setQualityLevel(level) {
        if (this.qualityAdapter) {
            this.qualityAdapter.setManualQuality(level);
        }
    }
    
    /**
     * 启用/禁用后处理
     */
    setPostProcessing(enabled) {
        if (this.postProcessing) {
            this.postProcessing.setEnabled(enabled);
        }
    }
}

// ============================================================================
// 2. PerformanceMonitor - 性能监控器
// ============================================================================

/**
 * 性能监控器 - 实时监控渲染性能指标
 */
class PerformanceMonitor {
    constructor(renderer) {
        this.renderer = renderer;
        
        // 帧时间缓冲区（环形缓冲区，存储最近120帧）
        this.frameTimeBuffer = new Array(120).fill(16.67);
        this.bufferIndex = 0;
        
        // 性能数据
        this.currentFPS = 60;
        this.frameStartTime = 0;
        this.lastCheckTime = 0;
        
        // 性能阈值检测
        this.lowFPSStartTime = 0;
        this.highFPSStartTime = 0;
        this.lowFPSDuration = 0;
        this.highFPSDuration = 0;
        
        // 内存监控
        this.memoryData = {
            geometries: 0,
            textures: 0,
            programs: 0,
            lastUpdate: 0
        };
        
        // 内存警告阈值
        this.memoryThresholds = {
            geometries: 1000,
            textures: 100,
            programs: 50
        };
        
        // 内存历史记录（用于趋势分析）
        this.memoryHistory = [];
        this.maxHistoryLength = 60; // 保留最近60次记录
    }
    
    /**
     * 开始帧计时
     */
    beginFrame() {
        this.frameStartTime = performance.now();
    }
    
    /**
     * 结束帧计时
     */
    endFrame() {
        const frameTime = performance.now() - this.frameStartTime;
        
        // 存储到环形缓冲区
        this.frameTimeBuffer[this.bufferIndex] = frameTime;
        this.bufferIndex = (this.bufferIndex + 1) % this.frameTimeBuffer.length;
        
        // 计算当前FPS
        this.currentFPS = Math.round(1000 / frameTime);
        
        // 更新性能阈值检测
        this.updateThresholdDetection();
    }
    
    /**
     * 获取当前FPS
     */
    getCurrentFPS() {
        return this.currentFPS;
    }
    
    /**
     * 获取平均FPS（最近N帧）
     */
    getAverageFPS(frameCount = 60) {
        const count = Math.min(frameCount, this.frameTimeBuffer.length);
        let sum = 0;
        
        for (let i = 0; i < count; i++) {
            sum += this.frameTimeBuffer[i];
        }
        
        const avgFrameTime = sum / count;
        return Math.round(1000 / avgFrameTime);
    }
    
    /**
     * 获取渲染统计
     */
    getRenderStats() {
        const info = this.renderer.info;
        const memoryUsage = this.getMemoryUsage();
        
        return {
            drawCalls: info.render.calls,
            triangles: info.render.triangles,
            geometries: memoryUsage.geometries,
            textures: memoryUsage.textures,
            programs: memoryUsage.programs,
            memory: memoryUsage
        };
    }
    
    /**
     * 更新性能阈值检测
     */
    updateThresholdDetection() {
        const avgFPS = this.getAverageFPS();
        const now = performance.now();
        
        // 检测低FPS（低于30 FPS）
        if (avgFPS < 30) {
            if (this.lowFPSStartTime === 0) {
                this.lowFPSStartTime = now;
            }
            this.lowFPSDuration = (now - this.lowFPSStartTime) / 1000;
        } else {
            this.lowFPSStartTime = 0;
            this.lowFPSDuration = 0;
        }
        
        // 检测高FPS（高于55 FPS）
        if (avgFPS > 55) {
            if (this.highFPSStartTime === 0) {
                this.highFPSStartTime = now;
            }
            this.highFPSDuration = (now - this.highFPSStartTime) / 1000;
        } else {
            this.highFPSStartTime = 0;
            this.highFPSDuration = 0;
        }
    }
    
    /**
     * 检查是否需要降低画质
     */
    shouldReduceQuality() {
        return this.lowFPSDuration >= 3.0; // 低于30 FPS持续3秒
    }
    
    /**
     * 检查是否可以提升画质
     */
    canIncreaseQuality() {
        return this.highFPSDuration >= 5.0; // 高于55 FPS持续5秒
    }
    
    /**
     * 检查是否处于严重性能不足状态
     * 低于25 FPS表示严重性能不足
     */
    isSeverelyUnderperforming() {
        const avgFPS = this.getAverageFPS();
        return avgFPS < 25;
    }
    
    /**
     * 获取内存使用情况
     * 从 renderer.info.memory 获取实时内存数据
     */
    getMemoryUsage() {
        const info = this.renderer.info;
        const now = performance.now();
        
        // 更新内存数据
        this.memoryData = {
            geometries: info.memory.geometries,
            textures: info.memory.textures,
            programs: info.programs ? info.programs.length : 0,
            lastUpdate: now
        };
        
        // 记录到历史
        this.memoryHistory.push({
            timestamp: now,
            ...this.memoryData
        });
        
        // 限制历史记录长度
        if (this.memoryHistory.length > this.maxHistoryLength) {
            this.memoryHistory.shift();
        }
        
        return { ...this.memoryData };
    }
    
    /**
     * 检查内存是否超过警告阈值
     * @returns {Object} 包含警告信息的对象
     */
    checkMemoryThresholds() {
        const memory = this.getMemoryUsage();
        const warnings = [];
        
        if (memory.geometries > this.memoryThresholds.geometries) {
            warnings.push({
                type: 'geometries',
                current: memory.geometries,
                threshold: this.memoryThresholds.geometries,
                message: `几何体数量 (${memory.geometries}) 超过阈值 (${this.memoryThresholds.geometries})`
            });
        }
        
        if (memory.textures > this.memoryThresholds.textures) {
            warnings.push({
                type: 'textures',
                current: memory.textures,
                threshold: this.memoryThresholds.textures,
                message: `纹理数量 (${memory.textures}) 超过阈值 (${this.memoryThresholds.textures})`
            });
        }
        
        if (memory.programs > this.memoryThresholds.programs) {
            warnings.push({
                type: 'programs',
                current: memory.programs,
                threshold: this.memoryThresholds.programs,
                message: `着色器程序数量 (${memory.programs}) 超过阈值 (${this.memoryThresholds.programs})`
            });
        }
        
        return {
            hasWarnings: warnings.length > 0,
            warnings: warnings,
            memory: memory
        };
    }
    
    /**
     * 获取内存使用趋势
     * @returns {string} 'increasing' | 'stable' | 'decreasing'
     */
    getMemoryTrend() {
        if (this.memoryHistory.length < 10) {
            return 'stable'; // 数据不足，无法判断趋势
        }
        
        // 比较最近10次和之前10次的平均值
        const recentCount = 10;
        const recent = this.memoryHistory.slice(-recentCount);
        const previous = this.memoryHistory.slice(-recentCount * 2, -recentCount);
        
        const recentAvg = recent.reduce((sum, item) => sum + item.geometries + item.textures, 0) / recentCount;
        const previousAvg = previous.reduce((sum, item) => sum + item.geometries + item.textures, 0) / recentCount;
        
        const diff = recentAvg - previousAvg;
        const threshold = previousAvg * 0.1; // 10%的变化阈值
        
        if (diff > threshold) {
            return 'increasing';
        } else if (diff < -threshold) {
            return 'decreasing';
        } else {
            return 'stable';
        }
    }
    
    /**
     * 获取内存统计摘要
     */
    getMemorySummary() {
        const memory = this.getMemoryUsage();
        const thresholdCheck = this.checkMemoryThresholds();
        const trend = this.getMemoryTrend();
        
        return {
            current: memory,
            thresholds: this.memoryThresholds,
            warnings: thresholdCheck.warnings,
            hasWarnings: thresholdCheck.hasWarnings,
            trend: trend,
            historyLength: this.memoryHistory.length
        };
    }
    
    /**
     * 设置内存警告阈值
     */
    setMemoryThresholds(thresholds) {
        if (thresholds.geometries !== undefined) {
            this.memoryThresholds.geometries = thresholds.geometries;
        }
        if (thresholds.textures !== undefined) {
            this.memoryThresholds.textures = thresholds.textures;
        }
        if (thresholds.programs !== undefined) {
            this.memoryThresholds.programs = thresholds.programs;
        }
        
        console.log('📊 内存警告阈值已更新:', this.memoryThresholds);
    }
    
    /**
     * 清除内存历史记录
     */
    clearMemoryHistory() {
        this.memoryHistory = [];
    }
}


// ============================================================================
// 3. QualityAdapter - 画质适配器
// ============================================================================

/**
 * 画质预设配置
 * 定义四个画质级别：low, medium, high, ultra
 * 每个级别包含阴影、像素比、抗锯齿、雾距离、LOD距离等参数
 */
const QUALITY_PRESETS = {
    low: {
        name: '低',
        shadowMapSize: 1024,
        pixelRatio: 1.0,
        antialias: false,
        fogDistance: 80,
        maxLights: 1,
        postProcessing: false,
        lodDistances: [20, 50, 100],
        shadowDistance: 50, // 阴影渲染距离
        shadowCascades: 1 // 级联阴影层数
    },
    medium: {
        name: '中',
        shadowMapSize: 2048,
        pixelRatio: Math.min(window.devicePixelRatio || 1, 1.5),
        antialias: true,
        fogDistance: 100,
        maxLights: 2,
        postProcessing: false,
        lodDistances: [30, 70, 120],
        shadowDistance: 50,
        shadowCascades: 2
    },
    high: {
        name: '高',
        shadowMapSize: 2048,
        pixelRatio: Math.min(window.devicePixelRatio || 1, 2.0),
        antialias: true,
        fogDistance: 120,
        maxLights: 2,
        postProcessing: true,
        lodDistances: [30, 80, 150],
        shadowDistance: 50,
        shadowCascades: 2
    },
    ultra: {
        name: '超高',
        shadowMapSize: 4096,
        pixelRatio: window.devicePixelRatio || 1,
        antialias: true,
        fogDistance: 150,
        maxLights: 2,
        postProcessing: true,
        lodDistances: [40, 100, 180],
        shadowDistance: 50,
        shadowCascades: 3
    }
};

/**
 * 画质适配器 - 根据性能数据自动调整渲染画质
 */
class QualityAdapter {
    constructor(renderer, performanceMonitor) {
        this.renderer = renderer;
        this.performanceMonitor = performanceMonitor;
        
        this.currentQuality = 'high';
        this.autoAdjust = true;
        this.lastAdjustTime = 0;
        this.adjustCooldown = 5000; // 5秒冷却时间（防抖机制）
        
        // 设备性能信息
        this.deviceInfo = {
            gpu: 'unknown',
            memory: 0,
            resolution: { width: 0, height: 0 },
            pixelRatio: 1,
            screenSize: 0
        };
        
        // 画质变化监听器
        this.onQualityChangeCallbacks = [];
    }
    
    /**
     * 初始化，检测设备性能
     */
    initialize() {
        console.log('🔍 检测设备性能...');
        
        // 检测设备性能
        this.detectDevicePerformance();
        
        // 根据设备性能选择初始画质
        const initialQuality = this.determineInitialQuality();
        this.currentQuality = initialQuality;
        
        console.log(`🎨 初始画质级别: ${initialQuality} (${QUALITY_PRESETS[initialQuality].name})`);
        console.log('📊 设备信息:', this.deviceInfo);
        
        // 应用初始画质设置
        this.applyQualitySettings(initialQuality);
    }
    
    /**
     * 检测设备性能（GPU、内存、分辨率）
     */
    detectDevicePerformance() {
        // 获取屏幕信息
        this.deviceInfo.resolution = {
            width: window.innerWidth,
            height: window.innerHeight
        };
        this.deviceInfo.pixelRatio = window.devicePixelRatio || 1;
        this.deviceInfo.screenSize = window.innerWidth * window.innerHeight;
        
        // 尝试获取GPU信息
        try {
            const gl = this.renderer.getContext();
            const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
            if (debugInfo) {
                this.deviceInfo.gpu = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);
            }
        } catch (e) {
            console.warn('无法获取GPU信息:', e);
        }
        
        // 尝试获取内存信息（仅部分浏览器支持）
        if (performance.memory) {
            this.deviceInfo.memory = Math.round(performance.memory.jsHeapSizeLimit / (1024 * 1024));
        }
    }
    
    /**
     * 根据设备性能确定初始画质级别
     */
    determineInitialQuality() {
        const { pixelRatio, screenSize, memory, gpu } = this.deviceInfo;
        
        // 检查是否是移动设备
        const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        
        // 根据GPU信息判断（如果可用）
        if (gpu) {
            const gpuLower = gpu.toLowerCase();
            // 高端GPU
            if (gpuLower.includes('rtx') || gpuLower.includes('radeon rx 6') || gpuLower.includes('radeon rx 7')) {
                return 'ultra';
            }
            // 中高端GPU
            if (gpuLower.includes('gtx 16') || gpuLower.includes('gtx 20') || gpuLower.includes('radeon rx 5')) {
                return 'high';
            }
            // 集成显卡或低端GPU
            if (gpuLower.includes('intel') || gpuLower.includes('uhd') || gpuLower.includes('iris')) {
                return isMobile ? 'low' : 'medium';
            }
        }
        
        // 根据屏幕分辨率和像素比判断
        if (isMobile) {
            // 移动设备：更保守的画质选择
            if (pixelRatio > 2.5 && screenSize > 1500000) {
                return 'medium';
            } else {
                return 'low';
            }
        } else {
            // 桌面设备
            if (pixelRatio > 2 && screenSize > 2000000) {
                return 'ultra';
            } else if (pixelRatio > 1.5 && screenSize > 1000000) {
                return 'high';
            } else if (screenSize > 500000) {
                return 'medium';
            } else {
                return 'low';
            }
        }
    }
    
    /**
     * 每帧更新，检查是否需要调整画质
     */
    update() {
        if (!this.autoAdjust) return;
        
        const now = performance.now();
        
        // 防抖机制：5秒冷却时间
        if (now - this.lastAdjustTime < this.adjustCooldown) return;
        
        // 检查是否需要降低画质
        if (this.performanceMonitor.shouldReduceQuality()) {
            this.decreaseQuality();
            this.lastAdjustTime = now;
        }
        // 检查是否可以提升画质
        else if (this.performanceMonitor.canIncreaseQuality()) {
            this.increaseQuality();
            this.lastAdjustTime = now;
        }
    }
    
    /**
     * 应用画质配置（带平滑过渡）
     */
    applyQualitySettings(level, smooth = true) {
        const preset = QUALITY_PRESETS[level];
        if (!preset) {
            console.error(`无效的画质级别: ${level}`);
            return;
        }
        
        const oldQuality = this.currentQuality;
        const oldPreset = QUALITY_PRESETS[oldQuality];
        
        // 记录画质变化日志
        this.logQualityChange(oldQuality, level, preset);
        
        if (smooth && oldQuality !== level) {
            // 平滑过渡：逐步调整参数
            this.smoothTransition(oldPreset, preset, level);
        } else {
            // 立即应用所有设置
            this.applySettingsImmediate(preset, level);
        }
        
        // 更新当前画质级别
        this.currentQuality = level;
        
        // 触发画质变化回调
        this.notifyQualityChange(oldQuality, level, preset);
    }
    
    /**
     * 立即应用画质设置
     */
    applySettingsImmediate(preset, level) {
        // 应用像素比
        this.renderer.setPixelRatio(preset.pixelRatio);
        
        // 应用渲染器尺寸（考虑像素比）
        const width = window.innerWidth;
        const height = window.innerHeight;
        this.renderer.setSize(width, height);
        
        // 应用阴影设置
        if (this.renderer.shadowMap.enabled) {
            this.updateShadowMapSize(preset.shadowMapSize);
            this.configureCascadedShadowMaps(preset.shadowCascades || 1);
            this.renderer.shadowMap.needsUpdate = true;
        }
        
        // 应用雾效果距离
        if (typeof scene !== 'undefined' && scene && scene.fog) {
            scene.fog.far = preset.fogDistance;
        }
        
        // 更新LOD距离配置
        if (typeof LOD_CONFIG !== 'undefined') {
            this.updateLODDistances(preset.lodDistances);
        }
    }
    
    /**
     * 平滑过渡画质设置
     * 优先调整对视觉影响较小的设置，避免突然的视觉变化
     */
    smoothTransition(oldPreset, newPreset, newLevel) {
        // 第一步：调整对视觉影响较小的设置
        // 1. 先调整LOD距离（几乎无感知）
        if (typeof LOD_CONFIG !== 'undefined') {
            this.updateLODDistances(newPreset.lodDistances);
        }
        
        // 2. 调整雾效果距离（渐变效果）
        if (typeof scene !== 'undefined' && scene && scene.fog) {
            this.animateFogDistance(scene.fog.far, newPreset.fogDistance, 500);
        }
        
        // 第二步：延迟调整阴影设置（中等影响）
        setTimeout(() => {
            if (this.renderer.shadowMap.enabled) {
                this.updateShadowMapSize(newPreset.shadowMapSize);
                this.renderer.shadowMap.needsUpdate = true;
            }
        }, 200);
        
        // 第三步：最后调整像素比（影响最大）
        setTimeout(() => {
            this.renderer.setPixelRatio(newPreset.pixelRatio);
            const width = window.innerWidth;
            const height = window.innerHeight;
            this.renderer.setSize(width, height);
        }, 400);
    }
    
    /**
     * 动画过渡雾效果距离
     */
    animateFogDistance(from, to, duration) {
        if (typeof scene === 'undefined' || !scene || !scene.fog) return;
        
        const startTime = performance.now();
        const diff = to - from;
        
        const animate = () => {
            const elapsed = performance.now() - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            // 使用缓动函数（easeInOutQuad）
            const eased = progress < 0.5
                ? 2 * progress * progress
                : 1 - Math.pow(-2 * progress + 2, 2) / 2;
            
            scene.fog.far = from + diff * eased;
            
            if (progress < 1) {
                requestAnimationFrame(animate);
            }
        };
        
        animate();
    }
    
    /**
     * 记录画质变化日志
     */
    logQualityChange(oldQuality, newQuality, newPreset) {
        const timestamp = new Date().toLocaleTimeString();
        const fps = this.performanceMonitor ? this.performanceMonitor.getAverageFPS() : 'N/A';
        
        console.log('═══════════════════════════════════════════════════════');
        console.log(`🎨 画质变化 [${timestamp}]`);
        console.log(`   ${oldQuality} (${QUALITY_PRESETS[oldQuality]?.name || '未知'}) → ${newQuality} (${newPreset.name})`);
        console.log(`   当前FPS: ${fps}`);
        console.log(`   自动调整: ${this.autoAdjust ? '启用' : '禁用'}`);
        console.log('   新配置:');
        console.log(`   - 像素比: ${newPreset.pixelRatio.toFixed(2)}`);
        console.log(`   - 阴影贴图: ${newPreset.shadowMapSize}x${newPreset.shadowMapSize}`);
        console.log(`   - 抗锯齿: ${newPreset.antialias ? '启用' : '禁用'}`);
        console.log(`   - 雾距离: ${newPreset.fogDistance}`);
        console.log(`   - LOD距离: [${newPreset.lodDistances.join(', ')}]`);
        console.log(`   - 后处理: ${newPreset.postProcessing ? '启用' : '禁用'}`);
        console.log('═══════════════════════════════════════════════════════');
    }
    
    /**
     * 更新阴影贴图大小
     */
    updateShadowMapSize(size) {
        // 需要访问场景中的光源
        if (typeof scene !== 'undefined' && scene) {
            scene.traverse((object) => {
                if (object.isLight && object.shadow) {
                    object.shadow.mapSize.width = size;
                    object.shadow.mapSize.height = size;
                    object.shadow.map = null; // 强制重新创建阴影贴图
                }
            });
        }
    }
    
    /**
     * 配置级联阴影贴图（CSM）
     * 注意：Three.js 原生不支持 CSM，需要使用第三方库如 three-csm
     * 当前实现为占位符，未来可以集成 CSM 库
     */
    configureCascadedShadowMaps(cascades) {
        // CSM 配置占位符
        // 未来可以集成 three-csm 库实现多级阴影
        console.log(`CSM 配置: ${cascades} 级联（当前未实现）`);
        
        // 基础优化：调整阴影相机的范围
        if (typeof scene !== 'undefined' && scene) {
            scene.traverse((object) => {
                if (object.isDirectionalLight && object.shadow) {
                    // 根据级联数量调整阴影相机范围
                    const range = 20 + (cascades - 1) * 10;
                    object.shadow.camera.left = -range;
                    object.shadow.camera.right = range;
                    object.shadow.camera.top = range;
                    object.shadow.camera.bottom = -range;
                    object.shadow.camera.near = 0.5;
                    object.shadow.camera.far = 100;
                    object.shadow.camera.updateProjectionMatrix();
                }
            });
        }
    }
    
    /**
     * 更新LOD距离配置
     */
    updateLODDistances(distances) {
        // 更新全局LOD配置
        if (typeof LOD_CONFIG !== 'undefined') {
            LOD_CONFIG.normalBlock.high.distance = distances[0];
            LOD_CONFIG.normalBlock.medium.distance = distances[1];
            LOD_CONFIG.normalBlock.low.distance = distances[2];
            
            LOD_CONFIG.tallBlock.high.distance = distances[0];
            LOD_CONFIG.tallBlock.medium.distance = distances[1];
            LOD_CONFIG.tallBlock.low.distance = distances[2];
        }
    }
    
    /**
     * 降低画质
     */
    decreaseQuality() {
        const levels = ['ultra', 'high', 'medium', 'low'];
        const currentIndex = levels.indexOf(this.currentQuality);
        
        if (currentIndex < levels.length - 1) {
            const newLevel = levels[currentIndex + 1];
            console.log(`⬇️ 自动降低画质: ${this.currentQuality} → ${newLevel} (FPS过低)`);
            this.applyQualitySettings(newLevel);
        } else {
            console.warn('⚠️ 已经是最低画质，无法继续降低');
            
            // 检查性能降级失败情况
            this.checkPerformanceDegradationFailure();
        }
    }
    
    /**
     * 检查性能降级失败
     * 当最低画质下仍然低于25 FPS时触发
     */
    checkPerformanceDegradationFailure() {
        if (!this.performanceMonitor) return;
        
        const avgFPS = this.performanceMonitor.getAverageFPS();
        
        // 如果最低画质下仍然低于25 FPS
        if (avgFPS < 25 && this.currentQuality === 'low') {
            console.error('🚨 性能降级失败：最低画质下FPS仍低于25');
            
            // 显示性能警告
            this.showPerformanceWarning(avgFPS);
            
            // 提供极简模式选项
            this.offerMinimalMode();
        }
    }
    
    /**
     * 显示性能警告提示
     * @param {number} currentFPS - 当前FPS
     */
    showPerformanceWarning(currentFPS) {
        // 检查是否在浏览器环境
        if (typeof window === 'undefined' || typeof document === 'undefined') {
            console.warn('⚠️ 设备性能不足，当前FPS:', currentFPS);
            return;
        }
        
        // 检查是否已存在警告
        let warningElement = document.getElementById('performance-warning');
        
        if (!warningElement) {
            // 创建性能警告元素
            warningElement = document.createElement('div');
            warningElement.id = 'performance-warning';
            warningElement.style.cssText = `
                position: fixed;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                background: rgba(0, 0, 0, 0.95);
                backdrop-filter: blur(20px);
                color: white;
                padding: 30px 40px;
                border-radius: 16px;
                font-family: Arial, sans-serif;
                z-index: 10002;
                box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
                max-width: 450px;
                text-align: center;
                border: 2px solid rgba(255, 150, 50, 0.6);
            `;
            
            warningElement.innerHTML = `
                <div style="font-size: 48px; margin-bottom: 15px;">⚡</div>
                <div style="font-size: 20px; font-weight: bold; margin-bottom: 15px; color: #ffaa00;">
                    性能不足警告
                </div>
                <div style="font-size: 14px; color: rgba(255, 255, 255, 0.9); line-height: 1.8; margin-bottom: 20px;">
                    当前设备性能不足以流畅运行游戏<br>
                    (当前FPS: ${currentFPS}，建议: 30+)<br><br>
                    <strong>建议操作：</strong><br>
                    • 关闭其他应用程序<br>
                    • 关闭浏览器其他标签页<br>
                    • 降低屏幕分辨率<br>
                    • 使用性能更好的设备
                </div>
                <div style="display: flex; gap: 10px; justify-content: center;">
                    <button id="enable-minimal-mode" style="
                        padding: 12px 24px;
                        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                        border: none;
                        border-radius: 8px;
                        color: white;
                        font-size: 14px;
                        font-weight: 600;
                        cursor: pointer;
                        transition: all 0.3s;
                        box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
                    ">
                        启用极简模式
                    </button>
                    <button id="close-warning" style="
                        padding: 12px 24px;
                        background: rgba(255, 255, 255, 0.1);
                        border: 1px solid rgba(255, 255, 255, 0.3);
                        border-radius: 8px;
                        color: white;
                        font-size: 14px;
                        font-weight: 600;
                        cursor: pointer;
                        transition: all 0.3s;
                    ">
                        继续游戏
                    </button>
                </div>
            `;
            
            document.body.appendChild(warningElement);
            
            // 绑定按钮事件
            const minimalModeBtn = document.getElementById('enable-minimal-mode');
            const closeBtn = document.getElementById('close-warning');
            
            if (minimalModeBtn) {
                minimalModeBtn.addEventListener('click', () => {
                    this.enableMinimalMode();
                    this.closePerformanceWarning();
                });
                
                // 悬停效果
                minimalModeBtn.addEventListener('mouseenter', () => {
                    minimalModeBtn.style.transform = 'translateY(-2px)';
                    minimalModeBtn.style.boxShadow = '0 6px 16px rgba(102, 126, 234, 0.6)';
                });
                minimalModeBtn.addEventListener('mouseleave', () => {
                    minimalModeBtn.style.transform = 'translateY(0)';
                    minimalModeBtn.style.boxShadow = '0 4px 12px rgba(102, 126, 234, 0.4)';
                });
            }
            
            if (closeBtn) {
                closeBtn.addEventListener('click', () => {
                    this.closePerformanceWarning();
                });
                
                // 悬停效果
                closeBtn.addEventListener('mouseenter', () => {
                    closeBtn.style.background = 'rgba(255, 255, 255, 0.2)';
                });
                closeBtn.addEventListener('mouseleave', () => {
                    closeBtn.style.background = 'rgba(255, 255, 255, 0.1)';
                });
            }
        }
        
        warningElement.style.display = 'block';
        console.warn('⚠️ 性能警告已显示');
    }
    
    /**
     * 关闭性能警告提示
     */
    closePerformanceWarning() {
        const warningElement = document.getElementById('performance-warning');
        if (warningElement) {
            warningElement.style.transition = 'opacity 0.3s';
            warningElement.style.opacity = '0';
            setTimeout(() => {
                if (warningElement.parentNode) {
                    warningElement.parentNode.removeChild(warningElement);
                }
            }, 300);
        }
    }
    
    /**
     * 提供极简模式选项
     * 极简模式配置：
     * - 禁用所有特效
     * - 禁用阴影
     * - 降低分辨率到 0.5x
     * - 减少可见距离到 50 单位
     */
    offerMinimalMode() {
        console.log('💡 提供极简模式选项');
        // 实际的UI已在showPerformanceWarning中创建
    }
    
    /**
     * 启用极简模式
     * 应用最激进的性能优化设置
     */
    enableMinimalMode() {
        console.log('🔧 启用极简模式...');
        
        // 创建极简模式配置
        const minimalPreset = {
            name: '极简',
            shadowMapSize: 512,
            pixelRatio: 0.5, // 降低到0.5x分辨率
            antialias: false,
            fogDistance: 50, // 减少可见距离到50单位
            maxLights: 1,
            postProcessing: false,
            lodDistances: [15, 30, 50] // 更激进的LOD距离
        };
        
        // 禁用阴影
        if (this.renderer.shadowMap) {
            this.renderer.shadowMap.enabled = false;
            console.log('   ✓ 阴影已禁用');
        }
        
        // 应用极简配置
        this.applySettingsImmediate(minimalPreset, 'minimal');
        
        // 禁用后处理
        if (typeof scene !== 'undefined' && scene) {
            // 通过RenderManager禁用后处理
            if (typeof renderManager !== 'undefined' && renderManager) {
                renderManager.setPostProcessing(false);
                console.log('   ✓ 后处理已禁用');
            }
        }
        
        // 更新雾效果距离
        if (typeof scene !== 'undefined' && scene && scene.fog) {
            scene.fog.far = 50;
            console.log('   ✓ 可见距离已减少到50单位');
        }
        
        // 禁用自动画质调整（保持极简模式）
        this.disableAutoAdjust();
        
        console.log('✅ 极简模式已启用');
        console.log('   - 分辨率: 0.5x');
        console.log('   - 阴影: 禁用');
        console.log('   - 后处理: 禁用');
        console.log('   - 可见距离: 50单位');
        
        // 显示成功提示
        if (typeof window !== 'undefined' && typeof document !== 'undefined') {
            const successMsg = document.createElement('div');
            successMsg.style.cssText = `
                position: fixed;
                top: 20px;
                left: 50%;
                transform: translateX(-50%);
                background: rgba(100, 200, 100, 0.95);
                color: white;
                padding: 15px 25px;
                border-radius: 8px;
                font-family: Arial, sans-serif;
                font-size: 14px;
                z-index: 10003;
                box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            `;
            successMsg.textContent = '✅ 极简模式已启用，性能应该会有所改善';
            document.body.appendChild(successMsg);
            
            setTimeout(() => {
                successMsg.style.transition = 'opacity 0.5s';
                successMsg.style.opacity = '0';
                setTimeout(() => {
                    if (successMsg.parentNode) {
                        successMsg.parentNode.removeChild(successMsg);
                    }
                }, 500);
            }, 3000);
        }
    }
    
    /**
     * 提升画质
     */
    increaseQuality() {
        const levels = ['ultra', 'high', 'medium', 'low'];
        const currentIndex = levels.indexOf(this.currentQuality);
        
        if (currentIndex > 0) {
            const newLevel = levels[currentIndex - 1];
            console.log(`⬆️ 自动提升画质: ${this.currentQuality} → ${newLevel} (FPS充足)`);
            this.applyQualitySettings(newLevel);
        } else {
            console.log('✅ 已经是最高画质');
        }
    }
    
    /**
     * 获取当前画质级别
     */
    getCurrentQuality() {
        return this.currentQuality;
    }
    
    /**
     * 获取当前画质预设
     */
    getCurrentPreset() {
        return QUALITY_PRESETS[this.currentQuality];
    }
    
    /**
     * 手动设置画质（禁用自动调整）
     */
    setManualQuality(level) {
        if (!QUALITY_PRESETS[level]) {
            console.error(`无效的画质级别: ${level}`);
            return;
        }
        
        console.log(`👤 手动设置画质: ${level} (自动调整已禁用)`);
        this.autoAdjust = false;
        this.applyQualitySettings(level);
    }
    
    /**
     * 启用自动调整
     */
    enableAutoAdjust() {
        console.log('🤖 启用自动画质调整');
        this.autoAdjust = true;
        this.lastAdjustTime = 0; // 重置冷却时间
    }
    
    /**
     * 禁用自动调整
     */
    disableAutoAdjust() {
        console.log('🚫 禁用自动画质调整');
        this.autoAdjust = false;
    }
    
    /**
     * 检查是否启用了自动调整
     */
    isAutoAdjustEnabled() {
        return this.autoAdjust;
    }
    
    /**
     * 获取设备信息
     */
    getDeviceInfo() {
        return { ...this.deviceInfo };
    }
    
    /**
     * 注册画质变化回调
     */
    onQualityChange(callback) {
        this.onQualityChangeCallbacks.push(callback);
    }
    
    /**
     * 通知画质变化
     */
    notifyQualityChange(oldQuality, newQuality, preset) {
        for (const callback of this.onQualityChangeCallbacks) {
            try {
                callback(oldQuality, newQuality, preset);
            } catch (e) {
                console.error('画质变化回调执行失败:', e);
            }
        }
    }
    
    /**
     * 获取所有可用的画质级别
     */
    getAvailableQualities() {
        return Object.keys(QUALITY_PRESETS);
    }
}


// ============================================================================
// 4. FrustumCuller - 视锥剔除器
// ============================================================================

/**
 * 视锥剔除器 - 判断物体是否在相机视野内
 */
class FrustumCuller {
    constructor(camera) {
        this.camera = camera;
        this.frustum = new THREE.Frustum();
        this.projScreenMatrix = new THREE.Matrix4();
        
        // 剔除统计
        this.stats = {
            total: 0,
            visible: 0,
            culled: 0
        };
    }
    
    /**
     * 更新视锥体（相机移动后调用）
     */
    updateFrustum() {
        this.projScreenMatrix.multiplyMatrices(
            this.camera.projectionMatrix,
            this.camera.matrixWorldInverse
        );
        this.frustum.setFromProjectionMatrix(this.projScreenMatrix);
    }
    
    /**
     * 检查物体是否可见
     */
    isVisible(object) {
        // 距离剔除：超过150单位直接不可见
        const distance = this.camera.position.distanceTo(object.position);
        if (distance > 150) {
            return false;
        }
        
        // 视锥体剔除
        if (!object.geometry || !object.geometry.boundingSphere) {
            return true; // 没有包围球，默认可见
        }
        
        // 计算世界空间包围球
        const sphere = object.geometry.boundingSphere.clone();
        sphere.applyMatrix4(object.matrixWorld);
        
        return this.frustum.intersectsSphere(sphere);
    }
    
    /**
     * 批量检查多个物体
     */
    cullObjects(objects) {
        this.stats.total = objects.length;
        this.stats.visible = 0;
        this.stats.culled = 0;
        
        const visibleObjects = [];
        
        for (const obj of objects) {
            if (this.isVisible(obj)) {
                obj.visible = true;
                visibleObjects.push(obj);
                this.stats.visible++;
            } else {
                obj.visible = false;
                this.stats.culled++;
            }
        }
        
        return visibleObjects;
    }
    
    /**
     * 获取可见物体列表
     */
    getVisibleObjects() {
        return this.cullObjects(noteObjects);
    }
    
    /**
     * 获取剔除统计
     */
    getCullingStats() {
        return { ...this.stats };
    }
}

// ============================================================================
// 5. ObjectPool - 对象池
// ============================================================================

/**
 * 对象池 - 管理音符方块的创建和重用
 */
class ObjectPool {
    constructor(createFn, resetFn, initialSize = 100) {
        this.createFn = createFn;
        this.resetFn = resetFn;
        this.initialSize = initialSize;
        this.maxSize = 1000;
        
        this.available = [];
        this.active = [];
    }
    
    /**
     * 获取一个对象
     */
    acquire() {
        let obj;
        
        if (this.available.length > 0) {
            obj = this.available.pop();
        } else if (this.active.length < this.maxSize) {
            obj = this.createFn();
        } else {
            console.warn('对象池已达到最大容量');
            return null;
        }
        
        this.active.push(obj);
        return obj;
    }
    
    /**
     * 归还对象
     */
    release(object) {
        const index = this.active.indexOf(object);
        if (index > -1) {
            this.active.splice(index, 1);
            this.resetFn(object);
            this.available.push(object);
        }
    }
    
    /**
     * 预热池（创建初始对象）
     */
    warmup(count) {
        const warmupCount = count || this.initialSize;
        console.log(`🔥 预热对象池: ${warmupCount} 个对象`);
        
        for (let i = 0; i < warmupCount; i++) {
            const obj = this.createFn();
            this.resetFn(obj);
            this.available.push(obj);
        }
    }
    
    /**
     * 清空池
     */
    clear() {
        this.available = [];
        this.active = [];
    }
    
    /**
     * 获取池统计
     */
    getStats() {
        return {
            total: this.available.length + this.active.length,
            active: this.active.length,
            available: this.available.length
        };
    }
}


// ============================================================================
// 6. LODManager - 细节层次管理器
// ============================================================================

/**
 * LOD配置 - 定义不同细节级别的距离阈值
 */
const LOD_CONFIG = {
    normalBlock: {
        high: { distance: 30, lodLevel: 'high' },
        medium: { distance: 80, lodLevel: 'medium' },
        low: { distance: 150, lodLevel: 'low' }
    },
    tallBlock: {
        high: { distance: 30, lodLevel: 'high' },
        medium: { distance: 80, lodLevel: 'medium' },
        low: { distance: 150, lodLevel: 'low' }
    }
};

/**
 * LOD管理器 - 根据物体与相机的距离动态调整模型细节
 */
class LODManager {
    constructor(camera) {
        this.camera = camera;
        this.registeredObjects = new Map();
        
        // LOD统计
        this.stats = {
            high: 0,
            medium: 0,
            low: 0
        };
    }
    
    /**
     * 注册需要LOD管理的对象
     */
    registerObject(object, lodLevels) {
        this.registeredObjects.set(object, {
            lodLevels: lodLevels,
            currentLOD: 'high'
        });
    }
    
    /**
     * 注销对象
     */
    unregisterObject(object) {
        this.registeredObjects.delete(object);
    }
    
    /**
     * 更新所有对象的LOD级别
     */
    update() {
        this.stats = { high: 0, medium: 0, low: 0 };
        
        for (const [object, data] of this.registeredObjects) {
            const distanceSq = this.camera.position.distanceToSquared(object.position);
            const lodLevels = data.lodLevels;
            
            let newLOD;
            if (distanceSq < lodLevels.high.distance * lodLevels.high.distance) {
                newLOD = 'high';
            } else if (distanceSq < lodLevels.medium.distance * lodLevels.medium.distance) {
                newLOD = 'medium';
            } else {
                newLOD = 'low';
            }
            
            // 只在LOD级别改变时切换几何体
            if (newLOD !== data.currentLOD) {
                this.setLOD(object, lodLevels[newLOD]);
                data.currentLOD = newLOD;
            }
            
            this.stats[newLOD]++;
        }
    }
    
    /**
     * 设置对象的LOD级别
     */
    setLOD(object, lodConfig) {
        // 通过userData存储LOD级别，由外部系统处理几何体切换
        if (object.userData) {
            object.userData.currentLOD = lodConfig.lodLevel;
            object.userData.needsLODUpdate = true;
        }
    }
    
    /**
     * 获取LOD统计
     */
    getStats() {
        return { ...this.stats };
    }
}

// ============================================================================
// 7. BatchRenderer - 批处理渲染器
// ============================================================================

/**
 * 批处理渲染器 - 将多个相同材质的物体合并为一次渲染调用
 * 使用 InstancedMesh 实现批处理，减少渲染调用次数
 */
class BatchRenderer {
    constructor(scene) {
        this.scene = scene;
        
        // 按材质类型分组的对象列表
        this.batches = new Map(); // materialKey -> objects[]
        
        // InstancedMesh 实例
        this.instancedMeshes = new Map(); // materialKey -> InstancedMesh
        
        // 批处理阈值和限制
        this.batchThreshold = 100; // 超过100个对象时启用批处理
        this.maxInstancesPerBatch = 1000; // 每个批次最多1000个实例
        
        // 批处理启用状态
        this.enabled = false;
        
        // 统计数据
        this.stats = {
            totalBatches: 0,
            totalObjects: 0,
            batchedObjects: 0,
            drawCallsSaved: 0
        };
    }
    
    /**
     * 添加可批处理的对象
     * @param {THREE.Object3D} object - 要添加的对象
     * @param {string} materialKey - 材质标识符（用于分组）
     */
    addBatchable(object, materialKey) {
        if (!this.batches.has(materialKey)) {
            this.batches.set(materialKey, []);
        }
        
        const batch = this.batches.get(materialKey);
        
        // 检查是否超过最大实例数
        if (batch.length >= this.maxInstancesPerBatch) {
            console.warn(`批次 ${materialKey} 已达到最大实例数 ${this.maxInstancesPerBatch}`);
            return false;
        }
        
        batch.push(object);
        
        // 标记对象为批处理对象
        object.userData.batched = true;
        object.userData.batchKey = materialKey;
        object.userData.batchIndex = batch.length - 1;
        
        return true;
    }
    
    /**
     * 移除对象
     * @param {THREE.Object3D} object - 要移除的对象
     * @param {string} materialKey - 材质标识符
     */
    removeBatchable(object, materialKey) {
        if (!this.batches.has(materialKey)) return;
        
        const batch = this.batches.get(materialKey);
        const index = batch.indexOf(object);
        
        if (index > -1) {
            batch.splice(index, 1);
            
            // 更新后续对象的索引
            for (let i = index; i < batch.length; i++) {
                batch[i].userData.batchIndex = i;
            }
            
            // 清除对象的批处理标记
            object.userData.batched = false;
            delete object.userData.batchKey;
            delete object.userData.batchIndex;
        }
    }
    
    /**
     * 创建 InstancedMesh
     * @param {string} materialKey - 材质标识符
     * @param {THREE.BufferGeometry} geometry - 几何体
     * @param {THREE.Material} material - 材质
     * @param {number} count - 实例数量
     */
    createInstancedMesh(materialKey, geometry, material, count) {
        // 如果已存在，先销毁
        if (this.instancedMeshes.has(materialKey)) {
            this.destroyInstancedMesh(materialKey);
        }
        
        // 创建 InstancedMesh
        const instancedMesh = new THREE.InstancedMesh(geometry, material, count);
        instancedMesh.castShadow = true;
        instancedMesh.receiveShadow = false;
        
        // 添加到场景
        this.scene.add(instancedMesh);
        this.instancedMeshes.set(materialKey, instancedMesh);
        
        return instancedMesh;
    }
    
    /**
     * 销毁 InstancedMesh
     * @param {string} materialKey - 材质标识符
     */
    destroyInstancedMesh(materialKey) {
        if (!this.instancedMeshes.has(materialKey)) return;
        
        const instancedMesh = this.instancedMeshes.get(materialKey);
        this.scene.remove(instancedMesh);
        instancedMesh.dispose();
        this.instancedMeshes.delete(materialKey);
    }
    
    /**
     * 更新批次（在渲染前调用）
     * 动态更新实例矩阵和颜色
     */
    updateBatches() {
        if (!this.enabled) return;
        
        this.stats.totalBatches = 0;
        this.stats.totalObjects = 0;
        this.stats.batchedObjects = 0;
        this.stats.drawCallsSaved = 0;
        
        const matrix = new THREE.Matrix4();
        const color = new THREE.Color();
        
        for (const [materialKey, batch] of this.batches) {
            this.stats.totalObjects += batch.length;
            
            // 只对超过阈值的批次启用批处理
            if (batch.length < this.batchThreshold) {
                // 禁用批处理，使用普通渲染
                if (this.instancedMeshes.has(materialKey)) {
                    this.destroyInstancedMesh(materialKey);
                }
                continue;
            }
            
            this.stats.totalBatches++;
            this.stats.batchedObjects += batch.length;
            this.stats.drawCallsSaved += batch.length - 1; // 节省的渲染调用次数
            
            // 获取或创建 InstancedMesh
            let instancedMesh = this.instancedMeshes.get(materialKey);
            
            // 统计可见对象数量
            const visibleObjects = batch.filter(obj => obj.visible);
            const visibleCount = visibleObjects.length;
            
            if (visibleCount === 0) {
                // 没有可见对象，隐藏 InstancedMesh
                if (instancedMesh) {
                    instancedMesh.visible = false;
                }
                continue;
            }
            
            // 如果 InstancedMesh 不存在或实例数不匹配，重新创建
            if (!instancedMesh || instancedMesh.count !== batch.length) {
                const firstObject = batch[0];
                instancedMesh = this.createInstancedMesh(
                    materialKey,
                    firstObject.geometry,
                    firstObject.material,
                    batch.length
                );
            }
            
            instancedMesh.visible = true;
            
            // 更新每个实例的矩阵和颜色
            let visibleIndex = 0;
            for (let i = 0; i < batch.length; i++) {
                const object = batch[i];
                
                if (!object.visible) {
                    // 不可见的对象，将其移到远处（不渲染）
                    matrix.makeTranslation(0, -10000, 0);
                    instancedMesh.setMatrixAt(i, matrix);
                    continue;
                }
                
                // 更新位置、旋转、缩放
                object.updateMatrixWorld();
                instancedMesh.setMatrixAt(i, object.matrixWorld);
                
                // 更新颜色（如果材质支持）
                if (object.material && object.material.color) {
                    color.copy(object.material.color);
                    instancedMesh.setColorAt(i, color);
                }
                
                visibleIndex++;
            }
            
            // 标记需要更新
            instancedMesh.instanceMatrix.needsUpdate = true;
            if (instancedMesh.instanceColor) {
                instancedMesh.instanceColor.needsUpdate = true;
            }
            
            // 隐藏原始对象（避免重复渲染）
            for (const object of batch) {
                object.visible = false;
            }
        }
    }
    
    /**
     * 启用批处理
     */
    enable() {
        this.enabled = true;
        console.log('🎨 批处理渲染已启用');
    }
    
    /**
     * 禁用批处理
     */
    disable() {
        this.enabled = false;
        
        // 销毁所有 InstancedMesh
        for (const materialKey of this.instancedMeshes.keys()) {
            this.destroyInstancedMesh(materialKey);
        }
        
        // 恢复原始对象的可见性
        for (const batch of this.batches.values()) {
            for (const object of batch) {
                object.visible = true;
            }
        }
        
        console.log('🎨 批处理渲染已禁用');
    }
    
    /**
     * 清空所有批次
     */
    clear() {
        this.disable();
        this.batches.clear();
        this.instancedMeshes.clear();
    }
    
    /**
     * 获取批处理统计
     */
    getStats() {
        return { ...this.stats };
    }
    
    /**
     * 检查是否启用批处理
     */
    isEnabled() {
        return this.enabled;
    }
}

// ============================================================================
// 8. MemoryManager - 内存管理器
// ============================================================================

/**
 * 内存管理器 - 管理资源清理和内存优化
 */
class MemoryManager {
    constructor(scene, renderer, performanceMonitor) {
        this.scene = scene;
        this.renderer = renderer;
        this.performanceMonitor = performanceMonitor;
        
        // 资源跟踪
        this.trackedObjects = new Set();
        this.disposedObjects = new Set();
        
        // 清理配置
        this.config = {
            distanceThreshold: 200, // 超过200单位的对象将被清理
            checkInterval: 5000, // 每5秒检查一次内存
            autoCleanup: true
        };
        
        // 上次检查时间
        this.lastCheckTime = 0;
        
        // 清理统计
        this.stats = {
            totalCleaned: 0,
            geometriesCleaned: 0,
            texturesCleaned: 0,
            lastCleanupTime: 0,
            emergencyCleanups: 0
        };
        
        // 内存溢出保护
        this.overflowProtection = {
            enabled: true,
            threshold: 0.8, // 80%阈值
            lastEmergencyCleanup: 0,
            emergencyCooldown: 10000, // 10秒冷却时间
            warningShown: false
        };
        
        // 质量适配器引用（用于降低画质）
        this.qualityAdapter = null;
        
        // 对象池引用（用于减少池大小）
        this.objectPool = null;
    }
    
    /**
     * 跟踪对象（用于后续清理）
     */
    trackObject(object) {
        this.trackedObjects.add(object);
    }
    
    /**
     * 取消跟踪对象
     */
    untrackObject(object) {
        this.trackedObjects.delete(object);
    }
    
    /**
     * 定期检查内存使用情况
     * 根据配置的间隔自动调用
     */
    checkMemoryUsage(camera) {
        const now = performance.now();
        
        // 检查是否到达检查间隔
        if (now - this.lastCheckTime < this.config.checkInterval) {
            return null;
        }
        
        this.lastCheckTime = now;
        
        // 获取内存使用情况
        const memorySummary = this.performanceMonitor.getMemorySummary();
        
        // 检查是否需要触发内存溢出保护
        const overflowCheck = this.checkMemoryOverflow(memorySummary, camera);
        if (overflowCheck.triggered) {
            return overflowCheck;
        }
        
        // 如果有内存警告且启用了自动清理
        if (memorySummary.hasWarnings && this.config.autoCleanup) {
            console.warn('⚠️ 内存使用超过阈值，开始清理...');
            console.warn('内存警告:', memorySummary.warnings);
            
            // 执行清理
            const cleanupResult = this.cleanupDistantObjects(camera);
            
            console.log('🧹 清理完成:', cleanupResult);
            
            return {
                triggered: true,
                reason: 'memory_threshold',
                memorySummary: memorySummary,
                cleanupResult: cleanupResult
            };
        }
        
        return {
            triggered: false,
            memorySummary: memorySummary
        };
    }
    
    /**
     * 检查内存溢出并触发紧急保护措施
     * 当内存超过80%时触发
     */
    checkMemoryOverflow(memorySummary, camera) {
        if (!this.overflowProtection.enabled) {
            return { triggered: false };
        }
        
        const memory = memorySummary.current;
        const thresholds = memorySummary.thresholds;
        
        // 计算内存使用率
        const geometryUsage = memory.geometries / thresholds.geometries;
        const textureUsage = memory.textures / thresholds.textures;
        const maxUsage = Math.max(geometryUsage, textureUsage);
        
        // 检查是否超过80%阈值
        if (maxUsage >= this.overflowProtection.threshold) {
            const now = performance.now();
            
            // 检查冷却时间
            if (now - this.overflowProtection.lastEmergencyCleanup < this.overflowProtection.emergencyCooldown) {
                return { triggered: false, reason: 'cooldown' };
            }
            
            console.error('🚨 内存溢出警告！内存使用率: ' + (maxUsage * 100).toFixed(1) + '%');
            console.error('当前内存:', memory);
            console.error('阈值:', thresholds);
            
            // 触发紧急清理
            const result = this.triggerEmergencyCleanup(camera);
            
            this.overflowProtection.lastEmergencyCleanup = now;
            this.stats.emergencyCleanups++;
            
            return {
                triggered: true,
                reason: 'memory_overflow',
                usage: maxUsage,
                memorySummary: memorySummary,
                emergencyResult: result
            };
        }
        
        return { triggered: false };
    }
    
    /**
     * 触发紧急清理措施
     * 1. 清理远距离对象
     * 2. 自动降低画质级别
     * 3. 减少对象池大小
     * 4. 显示内存警告提示
     */
    triggerEmergencyCleanup(camera) {
        console.log('🚨 执行紧急内存清理...');
        
        const result = {
            distantObjectsCleaned: 0,
            qualityReduced: false,
            poolReduced: false,
            warningShown: false
        };
        
        // 1. 清理远距离对象
        const cleanupResult = this.cleanupDistantObjects(camera);
        result.distantObjectsCleaned = cleanupResult.cleaned;
        console.log(`   ✓ 清理远距离对象: ${cleanupResult.cleaned} 个`);
        
        // 2. 自动降低画质级别
        if (this.qualityAdapter) {
            const currentQuality = this.qualityAdapter.getCurrentQuality();
            const levels = ['ultra', 'high', 'medium', 'low'];
            const currentIndex = levels.indexOf(currentQuality);
            
            if (currentIndex < levels.length - 1) {
                const newLevel = levels[currentIndex + 1];
                console.log(`   ✓ 降低画质: ${currentQuality} → ${newLevel}`);
                this.qualityAdapter.setManualQuality(newLevel);
                result.qualityReduced = true;
                
                // 短暂禁用自动调整，避免立即恢复
                setTimeout(() => {
                    if (this.qualityAdapter) {
                        this.qualityAdapter.enableAutoAdjust();
                    }
                }, 30000); // 30秒后重新启用自动调整
            }
        }
        
        // 3. 减少对象池大小
        if (this.objectPool) {
            const poolStats = this.objectPool.getStats();
            const availableCount = poolStats.available;
            
            if (availableCount > 50) {
                // 清理一半的可用对象
                const toRemove = Math.floor(availableCount / 2);
                
                for (let i = 0; i < toRemove; i++) {
                    const obj = this.objectPool.available.pop();
                    if (obj) {
                        this.disposeObject(obj);
                    }
                }
                
                console.log(`   ✓ 减少对象池: 移除 ${toRemove} 个可用对象`);
                result.poolReduced = true;
            }
        }
        
        // 4. 显示内存警告提示
        if (!this.overflowProtection.warningShown) {
            this.showMemoryWarning();
            result.warningShown = true;
            this.overflowProtection.warningShown = true;
            
            // 30秒后允许再次显示警告
            setTimeout(() => {
                this.overflowProtection.warningShown = false;
            }, 30000);
        }
        
        console.log('✅ 紧急清理完成:', result);
        
        return result;
    }
    
    /**
     * 显示内存警告提示
     */
    showMemoryWarning() {
        // 检查是否在浏览器环境
        if (typeof window === 'undefined' || typeof document === 'undefined') {
            console.warn('⚠️ 内存不足！建议关闭其他应用或降低画质设置。');
            return;
        }
        
        // 创建警告提示元素
        const warning = document.createElement('div');
        warning.id = 'memory-warning';
        warning.style.cssText = `
            position: fixed;
            top: 20px;
            left: 50%;
            transform: translateX(-50%);
            background: rgba(255, 100, 100, 0.95);
            color: white;
            padding: 15px 25px;
            border-radius: 8px;
            font-family: Arial, sans-serif;
            font-size: 14px;
            z-index: 10000;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            max-width: 400px;
            text-align: center;
        `;
        
        warning.innerHTML = `
            <strong>⚠️ 内存不足警告</strong><br>
            <span style="font-size: 12px;">
                系统已自动降低画质以优化性能。<br>
                建议关闭其他应用以获得更好的体验。
            </span>
        `;
        
        document.body.appendChild(warning);
        
        // 5秒后自动隐藏
        setTimeout(() => {
            if (warning.parentNode) {
                warning.style.transition = 'opacity 0.5s';
                warning.style.opacity = '0';
                setTimeout(() => {
                    if (warning.parentNode) {
                        warning.parentNode.removeChild(warning);
                    }
                }, 500);
            }
        }, 5000);
        
        console.warn('⚠️ 内存警告提示已显示');
    }
    
    /**
     * 设置质量适配器引用
     */
    setQualityAdapter(adapter) {
        this.qualityAdapter = adapter;
    }
    
    /**
     * 设置对象池引用
     */
    setObjectPool(pool) {
        this.objectPool = pool;
    }
    
    /**
     * 启用内存溢出保护
     */
    enableOverflowProtection() {
        this.overflowProtection.enabled = true;
        console.log('✅ 内存溢出保护已启用');
    }
    
    /**
     * 禁用内存溢出保护
     */
    disableOverflowProtection() {
        this.overflowProtection.enabled = false;
        console.log('🚫 内存溢出保护已禁用');
    }
    
    /**
     * 设置内存溢出阈值
     */
    setOverflowThreshold(threshold) {
        this.overflowProtection.threshold = Math.max(0.5, Math.min(1.0, threshold));
        console.log('⚙️ 内存溢出阈值已设置为:', (this.overflowProtection.threshold * 100).toFixed(0) + '%');
    }
    
    /**
     * 清理远距离对象（超过200单位）
     * @param {THREE.Camera} camera - 相机对象
     * @returns {Object} 清理结果统计
     */
    cleanupDistantObjects(camera) {
        if (!camera) {
            console.warn('⚠️ 无法清理：相机对象未提供');
            return { cleaned: 0 };
        }
        
        const distanceThreshold = this.config.distanceThreshold;
        const objectsToClean = [];
        
        // 查找需要清理的对象
        for (const object of this.trackedObjects) {
            if (!object.position) continue;
            
            const distance = camera.position.distanceTo(object.position);
            
            if (distance > distanceThreshold) {
                objectsToClean.push(object);
            }
        }
        
        // 执行清理
        let cleaned = 0;
        for (const object of objectsToClean) {
            if (this.disposeObject(object)) {
                cleaned++;
            }
        }
        
        this.stats.totalCleaned += cleaned;
        this.stats.lastCleanupTime = performance.now();
        
        return {
            cleaned: cleaned,
            distanceThreshold: distanceThreshold,
            totalTracked: this.trackedObjects.size
        };
    }
    
    /**
     * 清理所有未使用的资源（场景切换时调用）
     * @returns {Object} 清理结果统计
     */
    cleanupUnusedResources() {
        console.log('🧹 开始清理所有未使用的资源...');
        
        const beforeMemory = this.performanceMonitor.getMemoryUsage();
        
        // 清理所有跟踪的对象
        const objectsToClean = Array.from(this.trackedObjects);
        let cleaned = 0;
        
        for (const object of objectsToClean) {
            if (this.disposeObject(object)) {
                cleaned++;
            }
        }
        
        // 强制渲染器清理
        this.renderer.renderLists.dispose();
        
        // 等待一帧后获取清理后的内存
        setTimeout(() => {
            const afterMemory = this.performanceMonitor.getMemoryUsage();
            
            console.log('✅ 资源清理完成:');
            console.log(`   - 清理对象数: ${cleaned}`);
            console.log(`   - 几何体: ${beforeMemory.geometries} → ${afterMemory.geometries}`);
            console.log(`   - 纹理: ${beforeMemory.textures} → ${afterMemory.textures}`);
        }, 100);
        
        this.stats.totalCleaned += cleaned;
        this.stats.lastCleanupTime = performance.now();
        
        return {
            cleaned: cleaned,
            beforeMemory: beforeMemory
        };
    }
    
    /**
     * 正确释放对象的GPU内存
     * @param {THREE.Object3D} object - 要释放的对象
     * @returns {boolean} 是否成功释放
     */
    disposeObject(object) {
        if (!object || this.disposedObjects.has(object)) {
            return false;
        }
        
        try {
            // 标记为已释放
            this.disposedObjects.add(object);
            this.trackedObjects.delete(object);
            
            // 从场景中移除
            if (object.parent) {
                object.parent.remove(object);
            }
            
            // 释放几何体
            if (object.geometry) {
                object.geometry.dispose();
                this.stats.geometriesCleaned++;
            }
            
            // 释放材质
            if (object.material) {
                if (Array.isArray(object.material)) {
                    // 多材质
                    for (const material of object.material) {
                        this.disposeMaterial(material);
                    }
                } else {
                    // 单材质
                    this.disposeMaterial(object.material);
                }
            }
            
            // 释放纹理
            if (object.texture) {
                object.texture.dispose();
                this.stats.texturesCleaned++;
            }
            
            // 递归释放子对象
            if (object.children && object.children.length > 0) {
                const children = [...object.children]; // 复制数组避免修改问题
                for (const child of children) {
                    this.disposeObject(child);
                }
            }
            
            return true;
        } catch (error) {
            console.error('❌ 释放对象失败:', error);
            return false;
        }
    }
    
    /**
     * 释放材质资源
     * @param {THREE.Material} material - 要释放的材质
     */
    disposeMaterial(material) {
        if (!material) return;
        
        // 释放材质中的纹理
        const textureProperties = ['map', 'lightMap', 'bumpMap', 'normalMap', 'specularMap', 
                                   'envMap', 'alphaMap', 'aoMap', 'displacementMap', 
                                   'emissiveMap', 'gradientMap', 'metalnessMap', 'roughnessMap'];
        
        for (const prop of textureProperties) {
            if (material[prop] && material[prop].dispose) {
                material[prop].dispose();
                this.stats.texturesCleaned++;
            }
        }
        
        // 释放材质本身
        material.dispose();
    }
    
    /**
     * 获取清理统计
     */
    getStats() {
        return { ...this.stats };
    }
    
    /**
     * 设置配置
     */
    setConfig(config) {
        if (config.distanceThreshold !== undefined) {
            this.config.distanceThreshold = config.distanceThreshold;
        }
        if (config.checkInterval !== undefined) {
            this.config.checkInterval = config.checkInterval;
        }
        if (config.autoCleanup !== undefined) {
            this.config.autoCleanup = config.autoCleanup;
        }
        
        console.log('⚙️ 内存管理器配置已更新:', this.config);
    }
    
    /**
     * 启用自动清理
     */
    enableAutoCleanup() {
        this.config.autoCleanup = true;
        console.log('✅ 自动内存清理已启用');
    }
    
    /**
     * 禁用自动清理
     */
    disableAutoCleanup() {
        this.config.autoCleanup = false;
        console.log('🚫 自动内存清理已禁用');
    }
    
    /**
     * 重置统计
     */
    resetStats() {
        this.stats = {
            totalCleaned: 0,
            geometriesCleaned: 0,
            texturesCleaned: 0,
            lastCleanupTime: 0
        };
    }
}

// ============================================================================
// 9. PostProcessing - 后处理管理器
// ============================================================================

/**
 * 后处理管理器 - 管理后处理效果的启用和配置
 */
class PostProcessing {
    constructor(renderer, scene, camera) {
        this.renderer = renderer;
        this.scene = scene;
        this.camera = camera;
        
        this.enabled = false;
        this.composer = null;
        this.renderPass = null;
        this.bloomPass = null;
        this.ssaoPass = null;
        
        // 效果强度配置
        this.effectIntensity = {
            bloom: 0.5,
            ssao: 0.3
        };
        
        // 画质级别（用于决定是否启用SSAO）
        this.qualityLevel = 'high';
        
        // 性能监控器引用（用于自动禁用SSAO）
        this.performanceMonitor = null;
    }
    
    /**
     * 初始化后处理管线
     * 创建 EffectComposer 和渲染目标
     */
    initialize() {
        console.log('🎨 初始化后处理系统...');
        
        // 检查Three.js后处理库是否可用
        if (typeof THREE.EffectComposer === 'undefined') {
            console.warn('⚠️ Three.js 后处理库未加载，后处理功能将不可用');
            console.warn('请在HTML中添加: <script src="https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/postprocessing/EffectComposer.js"></script>');
            return false;
        }
        
        try {
            // 创建渲染目标
            const renderTarget = new THREE.WebGLRenderTarget(
                window.innerWidth,
                window.innerHeight,
                {
                    minFilter: THREE.LinearFilter,
                    magFilter: THREE.LinearFilter,
                    format: THREE.RGBAFormat,
                    stencilBuffer: false
                }
            );
            
            // 创建 EffectComposer
            this.composer = new THREE.EffectComposer(this.renderer, renderTarget);
            this.composer.setSize(window.innerWidth, window.innerHeight);
            
            // 添加基础渲染通道
            this.renderPass = new THREE.RenderPass(this.scene, this.camera);
            this.composer.addPass(this.renderPass);
            
            console.log('✅ 后处理系统初始化完成');
            return true;
        } catch (error) {
            console.error('❌ 后处理系统初始化失败:', error);
            return false;
        }
    }
    
    /**
     * 添加泛光效果
     * 配置参数：强度0.5、阈值0.8、半径0.4
     */
    addBloomEffect() {
        if (!this.composer || typeof THREE.UnrealBloomPass === 'undefined') {
            console.warn('⚠️ UnrealBloomPass 不可用');
            return false;
        }
        
        try {
            // 创建泛光通道
            const bloomParams = {
                strength: this.effectIntensity.bloom,  // 强度
                threshold: 0.8,  // 阈值（只有亮度超过此值的像素才会发光）
                radius: 0.4      // 半径
            };
            
            this.bloomPass = new THREE.UnrealBloomPass(
                new THREE.Vector2(window.innerWidth, window.innerHeight),
                bloomParams.strength,
                bloomParams.radius,
                bloomParams.threshold
            );
            
            this.composer.addPass(this.bloomPass);
            
            console.log('✨ 泛光效果已添加:', bloomParams);
            return true;
        } catch (error) {
            console.error('❌ 添加泛光效果失败:', error);
            return false;
        }
    }
    
    /**
     * 添加环境光遮蔽效果（SSAO）
     * 配置参数：半径0.5、强度0.3
     * 仅在 high/ultra 画质启用
     */
    addSSAOEffect() {
        if (!this.composer || typeof THREE.SSAOPass === 'undefined') {
            console.warn('⚠️ SSAOPass 不可用');
            return false;
        }
        
        // 只在 high/ultra 画质启用
        if (this.qualityLevel !== 'high' && this.qualityLevel !== 'ultra') {
            console.log('📊 当前画质级别不支持SSAO:', this.qualityLevel);
            return false;
        }
        
        try {
            // 创建SSAO通道
            this.ssaoPass = new THREE.SSAOPass(
                this.scene,
                this.camera,
                window.innerWidth,
                window.innerHeight
            );
            
            // 配置SSAO参数
            this.ssaoPass.kernelRadius = 0.5;  // 半径
            this.ssaoPass.minDistance = 0.001;
            this.ssaoPass.maxDistance = 0.1;
            this.ssaoPass.output = THREE.SSAOPass.OUTPUT.Default;
            
            // 设置强度（通过修改SSAO的输出强度）
            if (this.ssaoPass.ssaoMaterial) {
                this.ssaoPass.ssaoMaterial.uniforms['intensity'] = { value: this.effectIntensity.ssao };
            }
            
            this.composer.addPass(this.ssaoPass);
            
            console.log('🌫️ SSAO效果已添加: 半径=0.5, 强度=0.3');
            return true;
        } catch (error) {
            console.error('❌ 添加SSAO效果失败:', error);
            return false;
        }
    }
    
    /**
     * 移除SSAO效果
     */
    removeSSAOEffect() {
        if (!this.composer || !this.ssaoPass) return;
        
        try {
            // 从composer中移除pass
            const index = this.composer.passes.indexOf(this.ssaoPass);
            if (index > -1) {
                this.composer.passes.splice(index, 1);
            }
            
            // 清理资源
            if (this.ssaoPass.dispose) {
                this.ssaoPass.dispose();
            }
            
            this.ssaoPass = null;
            console.log('🗑️ SSAO效果已移除');
        } catch (error) {
            console.error('❌ 移除SSAO效果失败:', error);
        }
    }
    
    /**
     * 启用/禁用后处理效果
     * @param {boolean} enabled - 是否启用
     */
    setEnabled(enabled) {
        const wasEnabled = this.enabled;
        this.enabled = enabled;
        
        if (enabled && !wasEnabled) {
            console.log('✅ 后处理效果已启用');
        } else if (!enabled && wasEnabled) {
            console.log('🚫 后处理效果已禁用');
        }
    }
    
    /**
     * 设置画质级别
     * 用于决定是否启用SSAO
     * @param {string} level - 画质级别 ('low' | 'medium' | 'high' | 'ultra')
     */
    setQualityLevel(level) {
        const oldLevel = this.qualityLevel;
        this.qualityLevel = level;
        
        // 如果画质级别变化，重新评估SSAO
        if (oldLevel !== level) {
            this.updateSSAOBasedOnQuality();
        }
    }
    
    /**
     * 根据画质级别更新SSAO
     */
    updateSSAOBasedOnQuality() {
        const shouldEnableSSAO = (this.qualityLevel === 'high' || this.qualityLevel === 'ultra');
        
        if (shouldEnableSSAO && !this.ssaoPass) {
            // 需要启用SSAO但当前未启用
            this.addSSAOEffect();
        } else if (!shouldEnableSSAO && this.ssaoPass) {
            // 不需要SSAO但当前已启用
            this.removeSSAOEffect();
        }
    }
    
    /**
     * 设置性能监控器引用
     * 用于监控FPS并自动禁用SSAO
     * @param {PerformanceMonitor} monitor - 性能监控器实例
     */
    setPerformanceMonitor(monitor) {
        this.performanceMonitor = monitor;
    }
    
    /**
     * 检查性能并自动调整SSAO
     * 如果FPS < 45，自动禁用SSAO
     */
    checkPerformanceAndAdjust() {
        if (!this.performanceMonitor || !this.ssaoPass) return;
        
        const avgFPS = this.performanceMonitor.getAverageFPS();
        
        // 如果FPS低于45，禁用SSAO
        if (avgFPS < 45) {
            console.warn('⚠️ FPS过低 (' + avgFPS + ')，自动禁用SSAO以提升性能');
            this.removeSSAOEffect();
        }
    }
    
    /**
     * 调整效果强度
     * @param {string} effectName - 效果名称 ('bloom' | 'ssao')
     * @param {number} intensity - 强度值 (0.0 - 1.0)
     */
    setIntensity(effectName, intensity) {
        intensity = Math.max(0, Math.min(1, intensity)); // 限制在0-1范围
        
        if (effectName === 'bloom' && this.bloomPass) {
            this.effectIntensity.bloom = intensity;
            this.bloomPass.strength = intensity;
            console.log('✨ 泛光强度已调整:', intensity);
        } else if (effectName === 'ssao' && this.ssaoPass) {
            this.effectIntensity.ssao = intensity;
            if (this.ssaoPass.ssaoMaterial && this.ssaoPass.ssaoMaterial.uniforms['intensity']) {
                this.ssaoPass.ssaoMaterial.uniforms['intensity'].value = intensity;
            }
            console.log('🌫️ SSAO强度已调整:', intensity);
        }
    }
    
    /**
     * 获取效果强度
     * @param {string} effectName - 效果名称 ('bloom' | 'ssao')
     * @returns {number} 强度值
     */
    getIntensity(effectName) {
        return this.effectIntensity[effectName] || 0;
    }
    
    /**
     * 渲染场景（替代直接渲染）
     */
    render() {
        if (this.enabled && this.composer) {
            // 使用后处理渲染
            this.composer.render();
        } else {
            // 直接渲染
            this.renderer.render(this.scene, this.camera);
        }
    }
    
    /**
     * 窗口大小调整时更新渲染目标
     */
    onWindowResize() {
        if (!this.composer) return;
        
        const width = window.innerWidth;
        const height = window.innerHeight;
        
        this.composer.setSize(width, height);
        
        // 更新泛光效果的分辨率
        if (this.bloomPass) {
            this.bloomPass.resolution.set(width, height);
        }
        
        // 更新SSAO效果的分辨率
        if (this.ssaoPass) {
            this.ssaoPass.setSize(width, height);
        }
    }
    
    /**
     * 清理资源
     */
    dispose() {
        if (this.composer) {
            this.composer.dispose();
            this.composer = null;
        }
        
        if (this.bloomPass) {
            this.bloomPass = null;
        }
        
        if (this.ssaoPass && this.ssaoPass.dispose) {
            this.ssaoPass.dispose();
            this.ssaoPass = null;
        }
        
        console.log('🗑️ 后处理系统资源已清理');
    }
}

// 导出类（如果使用模块系统）
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        RenderManager,
        PerformanceMonitor,
        QualityAdapter,
        FrustumCuller,
        ObjectPool,
        LODManager,
        BatchRenderer,
        MemoryManager,
        PostProcessing,
        QUALITY_PRESETS,
        LOD_CONFIG
    };
}

// 全局导出（用于浏览器环境）
if (typeof window !== 'undefined') {
    window.LOD_CONFIG = LOD_CONFIG;
}

console.log('✅ 渲染系统模块加载完成');
