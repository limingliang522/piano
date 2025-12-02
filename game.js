// Three.js 场景设置
let scene, camera, renderer;
let player, ground = [];
let gameRunning = false;
let score = 0;
let currentLane = 2;
let targetLane = 2;

// 渲染系统管理器
let renderManager = null;

// 对象池
let noteBlockPool = null;

// LOD配置将从render-system.js的全局变量中获取
// 不需要在这里重新声明

// MIDI 音乐系统
let midiParser = null;
let audioEngine = null;
let midiNotes = [];
let noteObjects = [];
let triggerLine = null;
let gameStartTime = 0;
let gamePausedTime = 0; // 游戏暂停时的时间点
let totalPausedDuration = 0; // 累计暂停的总时长
let notesTriggered = 0;
let totalNotes = 0;
let collisions = 0;
let midiSpeed = 0.15; // MIDI模式的当前速度（仅用于显示，实际计算使用 originalBaseSpeed * speedMultiplier）
let originalBaseSpeed = 0.15; // 原始基础速度（永远不变，作为速度计算的基准）
let speedMultiplier = 1.0; // 速度倍数（音频和黑块共用的唯一加速度源）
let speedIncreaseRate = 0.000005; // 每帧速度增长率（更缓慢）
let isCompletingRound = false; // 防止重复触发完成
let lastCollisionBlock = null; // 记录最后碰撞的黑块
let blocksCreated = false; // 防止重复创建方块

// MIDI文件列表
let midiFiles = [];
let currentMidiIndex = 0;
let currentMidiName = '';
let preloadedMidiData = []; // 预加载的MIDI数据
const PRELOAD_COUNT = 5; // 预加载5个

// 跳跃状态
let isJumping = false;
let verticalVelocity = 0;
let jumpQueue = []; // 跳跃队列，存储待执行的跳跃
const gravity = -0.012; // 重力加速度（减小重力，增加漂浮时间）
const groundY = 0.25; // 小球的地面高度
// 超高黑块：底部0，顶部3.0，球半径0.25
// 让球中心跳到2.6（球顶部到2.85，低于超高黑块顶部3.0）
const maxJumpHeight = 2.35; // 最大跳跃高度（从地面算起）
// 计算初始跳跃速度：使用 v² = 2gh
const jumpForce = Math.sqrt(2 * Math.abs(gravity) * maxJumpHeight);

// UI 元素
const scoreElement = document.getElementById('score');
const distanceElement = document.getElementById('distance');
const fpsElement = document.getElementById('fps');
const comboElement = document.getElementById('combo');
const accuracyElement = document.getElementById('accuracy');
const gameOverElement = document.getElementById('gameOver');
const restartButton = document.getElementById('restart');
const loadingElement = document.getElementById('loading');
const loadingPercentage = document.getElementById('loadingPercentage');
const loadingProgressBar = document.getElementById('loadingProgressBar');
const loadingText = document.getElementById('loadingText');
const loadingTips = document.getElementById('loadingTips');
const instructionsElement = document.getElementById('instructions');

// 加载进度管理
const loadingManager = {
    total: 0,
    loaded: 0,
    percentage: 0,
    tips: [
        '💡 点击屏幕跳跃，左右滑动切换轨道',
        '🎵 每首歌曲都有独特的节奏挑战',
        '🎹 使用真实钢琴音色，享受极致音质',
        '🎮 支持键盘操作：方向键移动，空格跳跃',
        '🌟 超高黑块需要跳跃躲避',
        '🎯 准确触发音符可以获得更高分数',
        '🔊 可以在设置中调整音量'
    ],
    currentTipIndex: 0,
    
    init(totalItems) {
        this.total = totalItems;
        this.loaded = 0;
        this.percentage = 0;
        this.currentTipIndex = 0;
        this.updateUI();
        this.startTipRotation();
    },
    
    increment(message = '') {
        this.loaded++;
        this.percentage = Math.round((this.loaded / this.total) * 100);
        this.updateUI(message);
    },
    
    updateUI(message = '') {
        if (loadingPercentage) {
            loadingPercentage.textContent = `${this.percentage}%`;
        }
        if (loadingProgressBar) {
            loadingProgressBar.style.width = `${this.percentage}%`;
        }
        // 不显示加载文字
    },
    
    startTipRotation() {
        // 每3秒切换一个提示
        this.tipInterval = setInterval(() => {
            if (this.percentage >= 100) {
                clearInterval(this.tipInterval);
                return;
            }
            this.currentTipIndex = (this.currentTipIndex + 1) % this.tips.length;
            if (loadingTips) {
                loadingTips.style.opacity = '0';
                setTimeout(() => {
                    loadingTips.textContent = this.tips[this.currentTipIndex];
                    loadingTips.style.opacity = '1';
                }, 300);
            }
        }, 3000);
    },
    
    complete() {
        this.percentage = 100;
        this.updateUI('');
        if (this.tipInterval) {
            clearInterval(this.tipInterval);
        }
        setTimeout(() => {
            if (loadingElement) {
                loadingElement.style.display = 'none';
            }
        }, 1500);
    }
};

// 灵动岛元素
const dynamicIsland = document.getElementById('dynamicIsland');
const islandTitle = document.getElementById('islandTitle');
const midiList = document.getElementById('midiList');
let isIslandExpanded = true; // 初始状态为展开
let wasGameRunningBeforePause = false; // 记录暂停前的游戏状态

// 用户认证状态（由 auth-system.js 定义，这里不重复声明）
// let isAuthenticated = false;
// let currentUser = null;

// 道具系统和血量系统
let itemSpawner = null;
let healthSystem = null;
let puzzlePieceSystem = null;
let musicUnlockSystem = null;

// 资源加载完成后展开灵动岛
let resourcesLoaded = false;
let isFirstLoad = true; // 标记是否首次加载
function onResourcesLoaded() {
    resourcesLoaded = true;
    
    // 检查认证状态
    checkAuthStatus();
    
    // 更新标题
    updateIslandTitle();
    
    // 只在首次加载时自动展开
    if (isFirstLoad) {
        setTimeout(() => {
            if (!isAuthenticated) {
                // 未认证，显示认证界面
                dynamicIsland.classList.add('expanded', 'auth-mode');
                isIslandExpanded = true;
            } else {
                // 已认证，显示音乐选择器
                dynamicIsland.classList.add('expanded');
                isIslandExpanded = true;
                if (midiFiles.length > 0) {
                    initMidiList();
                }
            }
        }, 500);
    }
}


// 游戏配置
const LANES = 5;
const LANE_WIDTH = 2;
const GROUND_LENGTH = 100;

// 统一的移动速度（调整这个值可以改变所有移动速度）
const moveSpeed = 0.50;

// 强制最高画质配置（所有设备统一最高）
const GRAPHICS_CONFIG = {
    shadowsEnabled: true,
    shadowType: THREE.PCFSoftShadowMap,
    pixelRatio: Math.max(window.devicePixelRatio, 2.0), // 强制至少2倍像素比，高分屏更高
    fogDistance: 150, // 增加雾距离，看得更远
    trailLength: 12,
    playerSegments: 64, // 提高球体细节
    trailSegments: 32   // 提高拖尾细节
};

// FPS 监控（仅用于显示，不影响画质）
let lastFrameTime = performance.now();
let fpsCheckTime = 0;
let fpsHistory = [];
let currentFPS = 0;





function updateFPS(currentTime) {
    const fps = Math.round(1000 / (currentTime - lastFrameTime));
    fpsHistory.push(fps);
    if (fpsHistory.length > 120) { // 增加采样数量以更准确地测量高帧率
        fpsHistory.shift();
    }
    
    // 每秒更新一次FPS显示
    if (currentTime - fpsCheckTime > 1000) {
        currentFPS = Math.round(fpsHistory.reduce((a, b) => a + b, 0) / fpsHistory.length);
        fpsElement.textContent = `${currentFPS} FPS`;
        fpsCheckTime = currentTime;
        

    }
}

// 初始化 Three.js 场景
function init() {
    // 创建场景
    scene = new THREE.Scene();
    // 不设置背景色，让背景透明，显示body的背景图
    scene.fog = new THREE.Fog(0x000000, 30, 120); // 黑色雾效，更远更平滑的过渡
    
    // 创建相机 - 更宽的视角以显示完整的5条轨道
    const aspect = window.innerWidth / window.innerHeight;
    // 根据屏幕比例调整FOV，手机竖屏需要更大的FOV
    const fov = aspect < 1 ? 75 : 60;
    camera = new THREE.PerspectiveCamera(fov, aspect, 0.1, 2000); // 增加远裁剪面
    camera.position.set(0, 5.5, 8);
    camera.lookAt(0, 0, -8);
    
    // 创建渲染器 - 最高画质设置（透明背景）
    const canvas = document.getElementById('gameCanvas');
    renderer = new THREE.WebGLRenderer({ 
        canvas: canvas,
        antialias: true,
        alpha: true, // 启用透明背景
        powerPreference: "high-performance",
        precision: "highp",
        stencil: true,
        depth: true,
        logarithmicDepthBuffer: true, // 提高深度精度
        premultipliedAlpha: false // 改善透明度渲染
    });
    
    // 启用高质量渲染
    renderer.sortObjects = true; // 正确排序透明物体
    renderer.toneMapping = THREE.ACESFilmicToneMapping; // 电影级色调映射
    renderer.toneMappingExposure = 1.0;
    
    // 设置像素比以提高画质（最高3倍，支持高分辨率屏幕）
    renderer.setPixelRatio(GRAPHICS_CONFIG.pixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    
    // 设置透明背景
    renderer.setClearColor(0x000000, 0); // 完全透明
    
    // 固定高画质阴影设置
    renderer.shadowMap.enabled = GRAPHICS_CONFIG.shadowsEnabled;
    renderer.shadowMap.type = GRAPHICS_CONFIG.shadowType;
    renderer.shadowMap.autoUpdate = true; // 确保阴影实时更新以支持高帧率
    
    // 添加光源 - 极简风格
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.3); // 降低环境光
    scene.add(ambientLight);
    
    // 主光源（从上方照射）
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.5);
    directionalLight.position.set(0, 15, 0);
    directionalLight.castShadow = true;
    directionalLight.shadow.camera.left = -20;
    directionalLight.shadow.camera.right = 20;
    directionalLight.shadow.camera.top = 20;
    directionalLight.shadow.camera.bottom = -20;
    directionalLight.shadow.mapSize.width = 4096; // 提高到4K阴影
    directionalLight.shadow.mapSize.height = 4096;
    directionalLight.shadow.bias = -0.0001; // 减少阴影瑕疵
    scene.add(directionalLight);
    
    // 取消点光源，避免白色光柱
    window.playerLight = null;
    
    // 创建地面
    createGround();
    
    // 创建玩家
    createPlayer();
    
    // 初始化道具系统
    if (typeof ItemSpawner !== 'undefined') {
        itemSpawner = new ItemSpawner(scene, LANES, LANE_WIDTH);
        console.log('✅ 道具生成器已初始化');
    }
    
    // 初始化血量系统
    if (typeof HealthSystem !== 'undefined') {
        healthSystem = new HealthSystem(100);
        // 设置死亡回调
        healthSystem.onDeath = () => {
            gameOverByHealth();
        };
        console.log('✅ 血量系统已初始化');
    }
    
    // 初始化拼图碎片系统
    if (typeof PuzzlePieceSystem !== 'undefined') {
        puzzlePieceSystem = new PuzzlePieceSystem();
        puzzlePieceSystem.updateUI();
        console.log('✅ 拼图碎片系统已初始化');
    }
    
    // 窗口大小调整
    window.addEventListener('resize', onWindowResize);
    
    // 初始化渲染系统管理器（添加错误处理）
    try {
        if (typeof RenderManager !== 'undefined') {
            renderManager = new RenderManager(scene, camera, renderer);
            renderManager.initialize();
            console.log('✅ 渲染管理器初始化成功');
        } else {
            console.warn('⚠️ RenderManager未定义，跳过渲染系统初始化');
        }
    } catch (error) {
        console.error('❌ 渲染管理器初始化失败:', error);
        renderManager = null;
    }
    
    // 初始化对象池
    try {
        if (typeof ObjectPool !== 'undefined') {
            // 记录初始化前的内存状态
            const memoryBefore = renderer.info.memory;
            console.log('📊 对象池初始化前的内存状态:', {
                geometries: memoryBefore.geometries,
                textures: memoryBefore.textures
            });
            
            noteBlockPool = new ObjectPool(createNoteBlockObject, resetNoteBlockObject, 100);
            noteBlockPool.warmup(100);
            
            // 记录初始化后的内存状态
            const memoryAfter = renderer.info.memory;
            console.log('📊 对象池初始化后的内存状态:', {
                geometries: memoryAfter.geometries,
                textures: memoryAfter.textures
            });
            
            // 计算内存优化效果
            const geometryIncrease = memoryAfter.geometries - memoryBefore.geometries;
            const expectedWithoutSharing = 100 * 2; // 100个对象 * 2个几何体（方块+边缘）
            const savingsPercent = ((expectedWithoutSharing - geometryIncrease) / expectedWithoutSharing * 100).toFixed(1);
            
            console.log('✅ 对象池初始化完成:', noteBlockPool.getStats());
            console.log('💾 共享几何体优化效果:');
            console.log(`   - 实际增加: ${geometryIncrease} 个几何体`);
            console.log(`   - 无共享预期: ${expectedWithoutSharing} 个几何体`);
            console.log(`   - 节省内存: ${savingsPercent}%`);
        } else {
            console.warn('⚠️ ObjectPool未定义，跳过对象池初始化');
        }
    } catch (error) {
        console.error('❌ 对象池初始化失败:', error);
        noteBlockPool = null;
    }
    
    // 设置WebGL错误处理
    setupWebGLErrorHandlers();
    
    // 不在这里初始化MIDI，改为在预加载中初始化
}

// 获取midi文件夹中的所有MIDI文件
async function getMidiFiles() {
    console.log('📂 扫描MIDI文件夹...');
    
    const midiFiles = [];
    let fileIndex = 1;
    
    // 尝试加载文件，直到找不到为止
    while (true) {
        const filePath = `midi/${fileIndex}.mid`;
        
        try {
            // 尝试发送HEAD请求检查文件是否存在
            const response = await fetch(filePath, { method: 'HEAD' });
            
            if (response.ok) {
                midiFiles.push(filePath);
                console.log(`✅ 找到: ${filePath}`);
                fileIndex++;
            } else {
                // 文件不存在，停止扫描
                break;
            }
        } catch (error) {
            // 请求失败，停止扫描
            break;
        }
    }
    
    if (midiFiles.length === 0) {
        console.warn('⚠️ 未找到MIDI文件，使用默认列表');
        return [
            'midi/1.mid',
            'midi/2.mid'
        ];
    }
    
    console.log(`📂 找到 ${midiFiles.length} 个MIDI文件:`, midiFiles);
    return midiFiles;
}

// 加载指定的MIDI文件（从缓存或网络）
async function loadMidiFile(index) {
    try {
        // 清理旧的音符方块（如果存在）
        if (noteObjects.length > 0) {
            cleanupObjects(noteObjects);
            blocksCreated = false;
        }
        
        let notes;
        
        // 优先从缓存加载
        if (preloadedMidiData[index]) {
            notes = preloadedMidiData[index].notes;
            currentMidiName = preloadedMidiData[index].name;
        } else {
            // 缓存未命中，从网络加载
            loadingElement.style.display = 'flex';
            
            const fileName = midiFiles[index];
            notes = await midiParser.loadMIDI(fileName + '?v=1');
            currentMidiName = fileName.split('/').pop().replace('.mid', '');
            
            loadingElement.style.display = 'none';
        }
        
        if (notes.length === 0) {
            console.error('MIDI文件中没有音符');
            return false;
        }
        
        // 处理音符数据
        processMIDINotes(notes);
        updateIslandTitle(currentMidiName);
        
        // 加载对应的背景音乐（MP3文件）
        const audioPath = midiFiles[index].replace('.mid', '.mp3');
        await audioEngine.loadBGM(audioPath);
        
        return true;
    } catch (error) {
        console.error('加载MIDI文件失败:', error);
        loadingElement.style.display = 'none';
        return false;
    }
}

// 预加载所有资源（进入网站时立即执行）
async function preloadAllResources() {
    try {
        console.log('🚀 开始预加载资源...');
        loadingElement.style.display = 'flex';
        
        // 初始化MIDI解析器和音频引擎
        console.log('📦 初始化MIDI解析器...');
        midiParser = new MIDIParser();
        console.log('📦 初始化音频引擎...');
        audioEngine = new AudioEngine();
        console.log('✅ MIDI解析器和音频引擎初始化完成');
        
        // 获取MIDI文件列表
        console.log('📂 获取MIDI文件列表...');
        midiFiles = await getMidiFiles();
        console.log('✅ 找到', midiFiles.length, '个MIDI文件:', midiFiles);
        
        if (midiFiles.length === 0) {
            console.error('❌ 没有找到MIDI文件');
            loadingManager.complete();
            return;
        }
        
        // 计算总加载项：30个音色 + 所有MIDI文件
        const totalItems = 30 + midiFiles.length;
        console.log('📊 总加载项:', totalItems, '(30个音色 +', midiFiles.length, '个MIDI)');
        loadingManager.init(totalItems);
        console.log('✅ 加载管理器初始化完成');
        
        // 初始化音乐解锁系统（需要在选择默认音乐之前）
        if (typeof MusicUnlockSystem !== 'undefined') {
            musicUnlockSystem = new MusicUnlockSystem();
            await musicUnlockSystem.init(midiFiles);
            console.log('✅ 音乐解锁系统已初始化');
            
            // 从已解锁的音乐中随机选择一个作为默认
            const unlockedMusic = musicUnlockSystem.getUnlockedMusic();
            if (unlockedMusic.length > 0) {
                // 随机选择一个已解锁的音乐
                const randomUnlockedName = unlockedMusic[Math.floor(Math.random() * unlockedMusic.length)];
                // 找到对应的索引
                currentMidiIndex = midiFiles.findIndex(file => 
                    file.split('/').pop().replace('.mid', '') === randomUnlockedName
                );
                
                // 如果找不到，使用第一个已解锁的音乐
                if (currentMidiIndex === -1) {
                    const firstUnlockedName = unlockedMusic[0];
                    currentMidiIndex = midiFiles.findIndex(file => 
                        file.split('/').pop().replace('.mid', '') === firstUnlockedName
                    );
                }
                
                console.log(`🎵 默认选择已解锁音乐: ${midiFiles[currentMidiIndex]}`);
            } else {
                // 如果没有解锁的音乐（不应该发生），选择第一个
                currentMidiIndex = 0;
                console.warn('⚠️ 没有已解锁的音乐，使用第一个');
            }
        } else {
            // 如果音乐解锁系统未定义，随机选择
            currentMidiIndex = Math.floor(Math.random() * midiFiles.length);
        }
        
        // 并行加载所有资源
        await Promise.all([
            // 加载所有MIDI文件
            (async () => {
                console.log('🎵 开始加载MIDI文件...');
                loadingManager.updateUI('');
                for (let i = 0; i < midiFiles.length; i++) {
                    try {
                        const fileName = midiFiles[i];
                        console.log(`📥 加载MIDI ${i + 1}/${midiFiles.length}: ${fileName}`);
                        const notes = await midiParser.loadMIDI(fileName + '?v=1');
                        console.log(`✅ MIDI ${i + 1} 加载成功，音符数:`, notes.length);
                        
                        // 缓存MIDI数据
                        preloadedMidiData[i] = {
                            fileName: fileName,
                            notes: notes,
                            name: fileName.split('/').pop().replace('.mid', '')
                        };
                        
                        loadingManager.increment('');
                    } catch (error) {
                        console.error(`❌ MIDI文件 ${i} 加载失败:`, error);
                        loadingManager.increment('');
                    }
                }
                console.log('✅ 所有MIDI文件加载完成');
            })(),
            
            // 加载钢琴音色
            (async () => {
                try {
                    console.log('🎹 开始加载钢琴音色...');
                    loadingManager.updateUI('');
                    audioEngine.ensureAudioContext();
                    console.log('✅ 音频上下文已创建');
                    
                    await audioEngine.init((loaded, total) => {
                        console.log(`🎹 音色加载进度: ${loaded}/${total}`);
                        loadingManager.increment('');
                    });
                    console.log('✅ 所有钢琴音色加载完成');
                } catch (error) {
                    console.error('❌ 钢琴音色加载失败:', error);
                }
            })()
        ]);
        
        // 完成加载
        loadingManager.complete();
        
        // 显示播放按钮
        const startButton = document.getElementById('startButton');
        if (startButton) {
            startButton.style.display = 'block';
            
            // 等待用户点击开始按钮
            const startGame = async (e) => {
                if (e) e.preventDefault();
                startButton.removeEventListener('click', startGame);
                startButton.removeEventListener('touchstart', startGame);
                startButton.style.display = 'none';
                
                // 显示加载界面
                loadingElement.style.display = 'flex';
                
                // 初始化游戏启动加载管理器
                const gameStartLoader = {
                    total: 3, // 总共3个步骤
                    current: 0,
                    
                    updateProgress(step, message) {
                        this.current = step;
                        const percentage = Math.round((this.current / this.total) * 100);
                        loadingPercentage.textContent = `${percentage}%`;
                        loadingProgressBar.style.width = `${percentage}%`;
                    }
                };
                
                try {
                    // 步骤1：启动音频引擎
                    gameStartLoader.updateProgress(0, '');
                    await audioEngine.start();
                    
                    // 播放点击音效（音频上下文启动后）
                    if (audioEngine && audioEngine.playClickSound) {
                        audioEngine.playClickSound();
                    }
                    
                    // 等待一小段时间让用户看到进度
                    await new Promise(resolve => setTimeout(resolve, 200));
                    
                    // 步骤2：处理音符数据和加载背景音乐
                    gameStartLoader.updateProgress(1, '');
                    await new Promise(resolve => {
                        requestAnimationFrame(() => {
                            if (preloadedMidiData[currentMidiIndex]) {
                                processMIDINotes(preloadedMidiData[currentMidiIndex].notes);
                                currentMidiName = preloadedMidiData[currentMidiIndex].name;
                                updateIslandTitle(currentMidiName);
                            }
                            resolve();
                        });
                    });
                    
                    // 加载背景音乐
                    const audioPath = midiFiles[currentMidiIndex].replace('.mid', '.mp3');
                    await audioEngine.loadBGM(audioPath);
                    
                    await new Promise(resolve => setTimeout(resolve, 200));
                    
                    // 步骤3：创建游戏场景
                    gameStartLoader.updateProgress(2, '');
                    
                    // 预先创建所有方块（带进度）
                    await createAllNoteBlocksWithProgress((progress) => {
                        const percentage = Math.round(66 + (progress * 34)); // 66%-100%
                        loadingPercentage.textContent = `${percentage}%`;
                        loadingProgressBar.style.width = `${percentage}%`;
                    });
                    
                    // 完成
                    gameStartLoader.updateProgress(3, '');
                    await new Promise(resolve => setTimeout(resolve, 300));
                    
                    // 隐藏加载界面
                    loadingElement.style.display = 'none';
                    
                    // 开始游戏
                    startMIDIGame();
                    
                    // 播放开始音效
                    audioEngine.playStartSound();
                    
                } catch (error) {
                    console.error('游戏启动失败:', error);
                    setTimeout(() => {
                        loadingElement.style.display = 'none';
                        startButton.style.display = 'block';
                    }, 2000);
                }
            };
            
            startButton.addEventListener('click', startGame);
            startButton.addEventListener('touchstart', startGame, { passive: false });
        }
        
        // 强制最高画质（ultra）并禁用自动调整
        if (renderManager && renderManager.qualityAdapter) {
            // 禁用自动画质调整
            renderManager.qualityAdapter.autoAdjust = false;
            
            // 设置为最高画质
            renderManager.qualityAdapter.setManualQuality('ultra');
            console.log('🎨 强制最高画质（ultra）+ 禁用自动降级');
            
            // 更新UI按钮状态
            const qualityButtons = document.querySelectorAll('.quality-btn');
            qualityButtons.forEach(btn => {
                btn.classList.remove('active');
                if (btn.getAttribute('data-quality') === 'ultra') {
                    btn.classList.add('active');
                }
            });
            
            // 禁用自动画质调整开关
            const autoQualityToggle = document.getElementById('autoQualityToggle');
            if (autoQualityToggle) {
                autoQualityToggle.checked = false;
                autoQualityToggle.disabled = true; // 禁用开关，防止用户修改
            }
        }
        
        // 触发资源加载完成回调
        onResourcesLoaded();
        
    } catch (error) {
        console.error('预加载失败:', error);
        setTimeout(() => {
            loadingManager.complete();
        }, 2000);
    }
}

// 这个函数已经不需要了，音色在进入时就加载好了

// 简单的伪随机数生成器（使用种子）
function seededRandom(seed) {
    const x = Math.sin(seed) * 10000;
    return x - Math.floor(x);
}

// 计算音符密集度
function calculateDensity(noteIndex, allNotes) {
    const currentTime = allNotes[noteIndex].time;
    const checkRange = 1.0; // 检查前后1秒
    
    let nearbyCount = 0;
    for (let note of allNotes) {
        if (Math.abs(note.time - currentTime) < checkRange) {
            nearbyCount++;
        }
    }
    
    // 密集度 = 附近音符数 / 理论最大值
    // 假设最密集时1秒内20个音符
    return Math.min(nearbyCount / 20, 1.0);
}

// 动态分配超高黑块（使用确定性算法）
function assignTallBlocks(notes) {
    for (let i = 0; i < notes.length; i++) {
        const density = calculateDensity(i, notes);
        
        // 根据密集度决定超高概率（整体增加）
        let tallProbability;
        if (density > 0.8) {
            tallProbability = 0.15; // 很密集：15%（原5%）
        } else if (density > 0.5) {
            tallProbability = 0.30; // 中等：30%（原15%）
        } else {
            tallProbability = 0.45; // 分散：45%（原30%）
        }
        
        // 使用确定性随机数（基于音符时间和索引）
        const seed = notes[i].time * 10000 + i;
        const randomValue = seededRandom(seed);
        notes[i].isTall = randomValue < tallProbability;
    }
}

// 确保每个时间窗口最多3条轨道有黑块（使用种子随机算法）
function ensureMaxThreeLanes(notes) {
    const windowSize = 0.3; // 时间窗口：0.3秒
    const maxLanes = 3; // 最多3条轨道
    
    // 获取最大时间
    const maxTime = Math.max(...notes.map(n => n.time));
    
    let adjustCount = 0;
    
    // 使用更小的步长来检查
    for (let t = 0; t < maxTime; t += 0.1) {
        // 获取这个时间窗口内的所有音符
        const blocksInWindow = notes.filter(note => 
            note.time >= t && note.time < t + windowSize
        );
        
        if (blocksInWindow.length === 0) continue;
        
        // 统计占用的轨道
        const occupiedLanes = [...new Set(blocksInWindow.map(b => b.lane))];
        
        if (occupiedLanes.length > maxLanes) {
            // 需要调整！随机选择要移除的轨道
            const excessCount = occupiedLanes.length - maxLanes;
            
            // 使用种子随机数选择要移除的轨道
            const seed1 = Math.floor(t * 1000);
            const shuffledLanes = [...occupiedLanes].sort((a, b) => {
                return seededRandom(seed1 + a) - seededRandom(seed1 + b);
            });
            
            // 保留前3条，移除其余的
            const keepLanes = shuffledLanes.slice(0, maxLanes);
            const removeLanes = shuffledLanes.slice(maxLanes);
            
            // 将需要移除的轨道上的黑块，随机移动到保留的轨道上
            for (let block of blocksInWindow) {
                if (removeLanes.includes(block.lane)) {
                    // 使用种子随机数选择目标轨道
                    const seed2 = block.time * 10000 + block.lane * 100;
                    const randomValue = seededRandom(seed2);
                    const targetLane = keepLanes[Math.floor(randomValue * keepLanes.length)];
                    block.lane = targetLane;
                    adjustCount++;
                }
            }
        }
    }
}

// 处理MIDI音符
function processMIDINotes(notes) {
    // 清理旧的音符数据（如果存在）
    if (midiNotes.length > 0) {
        midiNotes = [];
    }
    
    // 第一步：随机分配轨道
    midiNotes = notes.map((note, index) => {
        const seed = note.time * 1000;
        const randomValue = seededRandom(seed);
        const lane = Math.floor(randomValue * LANES);
        
        return {
            time: midiParser.ticksToSeconds(note.time),
            lane: lane,
            note: note.note,
            velocity: note.velocity,
            duration: midiParser.ticksToSeconds(note.duration),
            triggered: false,
            collided: false,
            isTall: false // 稍后分配
        };
    });
    
    // 第二步：根据密集度动态分配超高黑块
    assignTallBlocks(midiNotes);
    
    // 第三步：确保每个时间窗口最多3条轨道有黑块
    ensureMaxThreeLanes(midiNotes);
    
    totalNotes = midiNotes.length;
    
    // 计算合适的游戏速度
    // 获取实际的 BPM
    const bpm = Math.round(60000000 / midiParser.tempo);
    
    // 找出最小音符间隔
    const intervals = [];
    for (let i = 1; i < midiNotes.length; i++) {
        const interval = midiNotes[i].time - midiNotes[i - 1].time;
        if (interval > 0.01) { // 忽略和弦（同时发声的音符）
            intervals.push(interval);
        }
    }
    
    if (intervals.length > 0) {
        // 使用中位数间隔来计算速度
        intervals.sort((a, b) => a - b);
        const medianInterval = intervals[Math.floor(intervals.length / 2)];
        
        // 调整速度：让音符间隔在屏幕上看起来合适
        // 目标：音符间隔约为 3-5 个单位距离
        const targetDistance = 4;
        const calculatedSpeed = targetDistance / (medianInterval * 60); // 60fps 基准
        
        // 限制速度范围
        const finalSpeed = Math.max(0.08, Math.min(0.6, calculatedSpeed));
        
        // 设置原始基础速度（永远不变，用于计算音符位置）
        originalBaseSpeed = finalSpeed;
        midiSpeed = finalSpeed;
    }
    

}

// 更新实时分数显示
function updateLiveScore() {
    const liveScoreElement = document.getElementById('liveScore');
    const liveScoreValue = document.getElementById('liveScoreValue');
    
    if (liveScoreElement && liveScoreValue) {
        liveScoreValue.textContent = score;
        
        // 游戏运行时显示，否则隐藏
        if (gameRunning) {
            liveScoreElement.classList.add('visible');
        } else {
            liveScoreElement.classList.remove('visible');
        }
    }
}

// 开始MIDI游戏（优化版 - 方块已创建，直接启动）
function startMIDIGame() {
    loadingElement.style.display = 'none';
    
    // 收起灵动岛
    dynamicIsland.classList.remove('expanded');
    isIslandExpanded = false;
    
    // 重置血量系统
    if (healthSystem) {
        healthSystem.reset();
        // 初始化血量UI（如果还没初始化）
        if (!healthSystem.containerElement) {
            healthSystem.initUI(player, camera, renderer);
        }
    }
    
    // 启动道具生成器
    if (itemSpawner) {
        itemSpawner.start();
    }
    
    // 显示实时分数
    updateLiveScore();
    
    // 立即启动游戏（方块已经创建完成）
    gameRunning = true;
    // 使用音频时钟作为游戏时间基准，确保完美同步
    gameStartTime = audioEngine.audioContext.currentTime;
    gamePausedTime = 0;
    totalPausedDuration = 0;
    
    // === 音频和黑块同步系统 ===
    // 核心原则：音频和黑块共用同一个时间源和加速度（speedMultiplier）
    //
    // 1. 黑块初始位置：z = 2 - (noteTime * originalBaseSpeed * 60)
    // 2. 黑块移动速度：originalBaseSpeed * speedMultiplier * 60（每秒移动的距离）
    // 3. 音频播放速度：speedMultiplier（通过 playbackRate 控制）
    //
    // 黑块到达触发线需要的游戏时间：
    //   distance = noteTime * originalBaseSpeed * 60
    //   time = distance / (originalBaseSpeed * speedMultiplier * 60)
    //        = noteTime / speedMultiplier
    //
    // 音频对齐计算：
    //   audioStartTime + gameTime = noteTime
    //   其中 gameTime = noteTime / speedMultiplier
    //   所以 audioStartTime = noteTime * (1 - 1/speedMultiplier)
    //
    // 示例：
    //   speedMultiplier = 1.0x → audioStartTime = 0（从头播放）
    //   speedMultiplier = 2.0x → audioStartTime = noteTime * 0.5（从中间播放）
    
    let audioStartTime = 0;
    if (midiNotes.length > 0) {
        const firstNoteTime = midiNotes[0].time;
        
        // 计算黑块到达触发线需要的游戏时间
        const gameTimeToTrigger = firstNoteTime / speedMultiplier;
        
        // 计算音频开始时间
        audioStartTime = firstNoteTime - gameTimeToTrigger;
    }
    
    // 从计算出的时间开始播放背景音乐
    if (audioEngine && audioEngine.bgmBuffer) {
        audioEngine.playBGM(audioStartTime, speedMultiplier);
    }
}



// 创建所有音符方块（带进度回调的版本）
async function createAllNoteBlocksWithProgress(progressCallback) {
    // 防止重复创建
    if (blocksCreated && noteObjects.length > 0) {
        console.warn(`⚠️ 阻止重复创建！当前已有 ${noteObjects.length} 个方块`);
        return;
    }
    
    // 先清理已存在的方块
    if (noteObjects.length > 0) {
        console.warn(`清理 ${noteObjects.length} 个旧方块`);
        cleanupObjects(noteObjects);
    }
    
    const batchSize = 50;
    let currentIndex = 0;
    const startTime = performance.now();
    
    return new Promise((resolve) => {
        function createBatch() {
            const endIndex = Math.min(currentIndex + batchSize, midiNotes.length);
            
            // 创建当前批次
            for (let i = currentIndex; i < endIndex; i++) {
                createNoteBlock(midiNotes[i]);
            }
            
            currentIndex = endIndex;
            
            // 更新进度
            const progress = currentIndex / midiNotes.length;
            if (progressCallback) {
                progressCallback(progress);
            }
            
            if (currentIndex < midiNotes.length) {
                // 继续下一批
                requestAnimationFrame(createBatch);
            } else {
                blocksCreated = true;
                
                // 验证共享资源使用情况
                console.log('');
                console.log('🎯 所有方块创建完成，验证共享资源优化效果...');
                setTimeout(() => {
                    verifySharedResourceUsage();
                }, 100);
                
                resolve();
            }
        }
        
        // 立即开始
        createBatch();
    });
}

// 创建所有音符方块（无进度回调的版本，用于其他地方）
function createAllNoteBlocks() {
    return createAllNoteBlocksWithProgress(null);
}

// ============================================================================
// 共享资源管理系统 - 优化内存使用
// ============================================================================

// 共享几何体和材质（避免重复创建，大幅提升性能和降低内存）
let sharedEdgeMaterial = null;
let sharedBlockMaterials = {
    normal: null,      // 普通方块材质
    triggered: null,   // 已触发方块材质
    tall: null         // 超高方块材质（如果需要不同外观）
};

// LOD共享几何体（三个细节级别）
let sharedGeometries = {
    normalBlock: {
        high: null,
        medium: null,
        low: null,
        highEdges: null,
        mediumEdges: null,
        lowEdges: null
    },
    tallBlock: {
        high: null,
        medium: null,
        low: null,
        highEdges: null,
        mediumEdges: null,
        lowEdges: null
    }
};

/**
 * 获取共享边缘线材质
 * 所有方块共用同一个边缘线材质，减少材质数量
 */
function getSharedEdgeMaterial() {
    if (!sharedEdgeMaterial) {
        sharedEdgeMaterial = new THREE.LineBasicMaterial({ 
            color: 0xffffff,
            transparent: true,
            opacity: 0.9,
            linewidth: 2
        });
    }
    return sharedEdgeMaterial;
}

/**
 * 获取共享方块材质
 * 使用材质实例化技术，所有相同类型的方块共享同一个材质
 * 通过修改颜色属性来实现不同的视觉效果
 * @param {string} type - 材质类型：'normal', 'triggered', 'tall'
 */
function getSharedBlockMaterial(type = 'normal') {
    if (!sharedBlockMaterials[type]) {
        // 根据类型创建不同的基础材质
        switch (type) {
            case 'normal':
                sharedBlockMaterials.normal = new THREE.MeshStandardMaterial({ 
                    color: 0xffffff,  // 白色
                    metalness: 0.3,
                    roughness: 0.5,
                    transparent: true,
                    opacity: 0.7,  // 70%不透明（30%透明）
                    emissive: 0xffffff,
                    emissiveIntensity: 0.1
                });
                break;
            case 'triggered':
                sharedBlockMaterials.triggered = new THREE.MeshStandardMaterial({ 
                    color: 0xffffff,  // 纯白色
                    metalness: 0.5,
                    roughness: 0.3,
                    transparent: false,  // 不透明
                    opacity: 1.0,
                    emissive: 0xffffff,
                    emissiveIntensity: 0.5
                });
                break;
            case 'tall':
                // 超高方块使用与普通方块相同的材质
                sharedBlockMaterials.tall = new THREE.MeshStandardMaterial({ 
                    color: 0xffffff,  // 白色
                    metalness: 0.3,
                    roughness: 0.5,
                    transparent: true,
                    opacity: 0.7,  // 70%不透明（30%透明）
                    emissive: 0xffffff,
                    emissiveIntensity: 0.1
                });
                break;
        }
    }
    return sharedBlockMaterials[type];
}

/**
 * 清理所有共享资源
 * 在场景切换或游戏结束时调用
 */
function disposeSharedResources() {
    // 清理共享几何体
    for (const blockType in sharedGeometries) {
        const geometries = sharedGeometries[blockType];
        for (const key in geometries) {
            if (geometries[key] && geometries[key].dispose) {
                geometries[key].dispose();
                geometries[key] = null;
            }
        }
    }
    
    // 清理共享材质
    if (sharedEdgeMaterial) {
        sharedEdgeMaterial.dispose();
        sharedEdgeMaterial = null;
    }
    
    for (const key in sharedBlockMaterials) {
        if (sharedBlockMaterials[key]) {
            sharedBlockMaterials[key].dispose();
            sharedBlockMaterials[key] = null;
        }
    }
    
    console.log('🧹 共享资源已清理');
}

/**
 * 验证共享资源的使用情况
 * 检查所有方块是否正确使用共享几何体和材质
 */
function verifySharedResourceUsage() {
    if (noteObjects.length === 0) {
        console.log('📊 没有方块对象可供验证');
        return;
    }
    
    // 统计几何体使用情况
    const geometryMap = new Map();
    const materialMap = new Map();
    const edgeMaterialMap = new Map();
    
    noteObjects.forEach(block => {
        // 统计方块几何体
        const geomId = block.geometry.uuid;
        geometryMap.set(geomId, (geometryMap.get(geomId) || 0) + 1);
        
        // 统计方块材质
        const matId = block.material.uuid;
        materialMap.set(matId, (materialMap.get(matId) || 0) + 1);
        
        // 统计边缘线材质
        if (block.children.length > 0) {
            const edgeMat = block.children[0].material;
            const edgeMatId = edgeMat.uuid;
            edgeMaterialMap.set(edgeMatId, (edgeMaterialMap.get(edgeMatId) || 0) + 1);
        }
    });
    
    console.log('═══════════════════════════════════════════════════════');
    console.log('📊 共享资源使用情况验证');
    console.log('───────────────────────────────────────────────────────');
    console.log(`总方块数: ${noteObjects.length}`);
    console.log('');
    console.log('几何体共享情况:');
    console.log(`  - 独立几何体数量: ${geometryMap.size}`);
    console.log(`  - 理想数量（完全共享）: 6 (普通方块3个LOD + 超高方块3个LOD)`);
    console.log(`  - 共享率: ${((1 - geometryMap.size / noteObjects.length) * 100).toFixed(1)}%`);
    console.log('');
    console.log('材质共享情况:');
    console.log(`  - 独立材质数量: ${materialMap.size}`);
    console.log(`  - 预期数量: ${noteObjects.length} (每个方块一个材质实例)`);
    console.log(`  - 说明: 材质使用clone()创建实例，共享shader程序`);
    console.log('');
    console.log('边缘线材质共享情况:');
    console.log(`  - 独立边缘材质数量: ${edgeMaterialMap.size}`);
    console.log(`  - 理想数量（完全共享）: 1`);
    console.log(`  - 共享率: ${((1 - edgeMaterialMap.size / noteObjects.length) * 100).toFixed(1)}%`);
    console.log('');
    
    // 计算内存节省
    const currentMemory = renderer.info.memory;
    const expectedGeometriesWithoutSharing = noteObjects.length * 2; // 每个方块2个几何体
    const geometrySavings = expectedGeometriesWithoutSharing - currentMemory.geometries;
    const savingsPercent = (geometrySavings / expectedGeometriesWithoutSharing * 100).toFixed(1);
    
    console.log('内存优化效果:');
    console.log(`  - 当前几何体总数: ${currentMemory.geometries}`);
    console.log(`  - 无共享预期: ${expectedGeometriesWithoutSharing}`);
    console.log(`  - 节省: ${geometrySavings} 个几何体 (${savingsPercent}%)`);
    console.log('═══════════════════════════════════════════════════════');
    
    return {
        totalBlocks: noteObjects.length,
        uniqueGeometries: geometryMap.size,
        uniqueMaterials: materialMap.size,
        uniqueEdgeMaterials: edgeMaterialMap.size,
        geometrySavingsPercent: parseFloat(savingsPercent),
        currentGeometries: currentMemory.geometries,
        expectedWithoutSharing: expectedGeometriesWithoutSharing
    };
}

// 获取共享几何体（支持LOD，大幅减少内存和创建时间）
function getSharedGeometry(isTall, lodLevel = 'high') {
    const blockType = isTall ? 'tallBlock' : 'normalBlock';
    const geometries = sharedGeometries[blockType];
    
    // 创建对应LOD级别的几何体（如果不存在）
    if (!geometries[lodLevel]) {
        if (isTall) {
            // 超高方块的LOD几何体
            switch (lodLevel) {
                case 'high':
                    geometries.high = new THREE.BoxGeometry(1.5, 3.0, 1.2, 4, 12, 4);
                    geometries.highEdges = new THREE.EdgesGeometry(geometries.high);
                    break;
                case 'medium':
                    geometries.medium = new THREE.BoxGeometry(1.5, 3.0, 1.2, 2, 6, 2);
                    geometries.mediumEdges = new THREE.EdgesGeometry(geometries.medium);
                    break;
                case 'low':
                    geometries.low = new THREE.BoxGeometry(1.5, 3.0, 1.2, 1, 3, 1);
                    geometries.lowEdges = new THREE.EdgesGeometry(geometries.low);
                    break;
            }
        } else {
            // 普通方块的LOD几何体
            switch (lodLevel) {
                case 'high':
                    geometries.high = new THREE.BoxGeometry(1.5, 0.4, 1.2, 4, 4, 4);
                    geometries.highEdges = new THREE.EdgesGeometry(geometries.high);
                    break;
                case 'medium':
                    geometries.medium = new THREE.BoxGeometry(1.5, 0.4, 1.2, 2, 2, 2);
                    geometries.mediumEdges = new THREE.EdgesGeometry(geometries.medium);
                    break;
                case 'low':
                    geometries.low = new THREE.BoxGeometry(1.5, 0.4, 1.2, 1, 1, 1);
                    geometries.lowEdges = new THREE.EdgesGeometry(geometries.low);
                    break;
            }
        }
    }
    
    return {
        block: geometries[lodLevel],
        edges: geometries[lodLevel + 'Edges']
    };
}

/**
 * 对象池：创建新的音符方块对象
 * 使用共享几何体和材质实例化，大幅减少内存占用
 * 
 * 优化策略：
 * - 几何体：完全共享，所有方块使用同一个几何体实例
 * - 材质：使用 clone() 创建材质实例，共享shader程序但允许独立的颜色属性
 * - 边缘线：完全共享材质，因为边缘线颜色不需要改变
 */
function createNoteBlockObject() {
    // 使用共享几何体（普通方块的高细节级别）
    const geometries = getSharedGeometry(false, 'high');
    
    // 创建材质实例：clone共享材质，这样可以独立修改颜色
    // 但shader程序仍然是共享的，大幅减少GPU开销
    const baseMaterial = getSharedBlockMaterial('normal');
    const material = baseMaterial.clone();
    
    const noteBlock = new THREE.Mesh(geometries.block, material);
    
    // 添加发光边缘（使用完全共享的边缘材质）
    const edgesMaterial = getSharedEdgeMaterial();
    const edges = new THREE.LineSegments(geometries.edges, edgesMaterial);
    noteBlock.add(edges);
    
    noteBlock.castShadow = true;
    noteBlock.visible = false;
    
    return noteBlock;
}

/**
 * 对象池：重置音符方块对象
 * 重置对象状态以便重用，保持材质实例但重置其属性
 */
function resetNoteBlockObject(block) {
    // 清除所有正在运行的动画
    if (block.userData.scaleInterval) {
        clearInterval(block.userData.scaleInterval);
        block.userData.scaleInterval = null;
    }
    
    // 重置位置和旋转
    block.position.set(0, 0, 0);
    block.rotation.set(0, 0, 0);
    block.scale.set(1, 1, 1);
    
    // 重置材质属性到初始状态
    // 保持材质实例不变，只修改属性，避免材质重新创建
    block.material.color.setHex(0xffffff);  // 白色
    block.material.transparent = true;
    block.material.opacity = 0.7;  // 70%不透明（30%透明）
    block.material.emissive.setHex(0xffffff);
    block.material.emissiveIntensity = 0.1;
    
    // 重置可见性
    block.visible = false;
    
    // 从场景中移除
    if (block.parent) {
        block.parent.remove(block);
    }
    
    // 清空用户数据
    block.userData = {};
}

// 创建音符方块（使用对象池）
function createNoteBlock(noteData) {
    // 从对象池获取对象
    let noteBlock;
    if (noteBlockPool) {
        noteBlock = noteBlockPool.acquire();
        if (!noteBlock) {
            console.warn('对象池已满，创建新对象');
            noteBlock = createNoteBlockObject();
        }
    } else {
        // 如果对象池未初始化，直接创建
        noteBlock = createNoteBlockObject();
    }
    
    // 使用预先分配的高度
    const isTall = noteData.isTall;
    const blockHeight = isTall ? 3.0 : 0.4;
    const blockY = isTall ? 1.55 : 0.25;
    
    // 根据是否是超高方块，切换几何体
    const geometries = getSharedGeometry(isTall);
    noteBlock.geometry = geometries.block;
    
    // 更新边缘线几何体
    if (noteBlock.children.length > 0) {
        noteBlock.children[0].geometry = geometries.edges;
    }
    
    const x = (noteData.lane - 2) * LANE_WIDTH;
    // === 黑块初始位置计算（基于统一时间控制系统）===
    // 触发线位置：z = 2
    // 黑块到达触发线需要的游戏时间：noteData.time / speedMultiplier
    // 黑块移动速度：originalBaseSpeed * speedMultiplier * 60（每秒移动的距离）
    // 移动距离：distance = speed × time
    //                    = (originalBaseSpeed * speedMultiplier * 60) × (noteData.time / speedMultiplier)
    //                    = originalBaseSpeed * 60 * noteData.time
    // 初始位置：z = 2 - distance = 2 - (noteData.time * originalBaseSpeed * 60)
    // 
    // 注意：初始位置与 speedMultiplier 无关，因为速度和时间的变化相互抵消
    //      这确保了无论速度如何变化，黑块都能在正确的时间到达触发线
    const zPosition = 2 - (noteData.time * originalBaseSpeed * 60);
    noteBlock.position.set(x, blockY, zPosition);
    
    // 启用阴影
    noteBlock.castShadow = true;
    
    noteBlock.userData = {
        noteData: noteData,
        isNote: true,
        isTall: isTall,
        blockHeight: blockHeight,
        isRendered: false, // 标记是否已渲染
        currentLOD: 'high' // 当前LOD级别
    };
    
    // 注册到LOD管理器
    if (renderManager && renderManager.lodManager) {
        const lodConfig = isTall ? LOD_CONFIG.tallBlock : LOD_CONFIG.normalBlock;
        renderManager.lodManager.registerObject(noteBlock, lodConfig);
    }
    
    // 初始状态：不添加到场景中，等待进入视野范围
    // scene.add(noteBlock); // 注释掉，改为按需添加
    noteBlock.visible = false; // 初始不可见
    
    noteObjects.push(noteBlock);
}

// 创建地面
function createGround() {
    // 极简风格：深蓝灰色地面
    const groundGeometry = new THREE.PlaneGeometry(LANES * LANE_WIDTH, GROUND_LENGTH);
    const groundMaterial = new THREE.MeshStandardMaterial({ 
        color: 0x1a1a2e, // 深蓝灰色
        roughness: 0.3,
        metalness: 0.8,
        transparent: true,
        opacity: 0.9
    });
    
    for (let i = 0; i < 3; i++) {
        const groundMesh = new THREE.Mesh(groundGeometry, groundMaterial);
        groundMesh.rotation.x = -Math.PI / 2;
        groundMesh.position.z = -GROUND_LENGTH * i;
        groundMesh.receiveShadow = true;
        scene.add(groundMesh);
        ground.push(groundMesh);
    }
    
    // 添加轨道线（深灰色，低调）
    const lineMaterial = new THREE.MeshBasicMaterial({ 
        color: 0x444444, // 深灰色
        transparent: true,
        opacity: 0.5,
        fog: true
    });
    
    // 添加轨道分隔线（4条）
    for (let i = 1; i < LANES; i++) {
        const x = (i - LANES / 2) * LANE_WIDTH;
        const lineGeometry = new THREE.BoxGeometry(0.03, 0.01, 250);
        const lineMesh = new THREE.Mesh(lineGeometry, lineMaterial);
        lineMesh.position.set(x, 0.01, -75);
        scene.add(lineMesh);
    }
    
    // 添加两侧边界线（让5条轨道更明显）
    const edgeMaterial = new THREE.MeshBasicMaterial({
        color: 0x444444, // 深灰色
        transparent: true,
        opacity: 0.4,
        fog: true
    });
    
    // 左边界
    const leftEdge = new THREE.BoxGeometry(0.05, 0.02, 250);
    const leftMesh = new THREE.Mesh(leftEdge, edgeMaterial);
    leftMesh.position.set(-LANES * LANE_WIDTH / 2, 0.01, -75);
    scene.add(leftMesh);
    
    // 右边界
    const rightEdge = new THREE.BoxGeometry(0.05, 0.02, 250);
    const rightMesh = new THREE.Mesh(rightEdge, edgeMaterial);
    rightMesh.position.set(LANES * LANE_WIDTH / 2, 0.01, -75);
    scene.add(rightMesh);
    
    // 创建触发线（白色发光）
    createTriggerLine();
}

// 创建触发线（纯白色）
function createTriggerLine() {
    const geometry = new THREE.PlaneGeometry(LANES * LANE_WIDTH, 0.3);
    const material = new THREE.MeshBasicMaterial({ 
        color: 0xffffff, // 纯白色
        transparent: true,
        opacity: 0.8,
        side: THREE.DoubleSide
    });
    triggerLine = new THREE.Mesh(geometry, material);
    triggerLine.rotation.x = -Math.PI / 2;
    triggerLine.position.set(0, 0.02, 2);
    scene.add(triggerLine);
    
    // 取消发光效果和脉动动画
    window.triggerLineGlow = null;
    window.triggerLineMaterial = material;
}

// 拖尾效果数组
let trailPositions = [];
const trailLength = 10;
let trailSpheres = [];

// 创建玩家（半透明白色小球 + 微光边缘）
function createPlayer() {
    // 固定高画质球体细节
    const geometry = new THREE.SphereGeometry(0.25, GRAPHICS_CONFIG.playerSegments, GRAPHICS_CONFIG.playerSegments);
    
    const material = new THREE.MeshStandardMaterial({ 
        color: 0xffffff,
        emissive: 0xffffff,
        emissiveIntensity: 0.4,
        metalness: 0.3,
        roughness: 0.4,
        transparent: true,
        opacity: 0.95
    });
    player = new THREE.Mesh(geometry, material);
    player.position.set(0, 0.25, 0);
    player.castShadow = true;
    scene.add(player);
    
    // 创建拖尾球体
    for (let i = 0; i < GRAPHICS_CONFIG.trailLength; i++) {
        const trailGeometry = new THREE.SphereGeometry(0.2, GRAPHICS_CONFIG.trailSegments, GRAPHICS_CONFIG.trailSegments);
        const trailMaterial = new THREE.MeshBasicMaterial({
            color: 0xcccccc,
            transparent: true,
            opacity: 0
        });
        const trailSphere = new THREE.Mesh(trailGeometry, trailMaterial);
        scene.add(trailSphere);
        trailSpheres.push(trailSphere);
    }
}

// 更新拖尾效果
function updateTrail() {
    for (let i = 0; i < trailSpheres.length; i++) {
        if (i < trailPositions.length) {
            const pos = trailPositions[trailPositions.length - 1 - i];
            trailSpheres[i].position.set(pos.x, pos.y, pos.z);
            const opacity = (1 - i / GRAPHICS_CONFIG.trailLength) * 0.8;
            trailSpheres[i].material.opacity = opacity;
            const scale = (1 - i / GRAPHICS_CONFIG.trailLength) * 0.8;
            trailSpheres[i].scale.setScalar(scale);
        } else {
            trailSpheres[i].material.opacity = 0;
        }
    }
}

// 正确清理 Three.js 对象（防止内存泄漏）
function disposeObject(obj) {
    if (!obj) return;
    
    // 递归清理子对象
    if (obj.children && obj.children.length > 0) {
        for (let i = obj.children.length - 1; i >= 0; i--) {
            disposeObject(obj.children[i]);
        }
    }
    
    // 释放几何体
    if (obj.geometry) {
        obj.geometry.dispose();
    }
    
    // 释放材质
    if (obj.material) {
        if (Array.isArray(obj.material)) {
            obj.material.forEach(mat => {
                if (mat.map) mat.map.dispose();
                if (mat.lightMap) mat.lightMap.dispose();
                if (mat.bumpMap) mat.bumpMap.dispose();
                if (mat.normalMap) mat.normalMap.dispose();
                if (mat.specularMap) mat.specularMap.dispose();
                if (mat.envMap) mat.envMap.dispose();
                mat.dispose();
            });
        } else {
            if (obj.material.map) obj.material.map.dispose();
            if (obj.material.lightMap) obj.material.lightMap.dispose();
            if (obj.material.bumpMap) obj.material.bumpMap.dispose();
            if (obj.material.normalMap) obj.material.normalMap.dispose();
            if (obj.material.specularMap) obj.material.specularMap.dispose();
            if (obj.material.envMap) obj.material.envMap.dispose();
            obj.material.dispose();
        }
    }
    
    // 从场景中移除
    if (obj.parent) {
        obj.parent.remove(obj);
    }
}

// 批量清理对象数组
function cleanupObjects(objectArray) {
    if (!objectArray || objectArray.length === 0) return;
    
    const count = objectArray.length;
    
    // 如果是音符方块数组且对象池已初始化，归还到对象池
    if (objectArray === noteObjects && noteBlockPool) {
        console.log(`🔄 归还 ${count} 个对象到对象池`);
        for (let i = objectArray.length - 1; i >= 0; i--) {
            const obj = objectArray[i];
            // 从场景中移除
            if (obj.parent) {
                obj.parent.remove(obj);
            }
            // 归还到对象池
            noteBlockPool.release(obj);
        }
        console.log('🎱 对象池状态:', noteBlockPool.getStats());
    } else {
        // 其他对象直接销毁
        for (let i = objectArray.length - 1; i >= 0; i--) {
            disposeObject(objectArray[i]);
        }
    }
    
    objectArray.length = 0; // 清空数组
    
    // 如果清理的是音符方块，重置标志
    if (objectArray === noteObjects) {
        blocksCreated = false;
    }
}



// 更新玩家位置
function updatePlayer() {
    // 恒定速度移动到目标轨道
    if (currentLane !== targetLane) {
        const targetX = (targetLane - 2) * LANE_WIDTH;
        const currentX = player.position.x;
        const diff = targetX - currentX;
        
        // 使用恒定速度移动
        const moveDistance = moveSpeed * 60 * deltaTime; // 转换为每秒的速度
        
        if (Math.abs(diff) <= moveDistance) {
            // 距离很近，直接到达
            currentLane = targetLane;
            player.position.x = targetX;
        } else {
            // 按恒定速度移动
            const direction = diff > 0 ? 1 : -1;
            player.position.x += direction * moveDistance;
            // 更新当前轨道（用于显示）
            currentLane = (player.position.x / LANE_WIDTH) + 2;
        }
    } else {
        const targetX = (currentLane - 2) * LANE_WIDTH;
        player.position.x = targetX;
    }
    
    // 相机跟随玩家左右移动
    const cameraTargetX = player.position.x;
    camera.position.x += (cameraTargetX - camera.position.x) * 0.1;
    
    // 相机始终看向玩家前方
    camera.lookAt(player.position.x, 0, player.position.z - 8);
    
    // 更新跟随小球的点光源位置
    if (window.playerLight) {
        window.playerLight.position.set(player.position.x, player.position.y + 0.5, player.position.z);
    }
    
    // 跳跃物理 - 基于时间，使用重力系统
    if (isJumping) {
        // 使用 deltaTime 让跳跃在不同帧率下一致
        const gravityPerSecond = gravity * 60; // 转换为每秒的重力
        const velocityPerSecond = verticalVelocity * 60; // 转换为每秒的速度
        
        // 应用重力
        verticalVelocity += gravityPerSecond * deltaTime;
        player.position.y += velocityPerSecond * deltaTime;
        
        // 添加跳跃时的轻微旋转动画
        player.rotation.x = Math.min(verticalVelocity * 0.5, 0.3);
        
        // 落地
        if (player.position.y <= groundY) {
            player.position.y = groundY;
            isJumping = false;
            verticalVelocity = 0;
            player.rotation.x = 0;
            player.scale.set(1, 1, 1);
            
            // 落地时的轻微压缩效果
            player.scale.set(1.1, 0.9, 1.1);
            setTimeout(() => {
                if (!isJumping) {
                    player.scale.set(1, 1, 1);
                }
            }, 100);
        }
    }
    
    // 确保在地面时恢复正常状态
    if (!isJumping) {
        player.scale.set(1, 1, 1);
        player.position.y = groundY;
    }
    
    // 添加拖尾效果
    trailPositions.push({
        x: player.position.x,
        y: player.position.y,
        z: player.position.z
    });
    
    if (trailPositions.length > trailLength) {
        trailPositions.shift();
    }
    
    // 更新拖尾球体
    updateTrail();
}

// 跳跃函数 - 极速响应，在空中只能快速下落
function jump() {
    // 在地面：向上跳
    if (player.position.y <= groundY + 0.01) {
        isJumping = true;
        verticalVelocity = jumpForce;
    } 
    // 在空中：快速下落（不能二段跳）
    else {
        verticalVelocity = -jumpForce;
    }
}



// 更新地面（地面不移动，仅保留函数以保持兼容性）
function updateGround() {
    // 地面静止不动
}

// 更新音符方块
function updateNoteBlocks() {
    const triggerZ = triggerLine.position.z;
    const triggerWindow = 0.2; // 触发窗口
    const playerLane = Math.round(currentLane);
    
    // 更新道具系统
    if (itemSpawner && gameRunning) {
        const currentTime = performance.now();
        const moveSpeed = originalBaseSpeed * speedMultiplier * 60;
        itemSpawner.update(currentTime, deltaTime, moveSpeed);
        
        // 检查道具碰撞（传入玩家半径0.25）
        itemSpawner.checkCollision(player.position, currentLane, 0.25, (itemType) => {
            handleItemCollect(itemType);
        });
    }
    
    // 更新血量条位置
    if (healthSystem && healthSystem.containerElement) {
        healthSystem.updatePosition();
    }
    
    // === 统一时间控制系统（使用音频时钟消除累积误差）===
    // 使用音频时钟计算当前游戏时间，减去暂停的总时长
    const currentGameTime = audioEngine.audioContext.currentTime - gameStartTime - totalPausedDuration;
    
    // 定义迷雾边缘（视野范围）- 根据当前雾距离动态计算
    // 雾效果的 far 值决定了可见范围，fogEdgeZ 应该基于此计算
    const currentFogFar = scene.fog ? scene.fog.far : 120;
    const fogEdgeZ = -currentFogFar * 0.4; // 迷雾边缘约为雾距离的40%
    const renderDistance = 10; // 提前渲染的距离（在迷雾边缘前10个单位开始渲染）
    
    // 视锥剔除：批量检查所有音符方块的可见性
    if (renderManager && renderManager.frustumCuller) {
        renderManager.frustumCuller.cullObjects(noteObjects);
    }
    
    for (let i = noteObjects.length - 1; i >= 0; i--) {
        const noteBlock = noteObjects[i];
        const noteData = noteBlock.userData.noteData;
        
        // LOD几何体切换（如果需要）
        if (noteBlock.userData.needsLODUpdate) {
            const isTall = noteBlock.userData.isTall;
            const lodLevel = noteBlock.userData.currentLOD || 'high';
            const geometries = getSharedGeometry(isTall, lodLevel);
            
            noteBlock.geometry = geometries.block;
            if (noteBlock.children.length > 0) {
                noteBlock.children[0].geometry = geometries.edges;
            }
            
            noteBlock.userData.needsLODUpdate = false;
        }
        
        // 基于音频时钟计算黑块的精确位置（消除累积误差）
        // 黑块应该在 noteData.time / speedMultiplier 秒后到达触发线
        // 当前已经过了 currentGameTime 秒
        // 剩余时间 = noteData.time / speedMultiplier - currentGameTime
        // 黑块位置 = 触发线位置 - (剩余时间 × 移动速度)
        const timeToTrigger = noteData.time / speedMultiplier;
        const remainingTime = timeToTrigger - currentGameTime;
        const moveSpeed = originalBaseSpeed * speedMultiplier * 60;
        noteBlock.position.z = triggerZ - (remainingTime * moveSpeed);
        
        // 距离阴影剔除：为超过50单位的物体禁用阴影投射
        const distanceToCamera = Math.abs(noteBlock.position.z - camera.position.z);
        noteBlock.castShadow = distanceToCamera <= 50;
        
        // 检查是否进入视野范围（到达迷雾边缘）
        if (!noteBlock.userData.isRendered && noteBlock.position.z >= fogEdgeZ - renderDistance) {
            // 黑块到达迷雾边缘，开始渲染
            noteBlock.userData.isRendered = true;
            noteBlock.visible = true;
            scene.add(noteBlock);
        }
        
        // 检查是否与玩家碰撞（只对可见物体执行）
        if (!noteData.collided && noteData.lane === playerLane && noteBlock.visible) {
            const distanceToPlayer = Math.abs(noteBlock.position.z - player.position.z);
            
            if (distanceToPlayer < 1.0) {
                const isTall = noteBlock.userData.isTall;
                const blockHeight = noteBlock.userData.blockHeight;
                
                // 玩家的上下边界（小球半径0.25）
                const playerTop = player.position.y + 0.25;
                const playerBottom = player.position.y - 0.25;
                
                // 方块的上下边界
                const blockTop = noteBlock.position.y + blockHeight / 2;
                const blockBottom = noteBlock.position.y - blockHeight / 2;
                
                // 检测碰撞：玩家和方块在垂直方向有重叠
                if (playerBottom < blockTop && playerTop > blockBottom) {
                    // 碰撞了！
                    noteData.collided = true;
                    collisions++;
                    // 碰撞重度震动
                    triggerVibration([100, 50, 100]); // 震动100ms，停50ms，再震动100ms
                    
                    // 记录碰撞的黑块
                    lastCollisionBlock = noteBlock;
                    
                    // 改变颜色表示碰撞
                    noteBlock.material.color.setHex(0xff0000);
                    noteBlock.material.emissive.setHex(0xff0000);
                    
                    // 游戏结束
                    gameOver();
                    return;
                }
            }
        }
        
        // 检查是否通过触发线（自动触发）（只对可见物体执行）
        // 记录上一帧的位置，检测是否刚刚通过触发线
        const lastZ = noteBlock.userData.lastZ || -1000;
        noteBlock.userData.lastZ = noteBlock.position.z;
        
        // 如果上一帧在触发线前面，这一帧在触发线后面，说明刚刚通过
        if (!noteData.triggered && lastZ < triggerZ && noteBlock.position.z >= triggerZ && noteBlock.visible) {
            
            noteData.triggered = true;
            notesTriggered++;
            // 触发黑块不加分
            // score += 100;
            
            // 不再播放钢琴音符，背景音乐会自动播放
            // audioEngine.playNote(noteData.note, noteData.duration, noteData.velocity, noteData.lane);
            
            // 改变颜色表示已触发（纯白色不透明）
            noteBlock.material.color.setHex(0xffffff);
            noteBlock.material.emissive = new THREE.Color(0xffffff);
            noteBlock.material.emissiveIntensity = 0.5;
            noteBlock.material.transparent = false;
            noteBlock.material.opacity = 1.0;
            
            // 创建触发时的光波扩散效果（已禁用）
            // createTriggerWave(noteBlock.position.x, noteBlock.position.z);
            
            // 触发效果：先变白色，然后放大并淡出
            // 清除之前的动画（如果存在）
            if (noteBlock.userData.scaleInterval) {
                clearInterval(noteBlock.userData.scaleInterval);
            }
            
            const originalScale = { x: 1.5, y: 0.4, z: 1.2 };
            let scaleTime = 0;
            noteBlock.userData.scaleInterval = setInterval(() => {
                scaleTime += 0.05;
                const scale = 1 + scaleTime * 2;
                noteBlock.scale.set(originalScale.x * scale, originalScale.y * scale, originalScale.z * scale);
                noteBlock.material.opacity = Math.max(0, 1 - scaleTime * 2);
                if (scaleTime >= 0.5) {
                    clearInterval(noteBlock.userData.scaleInterval);
                    noteBlock.userData.scaleInterval = null;
                }
            }, 50);
        }
        
        // 移除屏幕外的方块（归还到对象池）
        if (noteBlock.position.z > 10) {
            // 清除正在运行的动画
            if (noteBlock.userData.scaleInterval) {
                clearInterval(noteBlock.userData.scaleInterval);
                noteBlock.userData.scaleInterval = null;
            }
            
            // 从场景中移除
            if (noteBlock.parent) {
                noteBlock.parent.remove(noteBlock);
            }
            // 归还到对象池
            if (noteBlockPool) {
                noteBlockPool.release(noteBlock);
            } else {
                disposeObject(noteBlock);
            }
            noteObjects.splice(i, 1);
        }
    }
    
    // 检查是否所有音符都已处理
    if (noteObjects.length === 0 && notesTriggered > 0 && !isCompletingRound) {
        // 完成游戏！
        isCompletingRound = true;
        completeGame();
    }
}

// 碰撞检测（仅用于MIDI模式，已在updateNoteBlocks中处理）
function checkCollision() {
    return false;
}

// 震动反馈辅助函数
function triggerVibration(pattern) {
    if (navigator.vibrate) {
        navigator.vibrate(pattern);
    }
}

// 道具拾取处理
function handleItemCollect(itemType) {
    const config = ItemConfig[itemType];
    
    // 处理血量变化
    if (config.healthChange && healthSystem) {
        healthSystem.changeHealth(config.healthChange);
        
        // 扣血重度震动
        if (config.healthChange < 0) {
            triggerVibration([100, 50, 100]); // 震动100ms，停50ms，再震动100ms
        }
    }
    
    // 处理分数变化
    if (config.scoreChange) {
        score += config.scoreChange;
        
        // 加分轻微震动
        if (config.scoreChange > 0) {
            triggerVibration(30); // 震动30ms
        }
        // 扣分重度震动
        else if (config.scoreChange < 0) {
            triggerVibration([100, 50, 100]); // 震动100ms，停50ms，再震动100ms
        }
    }
    
    // 处理拼图碎片
    if (config.puzzlePieceChange && puzzlePieceSystem) {
        puzzlePieceSystem.add(config.puzzlePieceChange);
        
        // 拾取拼图碎片轻微震动
        if (config.puzzlePieceChange > 0) {
            triggerVibration(30); // 震动30ms
        }
    }
    
    // 显示提示
    showItemCollectNotification(config);
    
    console.log(`✨ 拾取道具: ${config.name}`);
}

// 显示道具拾取提示
function showItemCollectNotification(config) {
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 150px;
        left: 50%;
        transform: translateX(-50%);
        color: white;
        font-size: 20px;
        font-weight: 700;
        z-index: 1000;
        animation: slideDown 0.3s ease;
        pointer-events: none;
        text-shadow: 0 2px 8px rgba(0, 0, 0, 0.8), 0 0 20px rgba(255, 255, 255, 0.5);
    `;
    
    let text = config.emoji;
    if (config.healthChange) {
        text += ` ${config.healthChange > 0 ? '+' : ''}${config.healthChange}`;
    }
    if (config.scoreChange) {
        text += ` ${config.scoreChange > 0 ? '+' : ''}${config.scoreChange}`;
    }
    if (config.puzzlePieceChange) {
        text += ` +${config.puzzlePieceChange}`;
    }
    
    notification.textContent = text;
    document.body.appendChild(notification);
    
    // 2秒后移除
    setTimeout(() => {
        notification.style.animation = 'slideUp 0.3s ease';
        setTimeout(() => {
            if (notification.parentNode) {
                document.body.removeChild(notification);
            }
        }, 300);
    }, 2000);
}

// 完成游戏
function completeGame() {
    gameRunning = false;
    gameOverElement.style.display = 'block';
    instructionsElement.style.display = 'none';
    
    // 隐藏实时分数
    updateLiveScore();
    
    // 停止并清理道具
    if (itemSpawner) {
        itemSpawner.stop();
        itemSpawner.clear();
    }
    
    // 停止背景音乐
    if (audioEngine && audioEngine.bgmIsPlaying) {
        audioEngine.stopBGM();
    }
    
    // 计算准确率
    const accuracy = totalNotes > 0 ? Math.round(((totalNotes - collisions) / totalNotes) * 100) : 100;
    
    // 更新游戏结束界面
    updateGameOverUI('完美通关！🎉', '🎉', accuracy);
    
    // 保存成绩到云端
    if (typeof saveGameScore === 'function') {
        saveGameScore();
    }
}

// 游戏结束（碰撞死亡）
function gameOver() {
    gameRunning = false;
    gameOverElement.style.display = 'block';
    instructionsElement.style.display = 'none';
    
    // 隐藏实时分数
    updateLiveScore();
    
    // 停止并清理道具
    if (itemSpawner) {
        itemSpawner.stop();
        itemSpawner.clear();
    }
    
    // 暂停背景音乐
    if (audioEngine && audioEngine.bgmIsPlaying) {
        audioEngine.pauseBGM();
    }
    
    // 计算准确率
    const accuracy = totalNotes > 0 ? Math.round(((totalNotes - collisions) / totalNotes) * 100) : 0;
    
    // 更新游戏结束界面
    updateGameOverUI('游戏结束', '💔', accuracy);
    
    // 保存成绩到云端
    if (typeof saveGameScore === 'function') {
        saveGameScore();
    }
}

// 血量耗尽游戏结束
function gameOverByHealth() {
    gameRunning = false;
    gameOverElement.style.display = 'block';
    instructionsElement.style.display = 'none';
    
    // 隐藏实时分数
    updateLiveScore();
    
    // 停止并清理道具
    if (itemSpawner) {
        itemSpawner.stop();
        itemSpawner.clear();
    }
    
    // 暂停背景音乐
    if (audioEngine && audioEngine.bgmIsPlaying) {
        audioEngine.pauseBGM();
    }
    
    // 计算准确率
    const accuracy = totalNotes > 0 ? Math.round(((totalNotes - collisions) / totalNotes) * 100) : 0;
    
    // 更新游戏结束界面
    updateGameOverUI('血量耗尽', '💔', accuracy);
    
    // 保存成绩到云端
    if (typeof saveGameScore === 'function') {
        saveGameScore();
    }
}

// 更新游戏结束界面
function updateGameOverUI(title, icon, accuracy) {
    // 更新标题和图标
    const gameOverTitle = document.getElementById('gameOverTitle');
    const gameOverIcon = document.getElementById('gameOverIcon');
    if (gameOverTitle) gameOverTitle.textContent = title;
    if (gameOverIcon) gameOverIcon.textContent = icon;
    
    // 更新分数
    const finalScoreEl = document.getElementById('finalScore');
    if (finalScoreEl) finalScoreEl.textContent = score;
    
    // 更新触发音符
    const finalNotesEl = document.getElementById('finalNotes');
    if (finalNotesEl) finalNotesEl.textContent = `${notesTriggered}/${totalNotes}`;
    
    // 更新准确率
    const finalAccuracyEl = document.getElementById('finalAccuracy');
    if (finalAccuracyEl) finalAccuracyEl.textContent = `${accuracy}%`;
    
    // 更新最大连击
    const finalComboEl = document.getElementById('finalCombo');
    if (finalComboEl) finalComboEl.textContent = notesTriggered; // 简化版，使用触发数作为连击
    
    // 更新歌曲名称
    const finalSongNameEl = document.getElementById('finalSongName');
    if (finalSongNameEl) {
        finalSongNameEl.textContent = currentMidiName || '未知歌曲';
    }
}

// 游戏结束界面点击返回
gameOverElement.addEventListener('click', async function() {
    // 播放点击音效
    if (audioEngine && audioEngine.playClickSound) {
        audioEngine.playClickSound();
    }
    
    // 隐藏游戏结束界面
    gameOverElement.style.display = 'none';
    
    // 清除所有游戏数据
    await cleanupGameData();
    
    // 显示开始按钮
    showStartButton();
});

// 清除所有游戏数据
async function cleanupGameData() {
    console.log('🧹 清除游戏数据...');
    
    // 停止游戏
    gameRunning = false;
    
    // 停止并清理道具
    if (itemSpawner) {
        itemSpawner.stop();
        itemSpawner.clear();
    }
    
    // 停止背景音乐
    if (audioEngine) {
        if (audioEngine.bgmIsPlaying) {
            audioEngine.stopBGM();
        }
        // 停止所有音符
        audioEngine.stopAllNotes();
    }
    
    // 清理所有音符方块
    if (noteObjects && noteObjects.length > 0) {
        cleanupObjects(noteObjects);
        blocksCreated = false;
    }
    
    // 清理血量UI
    if (healthSystem && healthSystem.containerElement) {
        healthSystem.destroy();
    }
    
    // 重置游戏变量
    score = 0;
    notesTriggered = 0;
    totalNotes = 0;
    collisions = 0;
    speedMultiplier = 1.0;
    isCompletingRound = false;
    lastCollisionBlock = null;
    
    // 重置玩家位置
    if (player) {
        player.position.set(0, groundY, 0);
        currentLane = 2;
        targetLane = 2;
        isJumping = false;
        verticalVelocity = 0;
    }
    
    // 清空拖尾
    trailPositions = [];
    
    // 隐藏实时分数
    if (typeof updateLiveScore === 'function') {
        updateLiveScore();
    }
    
    console.log('✅ 游戏数据已清除');
}

// 显示开始按钮
function showStartButton() {
    const startButton = document.getElementById('startButton');
    if (startButton) {
        startButton.style.display = 'block';
        console.log('▶️ 开始按钮已显示');
        
        // 重新绑定事件监听器（因为之前被移除了）
        bindStartButtonEvents(startButton);
    }
    
    // 展开灵动岛，显示音乐选择器
    if (typeof dynamicIsland !== 'undefined') {
        dynamicIsland.classList.add('expanded');
        isIslandExpanded = true;
        
        // 切换到音乐标签
        setTimeout(() => {
            const musicTab = document.querySelector('.island-tab[data-tab="music"]');
            if (musicTab) musicTab.click();
        }, 100);
    }
}

// 绑定开始按钮事件
function bindStartButtonEvents(startButton) {
    // 定义开始游戏函数
    const startGame = async (e) => {
        if (e) e.preventDefault();
        
        // 移除事件监听器，防止重复点击
        startButton.removeEventListener('click', startGame);
        startButton.removeEventListener('touchstart', startGame);
        startButton.style.display = 'none';
        
        // 显示加载界面
        loadingElement.style.display = 'flex';
        
        // 初始化游戏启动加载管理器
        const gameStartLoader = {
            total: 3,
            current: 0,
            
            updateProgress(step) {
                this.current = step;
                const percentage = Math.round((this.current / this.total) * 100);
                loadingPercentage.textContent = `${percentage}%`;
                loadingProgressBar.style.width = `${percentage}%`;
            }
        };
        
        try {
            // 步骤1：启动音频引擎
            gameStartLoader.updateProgress(0);
            await audioEngine.start();
            
            // 播放点击音效
            if (audioEngine && audioEngine.playClickSound) {
                audioEngine.playClickSound();
            }
            
            await new Promise(resolve => setTimeout(resolve, 200));
            
            // 步骤2：处理音符数据和加载背景音乐
            gameStartLoader.updateProgress(1);
            await new Promise(resolve => {
                requestAnimationFrame(() => {
                    if (preloadedMidiData[currentMidiIndex]) {
                        processMIDINotes(preloadedMidiData[currentMidiIndex].notes);
                        currentMidiName = preloadedMidiData[currentMidiIndex].name;
                        updateIslandTitle(currentMidiName);
                    }
                    resolve();
                });
            });
            
            // 加载背景音乐
            const audioPath = midiFiles[currentMidiIndex].replace('.mid', '.mp3');
            await audioEngine.loadBGM(audioPath);
            
            await new Promise(resolve => setTimeout(resolve, 200));
            
            // 步骤3：创建游戏场景
            gameStartLoader.updateProgress(2);
            
            // 预先创建所有方块（带进度）
            await createAllNoteBlocksWithProgress((progress) => {
                const percentage = Math.round(66 + (progress * 34));
                loadingPercentage.textContent = `${percentage}%`;
                loadingProgressBar.style.width = `${percentage}%`;
            });
            
            // 完成
            gameStartLoader.updateProgress(3);
            await new Promise(resolve => setTimeout(resolve, 300));
            
            // 隐藏加载界面
            loadingElement.style.display = 'none';
            
            // 开始游戏
            startMIDIGame();
            
            // 播放开始音效
            audioEngine.playStartSound();
            
        } catch (error) {
            console.error('游戏启动失败:', error);
            setTimeout(() => {
                loadingElement.style.display = 'none';
                startButton.style.display = 'block';
                // 重新绑定事件
                bindStartButtonEvents(startButton);
            }, 2000);
        }
    };
    
    // 绑定事件监听器
    startButton.addEventListener('click', startGame);
    startButton.addEventListener('touchstart', startGame, { passive: false });
    
    console.log('✅ 开始按钮事件已绑定');
}

// 重新开始
async function restart() {
    // 显示加载界面
    loadingElement.style.display = 'flex';
    
    // 初始化重启加载管理器
    const restartLoader = {
        total: 3,
        current: 0,
        
        updateProgress(step) {
            this.current = step;
            const percentage = Math.round((this.current / this.total) * 100);
            loadingPercentage.textContent = `${percentage}%`;
            loadingProgressBar.style.width = `${percentage}%`;
        }
    };
    
    try {
        // 步骤1：清理场景
        restartLoader.updateProgress(0);
        await new Promise(resolve => {
            requestAnimationFrame(() => {
                cleanupObjects(noteObjects);
                blocksCreated = false;
                resolve();
            });
        });
        await new Promise(resolve => setTimeout(resolve, 200));
        
        // 步骤2：重置游戏状态
        restartLoader.updateProgress(1);
        await new Promise(resolve => {
            requestAnimationFrame(() => {
                // 重置游戏状态
                score = 0;
                currentLane = 2;
                targetLane = 2;
                
                // 重置MIDI状态
                notesTriggered = 0;
                collisions = 0;
                speedMultiplier = 1.0;
                isCompletingRound = false;
                midiSpeed = originalBaseSpeed;
                
                // 重置音符状态
                midiNotes.forEach(note => {
                    note.triggered = false;
                    note.collided = false;
                });
                
                // 重置 UI
                scoreElement.textContent = `音符: 0/${totalNotes}`;
                distanceElement.textContent = `准确率: 100%`;
                accuracyElement.textContent = `剩余: ${totalNotes}`;
                comboElement.style.display = 'none';
                gameOverElement.style.display = 'none';
                instructionsElement.style.display = 'block';
                
                // 重置玩家位置和状态
                player.position.set(0, 0.6, 0);
                player.scale.set(1, 1, 1);
                isJumping = false;
                verticalVelocity = 0;
                
                // 重置血量系统
                if (healthSystem) {
                    healthSystem.reset();
                }
                
                // 清理道具
                if (itemSpawner) {
                    itemSpawner.clear();
                    itemSpawner.stop();
                }
                
                resolve();
            });
        });
        await new Promise(resolve => setTimeout(resolve, 200));
        
        // 步骤3：重新创建音符方块
        restartLoader.updateProgress(2);
        // 使用音频时钟作为游戏时间基准
        gameStartTime = audioEngine.audioContext.currentTime;
        gamePausedTime = 0;
        totalPausedDuration = 0;
        
        // 重新创建所有方块（带进度）
        await createAllNoteBlocksWithProgress((progress) => {
            const percentage = Math.round(66 + (progress * 34)); // 66%-100%
            loadingPercentage.textContent = `${percentage}%`;
            loadingProgressBar.style.width = `${percentage}%`;
        });
        
        // 完成
        restartLoader.updateProgress(3);
        await new Promise(resolve => setTimeout(resolve, 300));
        
        // 隐藏加载界面
        loadingElement.style.display = 'none';
        
        // 停止旧的背景音乐
        if (audioEngine) {
            audioEngine.stopBGM();
        }
        
        // 启动道具生成器
        if (itemSpawner) {
            itemSpawner.start();
        }
        
        // 开始游戏
        gameRunning = true;
        // 使用音频时钟作为游戏时间基准
        gameStartTime = audioEngine.audioContext.currentTime;
        gamePausedTime = 0;
        totalPausedDuration = 0;
        
        // 播放背景音乐（计算提前播放时间）
        if (audioEngine && audioEngine.bgmBuffer) {
            let audioStartTime = 0;
            const firstNoteTime = midiNotes[0].time;
            
            // 计算黑块到达触发线需要的游戏时间（速度重置为1.0x）
            const gameTimeToTrigger = firstNoteTime / 1.0;
            
            // 计算音频开始时间
            audioStartTime = firstNoteTime - gameTimeToTrigger;
            
            console.log(`🎵 重新开始：音频从 ${audioStartTime.toFixed(2)}秒 开始`);
            
            audioEngine.playBGM(audioStartTime, 1.0);
        }
        
    } catch (error) {
        console.error('重新开始失败:', error);
        loadingElement.style.display = 'none';
        gameRunning = true;
    }
}

// 窗口大小调整
function onWindowResize() {
    const aspect = window.innerWidth / window.innerHeight;
    camera.aspect = aspect;
    // 根据屏幕比例调整FOV
    camera.fov = aspect < 1 ? 75 : 60;
    camera.updateProjectionMatrix();
    renderer.setPixelRatio(GRAPHICS_CONFIG.pixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    
    // 更新后处理系统的渲染目标大小
    if (renderManager && renderManager.postProcessing) {
        renderManager.postProcessing.onWindowResize();
    }
}

// 游戏主循环
let lastUpdateTime = 0;
let deltaTime = 0;

function animate(currentTime) {
    requestAnimationFrame(animate);
    
    // 性能监控 - 开始帧计时
    if (renderManager && renderManager.performanceMonitor) {
        renderManager.performanceMonitor.beginFrame();
    }
    
    // 计算时间差（秒）- 优化高帧率下的精度
    if (lastUpdateTime === 0) {
        lastUpdateTime = currentTime;
    }
    deltaTime = (currentTime - lastUpdateTime) / 1000; // 转换为秒
    
    // 限制deltaTime防止异常值（例如切换标签页后）
    // 120fps = 8.33ms per frame, 允许最大3倍的波动
    deltaTime = Math.min(deltaTime, 0.025); // 最大25ms (40fps)
    
    lastUpdateTime = currentTime;
    
    // 更新FPS统计
    updateFPS(currentTime);
    
    // 120帧模式：无帧率限制，完全依赖浏览器刷新率
    
    lastFrameTime = currentTime;
    
    if (!gameRunning) {
        // 即使游戏未运行，也更新渲染系统和渲染
        if (renderManager) {
            renderManager.update(deltaTime);
            renderManager.render();
        } else {
            renderer.render(scene, camera);
        }
        
        // 性能监控 - 结束帧计时
        if (renderManager && renderManager.performanceMonitor) {
            renderManager.performanceMonitor.endFrame();
        }
        return;
    }
    
    // 更新渲染系统（视锥剔除、LOD等）
    if (renderManager) {
        renderManager.update(deltaTime);
    }
    
    // 更新游戏元素
    updatePlayer();
    updateGround();
    
    // 更新MIDI音符方块
    if (midiNotes.length > 0) {
        updateNoteBlocks();
    }
    
    // 更新分数和UI（MIDI模式）
    if (midiNotes.length > 0) {
        const accuracy = totalNotes > 0 ? Math.round(((totalNotes - collisions) / totalNotes) * 100) : 100;
        scoreElement.textContent = `音符: ${notesTriggered}/${totalNotes}`;
        distanceElement.textContent = `准确率: ${accuracy}%`;
        accuracyElement.textContent = `方块: ${noteObjects.length}`;
        
        // 更新实时分数显示
        updateLiveScore();
    }
    
    // 使用渲染管理器渲染
    if (renderManager) {
        renderManager.render();
    } else {
        renderer.render(scene, camera);
    }
    
    // 性能监控 - 结束帧计时
    if (renderManager && renderManager.performanceMonitor) {
        renderManager.performanceMonitor.endFrame();
        
        // 更新性能统计UI
        const stats = renderManager.getPerformanceStats();
        if (typeof updatePerformanceUI === 'function') {
            updatePerformanceUI(stats);
        }
    }
}

// 键盘控制
document.addEventListener('keydown', (e) => {
    if (!gameRunning) return;
    
    if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
        if (targetLane > 0) {
            targetLane--;
        }
    } else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
        if (targetLane < LANES - 1) {
            targetLane++;
        }
    } else if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W' || e.key === ' ') {
        // 上键或空格 = 跳跃或反转
        jump();
    } else if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') {
        // 下键 = 跳跃或反转（同样的效果）
        jump();
    }
});

// 触摸控制（移动设备）- 阻止浏览器默认行为
let touchStartX = 0;
let touchStartY = 0;

document.addEventListener('touchstart', (e) => {
    // 检查是否点击了灵动岛
    const island = document.getElementById('dynamicIsland');
    if (island && island.contains(e.target)) {
        // 点击了灵动岛，不阻止默认行为
        return;
    }
    
    // 只在游戏运行时阻止默认行为
    if (gameRunning) {
        e.preventDefault();
        touchStartX = e.touches[0].clientX;
        touchStartY = e.touches[0].clientY;
    }
}, { passive: false });

document.addEventListener('touchmove', (e) => {
    // 检查是否在灵动岛上
    const island = document.getElementById('dynamicIsland');
    if (island && island.contains(e.target)) {
        return;
    }
    
    // 只在游戏运行时阻止默认行为
    if (gameRunning) {
        e.preventDefault();
    }
}, { passive: false });

document.addEventListener('touchend', (e) => {
    // 检查是否点击了灵动岛
    const island = document.getElementById('dynamicIsland');
    if (island && island.contains(e.target)) {
        // 点击了灵动岛，不处理游戏逻辑
        return;
    }
    
    const touchEndX = e.changedTouches[0].clientX;
    const touchEndY = e.changedTouches[0].clientY;
    const diffX = touchEndX - touchStartX;
    const diffY = touchEndY - touchStartY;
    
    // 判断是滑动还是点击
    if (Math.abs(diffX) > 30 || Math.abs(diffY) > 30) {
        // 滑动操作
        if (Math.abs(diffX) > Math.abs(diffY)) {
            // 左右滑动切换轨道（只在游戏运行时）
            if (gameRunning) {
                e.preventDefault();
                if (diffX > 0 && targetLane < LANES - 1) {
                    targetLane++;
                } else if (diffX < 0 && targetLane > 0) {
                    targetLane--;
                }
            }
        }
    } else {
        // 点击操作
        // 优先级1：如果灵动岛展开，点击空白处收起界面并继续游戏
        if (isIslandExpanded) {
            e.preventDefault();
            // 调用toggleIsland统一处理收起逻辑
            toggleIsland();
            return;
        }
        
        // 优先级2：游戏运行时，点击跳跃
        if (gameRunning) {
            e.preventDefault();
            jump();
        }
    }
}, { passive: false });

// 切换MIDI文件的冷却时间
let lastSwitchTime = 0;
const SWITCH_COOLDOWN = 1000; // 1秒冷却时间

// 阻止浏览器的下拉刷新和其他手势
document.addEventListener('gesturestart', (e) => {
    e.preventDefault();
});

document.addEventListener('gesturechange', (e) => {
    e.preventDefault();
});

document.addEventListener('gestureend', (e) => {
    e.preventDefault();
});



// ============================================================================
// WebGL上下文丢失处理
// ============================================================================

/**
 * 显示错误提示
 * @param {string} message - 错误消息
 * @param {string} type - 错误类型 ('error' | 'warning' | 'info')
 */
function showError(message, type = 'error') {
    // 检查是否已存在错误提示
    let errorElement = document.getElementById('webgl-error');
    
    if (!errorElement) {
        // 创建错误提示元素
        errorElement = document.createElement('div');
        errorElement.id = 'webgl-error';
        errorElement.style.cssText = `
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
            font-size: 16px;
            z-index: 10001;
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
            max-width: 400px;
            text-align: center;
            border: 2px solid rgba(255, 100, 100, 0.5);
        `;
        document.body.appendChild(errorElement);
    }
    
    // 根据类型设置边框颜色
    if (type === 'warning') {
        errorElement.style.borderColor = 'rgba(255, 200, 100, 0.5)';
    } else if (type === 'info') {
        errorElement.style.borderColor = 'rgba(100, 150, 255, 0.5)';
    } else {
        errorElement.style.borderColor = 'rgba(255, 100, 100, 0.5)';
    }
    
    // 设置消息内容
    errorElement.innerHTML = `
        <div style="font-size: 48px; margin-bottom: 15px;">
            ${type === 'error' ? '⚠️' : type === 'warning' ? '⚡' : 'ℹ️'}
        </div>
        <div style="font-size: 18px; font-weight: bold; margin-bottom: 10px;">
            ${type === 'error' ? '渲染错误' : type === 'warning' ? '性能警告' : '提示'}
        </div>
        <div style="font-size: 14px; color: rgba(255, 255, 255, 0.8); line-height: 1.6;">
            ${message}
        </div>
    `;
    
    errorElement.style.display = 'block';
}

/**
 * 隐藏错误提示
 */
function hideError() {
    const errorElement = document.getElementById('webgl-error');
    if (errorElement) {
        errorElement.style.transition = 'opacity 0.5s';
        errorElement.style.opacity = '0';
        setTimeout(() => {
            if (errorElement.parentNode) {
                errorElement.parentNode.removeChild(errorElement);
            }
        }, 500);
    }
}

// WebGL上下文丢失事件处理
let webglContextLost = false;
let contextRestoreAttempts = 0;
const MAX_RESTORE_ATTEMPTS = 3;

/**
 * WebGL上下文丢失处理
 */
function handleWebGLContextLost(event) {
    event.preventDefault();
    console.error('❌ WebGL上下文丢失');
    
    webglContextLost = true;
    
    // 暂停游戏
    if (gameRunning) {
        gameRunning = false;
        
        // 暂停背景音乐
        if (audioEngine && audioEngine.bgmIsPlaying) {
            audioEngine.pauseBGM();
        }
    }
    
    // 显示错误提示
    showError('渲染引擎出现问题，正在尝试恢复...', 'warning');
    
    // 1秒后尝试恢复
    setTimeout(() => {
        if (renderer && renderer.forceContextRestore) {
            console.log('🔄 尝试恢复WebGL上下文...');
            contextRestoreAttempts++;
            renderer.forceContextRestore();
        }
    }, 1000);
}

/**
 * WebGL上下文恢复处理
 */
function handleWebGLContextRestored() {
    console.log('✅ WebGL上下文已恢复');
    
    webglContextLost = false;
    
    try {
        // 重新初始化渲染系统
        if (renderManager) {
            console.log('🔄 重新初始化渲染系统...');
            renderManager.initialize();
        }
        
        // 隐藏错误提示
        hideError();
        
        // 显示成功消息
        showError('渲染引擎已恢复！游戏将继续...', 'info');
        
        setTimeout(() => {
            hideError();
            
            // 恢复游戏（如果之前在运行）
            if (!gameRunning && midiNotes.length > 0) {
                // 不自动恢复游戏，让用户手动重新开始
                console.log('💡 请点击重新开始按钮继续游戏');
            }
        }, 2000);
        
        // 重置恢复尝试计数
        contextRestoreAttempts = 0;
        
    } catch (error) {
        console.error('❌ 渲染系统恢复失败:', error);
        showError('渲染引擎恢复失败，请刷新页面重试。', 'error');
    }
}

/**
 * WebGL上下文创建失败处理
 */
function handleWebGLContextCreationError(event) {
    console.error('❌ WebGL上下文创建失败:', event.statusMessage);
    
    showError(
        'WebGL初始化失败。<br>' +
        '可能原因：<br>' +
        '• 浏览器不支持WebGL<br>' +
        '• 显卡驱动需要更新<br>' +
        '• 硬件加速被禁用<br><br>' +
        '请尝试更新浏览器或启用硬件加速。',
        'error'
    );
}

// 在init函数中添加WebGL上下文事件监听器
function setupWebGLErrorHandlers() {
    if (!renderer || !renderer.domElement) {
        console.warn('⚠️ 渲染器未初始化，无法设置WebGL错误处理');
        return;
    }
    
    const canvas = renderer.domElement;
    
    // 监听WebGL上下文丢失事件
    canvas.addEventListener('webglcontextlost', handleWebGLContextLost, false);
    
    // 监听WebGL上下文恢复事件
    canvas.addEventListener('webglcontextrestored', handleWebGLContextRestored, false);
    
    // 监听WebGL上下文创建失败事件
    canvas.addEventListener('webglcontextcreationerror', handleWebGLContextCreationError, false);
    
    console.log('✅ WebGL错误处理已设置');
}

// ========== 设置功能 ==========

// 音量控制
let masterVolume = 1.0; // 主音量 (0.0 - 1.0)

function initVolumeControl() {
    const volumeSlider = document.getElementById('volumeSlider');
    const volumeValue = document.getElementById('volumeValue');
    
    if (!volumeSlider || !volumeValue) return;
    
    // 初始化音量
    volumeSlider.value = masterVolume * 100;
    volumeValue.textContent = Math.round(masterVolume * 100) + '%';
    
    // 监听音量变化
    volumeSlider.addEventListener('input', (e) => {
        const volume = parseInt(e.target.value);
        masterVolume = volume / 100;
        volumeValue.textContent = volume + '%';
        
        // 更新音频引擎音量
        if (audioEngine && audioEngine.setMasterVolume) {
            audioEngine.setMasterVolume(masterVolume);
        }
        
        console.log(`🔊 音量调整为: ${volume}%`);
    });
}

// 初始化标签页和设置
setTimeout(() => {
    initIslandTabs();
    initVolumeControl();
    initMusicSearch();
    initRandomMidiButton();
    initCloseButtons();
}, 1000);

// ========== 灵动岛功能 ==========

// 更新灵动岛标题
function updateIslandTitle(name) {
    if (name) {
        islandTitle.textContent = name;
    } else {
        // 从 auth-system.js 获取认证状态
        const displayUsername = document.getElementById('displayUsername');
        if (displayUsername && displayUsername.textContent !== '未登录') {
            islandTitle.textContent = `欢迎，${displayUsername.textContent}`;
        } else {
            islandTitle.textContent = '点击登录或注册';
        }
    }
}

// 标签页切换功能
function initIslandTabs() {
    const tabs = document.querySelectorAll('.island-tab');
    const tabContents = document.querySelectorAll('.island-tab-content');
    
    tabs.forEach(tab => {
        tab.addEventListener('click', (e) => {
            e.stopPropagation();
            const targetTab = tab.dataset.tab;
            
            // 播放点击音效
            if (audioEngine && audioEngine.playClickSound) {
                audioEngine.playClickSound();
            }
            
            // 移除所有active类
            tabs.forEach(t => t.classList.remove('active'));
            tabContents.forEach(tc => tc.classList.remove('active'));
            
            // 添加active类到当前标签
            tab.classList.add('active');
            
            // 显示对应内容
            if (targetTab === 'music') {
                document.getElementById('musicTab').classList.add('active');
            } else if (targetTab === 'user') {
                document.getElementById('userTab').classList.add('active');
            } else if (targetTab === 'settings') {
                document.getElementById('settingsTab').classList.add('active');
            }
        });
    });
}

// 初始化 MIDI 列表
function initMidiList(filterText = '') {
    midiList.innerHTML = '';
    
    // 过滤歌曲列表
    const filteredFiles = midiFiles.filter((file, index) => {
        if (!filterText) return true;
        const fileName = file.split('/').pop().replace('.mid', '').toLowerCase();
        return fileName.includes(filterText.toLowerCase());
    });
    
    // 如果没有匹配结果，显示提示
    if (filteredFiles.length === 0) {
        const noResult = document.createElement('div');
        noResult.style.cssText = 'color: rgba(255,255,255,0.5); text-align: center; padding: 20px; font-size: 14px;';
        noResult.textContent = '😕 没有找到匹配的歌曲';
        midiList.appendChild(noResult);
        return;
    }
    
    // 显示匹配的歌曲
    filteredFiles.forEach((file) => {
        const index = midiFiles.indexOf(file);
        const musicName = file.split('/').pop().replace('.mid', '');
        const isUnlocked = musicUnlockSystem ? musicUnlockSystem.isUnlocked(musicName) : true;
        
        const item = document.createElement('div');
        item.className = 'midi-item';
        if (index === currentMidiIndex) {
            item.classList.add('active');
        }
        
        const cover = document.createElement('div');
        cover.className = 'midi-cover';
        cover.textContent = isUnlocked ? '🎵' : '🔒';
        
        // 如果锁定，添加锁定样式
        if (!isUnlocked) {
            cover.style.background = 'linear-gradient(135deg, #666 0%, #444 100%)';
            cover.style.opacity = '0.6';
        }
        
        const name = document.createElement('div');
        name.className = 'midi-name';
        name.textContent = musicName;
        
        item.appendChild(cover);
        item.appendChild(name);
        
        // 点击事件
        item.addEventListener('click', (e) => {
            e.stopPropagation();
            
            if (!isUnlocked) {
                // 显示解锁提示
                showUnlockDialog(musicName, index);
            } else if (index !== currentMidiIndex) {
                // 切换音乐
                selectMidi(index);
            }
        });
        
        midiList.appendChild(item);
    });
    
    // 自动滚动到当前播放的音乐（居中显示）
    scrollToCurrentMidi();
}

// 显示解锁对话框
function showUnlockDialog(musicName, musicIndex) {
    const puzzleCount = puzzlePieceSystem ? puzzlePieceSystem.getCount() : 0;
    const unlockCost = musicUnlockSystem ? musicUnlockSystem.unlockCost : 25;
    const canUnlock = puzzleCount >= unlockCost;
    
    // 创建遮罩层
    const overlay = document.createElement('div');
    overlay.id = 'unlockDialogOverlay';
    overlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.5);
        z-index: 9999;
        backdrop-filter: blur(5px);
    `;
    
    // 创建对话框
    const dialog = document.createElement('div');
    dialog.id = 'unlockDialog';
    dialog.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: rgba(0, 0, 0, 0.95);
        backdrop-filter: blur(20px);
        padding: 30px;
        border-radius: 20px;
        border: 2px solid rgba(255, 255, 255, 0.3);
        z-index: 10000;
        text-align: center;
        min-width: 300px;
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
    `;
    
    dialog.innerHTML = `
        <div style="font-size: 48px; margin-bottom: 15px;">🔒</div>
        <div style="color: #fff; font-size: 18px; font-weight: 600; margin-bottom: 10px;">${musicName}</div>
        <div style="color: rgba(255, 255, 255, 0.7); font-size: 14px; margin-bottom: 20px;">
            需要 ${unlockCost} 个拼图碎片解锁
        </div>
        <div style="display: flex; align-items: center; justify-content: center; gap: 8px; margin-bottom: 20px; padding: 12px; background: rgba(255, 255, 255, 0.1); border-radius: 10px;">
            <span style="font-size: 24px;">🧩</span>
            <span style="color: #fff; font-size: 16px;">你有:</span>
            <span style="color: ${canUnlock ? '#4ade80' : '#ef4444'}; font-size: 20px; font-weight: 700;">${puzzleCount}</span>
        </div>
        <div style="display: flex; gap: 10px;">
            <button id="cancelUnlock" style="flex: 1; padding: 12px; background: rgba(255, 255, 255, 0.1); border: 1px solid rgba(255, 255, 255, 0.3); border-radius: 10px; color: #fff; font-size: 14px; font-weight: 600; cursor: pointer;">
                取消
            </button>
            <button id="confirmUnlock" style="flex: 1; padding: 12px; background: ${canUnlock ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' : 'rgba(100, 100, 100, 0.5)'}; border: none; border-radius: 10px; color: #fff; font-size: 14px; font-weight: 600; cursor: ${canUnlock ? 'pointer' : 'not-allowed'}; opacity: ${canUnlock ? '1' : '0.5'};">
                ${canUnlock ? '解锁' : '拼图不足'}
            </button>
        </div>
    `;
    
    // 添加到页面
    document.body.appendChild(overlay);
    document.body.appendChild(dialog);
    
    // 阻止对话框内部点击事件冒泡
    dialog.addEventListener('click', (e) => {
        e.stopPropagation();
    });
    
    // 关闭对话框的函数
    const closeDialog = () => {
        if (overlay.parentNode) {
            document.body.removeChild(overlay);
        }
        if (dialog.parentNode) {
            document.body.removeChild(dialog);
        }
    };
    
    // 点击遮罩层关闭对话框
    overlay.addEventListener('click', closeDialog);
    
    // 取消按钮
    document.getElementById('cancelUnlock').addEventListener('click', (e) => {
        e.stopPropagation();
        closeDialog();
    });
    
    // 解锁按钮
    if (canUnlock) {
        document.getElementById('confirmUnlock').addEventListener('click', async (e) => {
            e.stopPropagation();
            
            const result = await musicUnlockSystem.unlock(musicName, puzzlePieceSystem);
            
            if (result.success) {
                // 解锁成功
                closeDialog();
                
                // 显示成功提示
                showUnlockSuccessNotification(musicName);
                
                // 刷新音乐列表
                initMidiList();
                
                // 自动选择刚解锁的音乐
                setTimeout(() => {
                    selectMidi(musicIndex);
                }, 1000);
            } else {
                alert(result.error);
            }
        });
    }
}

// 显示解锁成功提示
function showUnlockSuccessNotification(musicName) {
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 100px;
        left: 50%;
        transform: translateX(-50%);
        background: rgba(74, 222, 128, 0.9);
        backdrop-filter: blur(10px);
        color: white;
        padding: 16px 32px;
        border-radius: 12px;
        font-size: 16px;
        font-weight: 600;
        z-index: 10001;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
        animation: slideDown 0.3s ease;
        pointer-events: none;
    `;
    
    notification.innerHTML = `
        <div style="display: flex; align-items: center; gap: 10px;">
            <span style="font-size: 24px;">🎉</span>
            <div>
                <div style="font-size: 14px; opacity: 0.9;">解锁成功！</div>
                <div style="font-size: 16px; font-weight: 700;">${musicName}</div>
            </div>
        </div>
    `;
    
    document.body.appendChild(notification);
    
    // 3秒后移除
    setTimeout(() => {
        notification.style.animation = 'slideUp 0.3s ease';
        setTimeout(() => {
            if (notification.parentNode) {
                document.body.removeChild(notification);
            }
        }, 300);
    }, 3000);
}

// 滚动到当前音乐（居中显示）
function scrollToCurrentMidi() {
    // 使用 requestAnimationFrame 确保 DOM 已更新
    requestAnimationFrame(() => {
        const container = document.querySelector('.midi-list-container');
        const activeItem = document.querySelector('.midi-item.active');
        
        if (!container || !activeItem) return;
        
        // 计算需要滚动的位置，使当前音乐居中
        const containerWidth = container.offsetWidth;
        const itemLeft = activeItem.offsetLeft;
        const itemWidth = activeItem.offsetWidth;
        
        // 计算居中位置：元素左边距 + 元素宽度的一半 - 容器宽度的一半
        const scrollPosition = itemLeft + (itemWidth / 2) - (containerWidth / 2);
        
        // 平滑滚动到目标位置
        container.scrollTo({
            left: scrollPosition,
            behavior: 'smooth'
        });
    });
}

// 初始化搜索功能
function initMusicSearch() {
    const searchInput = document.getElementById('musicSearch');
    if (!searchInput) return;
    
    // 监听输入事件
    searchInput.addEventListener('input', (e) => {
        const searchText = e.target.value.trim();
        initMidiList(searchText);
    });
    
    // 阻止搜索框的点击事件冒泡（防止关闭灵动岛）
    searchInput.addEventListener('click', (e) => {
        e.stopPropagation();
    });
    
    // 清空搜索框时重置列表
    searchInput.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            searchInput.value = '';
            initMidiList();
        }
    });
}

// 初始化随机选择按钮
function initRandomMidiButton() {
    const randomBtn = document.getElementById('randomMidiBtn');
    if (!randomBtn) return;
    
    randomBtn.addEventListener('click', (e) => {
        e.stopPropagation(); // 防止关闭灵动岛
        
        // 只从已解锁的音乐中随机选择
        if (!musicUnlockSystem) {
            console.warn('音乐解锁系统未初始化');
            return;
        }
        
        const unlockedMusic = musicUnlockSystem.getUnlockedMusic();
        if (unlockedMusic.length <= 1) {
            console.log('已解锁的歌曲不足，无法随机选择');
            return;
        }
        
        // 获取当前音乐名称
        const currentMusicName = midiFiles[currentMidiIndex].split('/').pop().replace('.mid', '');
        
        // 从已解锁音乐中随机选择（排除当前音乐）
        const availableMusic = unlockedMusic.filter(name => name !== currentMusicName);
        if (availableMusic.length === 0) {
            console.log('没有其他已解锁的歌曲');
            return;
        }
        
        const randomMusicName = availableMusic[Math.floor(Math.random() * availableMusic.length)];
        
        // 找到对应的索引
        const randomIndex = midiFiles.findIndex(file => 
            file.split('/').pop().replace('.mid', '') === randomMusicName
        );
        
        if (randomIndex !== -1) {
            console.log(`🎲 随机选择: ${randomMusicName}`);
            selectMidi(randomIndex);
        }
    });
}

// 初始化关闭按钮
function initCloseButtons() {
    const closeButtons = document.querySelectorAll('.close-button');
    closeButtons.forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation(); // 防止事件冒泡
            
            // 播放点击音效
            if (audioEngine && audioEngine.playClickSound) {
                audioEngine.playClickSound();
            }
            
            // 收起灵动岛
            if (isIslandExpanded) {
                toggleIsland();
            }
        });
    });
}

// 选择 MIDI 文件 - 随时可点击
async function selectMidi(index) {
    // 检查冷却时间
    const now = Date.now();
    if (now - lastSwitchTime < SWITCH_COOLDOWN) {
        console.log('切换太快，请稍候...');
        return;
    }
    lastSwitchTime = now;
    
    console.log('🔄 开始切换 MIDI 文件...');
    
    // 先收起动画
    dynamicIsland.classList.remove('expanded');
    isIslandExpanded = false;
    
    // 立即停止游戏
    gameRunning = false;
    
    // 停止背景音乐
    if (audioEngine && audioEngine.bgmIsPlaying) {
        audioEngine.stopBGM();
        console.log('🎵 停止当前背景音乐');
    }
    
    // === 第一步：立即清理所有旧数据 ===
    console.log('🧹 步骤1: 清理旧场景对象...');
    cleanupObjects(noteObjects);
    blocksCreated = false;
    
    // 清理旧的 MIDI 数据
    midiNotes = [];
    totalNotes = 0;
    notesTriggered = 0;
    collisions = 0;
    
    // 清理道具
    if (itemSpawner) {
        itemSpawner.clear();
        itemSpawner.stop();
    }
    
    // 清理拖尾效果
    trailPositions = [];
    trailSpheres.forEach(sphere => {
        sphere.material.opacity = 0;
    });
    
    // 重置游戏状态
    score = 0;
    speedMultiplier = 1.0;
    isCompletingRound = false;
    
    // 重置玩家位置
    player.position.set(0, groundY, 0);
    player.scale.set(1, 1, 1);
    isJumping = false;
    verticalVelocity = 0;
    currentLane = 2;
    targetLane = 2;
    
    // 隐藏游戏结束界面
    gameOverElement.style.display = 'none';
    
    // 输出清理后的内存状态
    console.log('✅ 清理完成！内存状态:', {
        几何体: renderer.info.memory.geometries,
        纹理: renderer.info.memory.textures,
        场景物体: scene.children.length,
        音符方块: noteObjects.length,
        MIDI数据: midiNotes.length
    });
    
    // 等待一帧，确保清理完成
    await new Promise(resolve => requestAnimationFrame(resolve));
    
    // === 第二步：加载新的 MIDI 文件 ===
    console.log('📥 步骤3: 加载新 MIDI 文件...');
    currentMidiIndex = index;
    const success = await loadMidiFile(currentMidiIndex);
    
    if (success) {
        // 显示播放按钮，等待用户点击
        const startButton = document.getElementById('startButton');
        startButton.style.display = 'block';
        
        // 更新列表中的选中状态
        initMidiList();
        
        // 移除所有旧的事件监听器（通过克隆节点）
        const newStartButton = startButton.cloneNode(true);
        startButton.parentNode.replaceChild(newStartButton, startButton);
        
        // 设置播放按钮点击事件
        const startGame = async (e) => {
            if (e) e.preventDefault();
            newStartButton.style.display = 'none';
            
            // 显示加载界面
            loadingElement.style.display = 'flex';
            
            // 初始化游戏启动加载管理器
            const gameStartLoader = {
                total: 3,
                current: 0,
                
                updateProgress(step, message) {
                    this.current = step;
                    const percentage = Math.round((this.current / this.total) * 100);
                    loadingPercentage.textContent = `${percentage}%`;
                    loadingProgressBar.style.width = `${percentage}%`;
                    loadingText.textContent = message;
                }
            };
            
            try {
                // 步骤1：启动音频引擎
                gameStartLoader.updateProgress(0, '');
                await audioEngine.start();
                console.log('✅ 音频上下文已启动');
                
                // 播放点击音效（音频上下文启动后）
                if (audioEngine && audioEngine.playClickSound) {
                    audioEngine.playClickSound();
                }
                
                await new Promise(resolve => setTimeout(resolve, 200));
                
                // 步骤2：处理音符数据
                gameStartLoader.updateProgress(1, '');
                await new Promise(resolve => {
                    requestAnimationFrame(() => {
                        // 重置音符状态
                        midiNotes.forEach(note => {
                            note.triggered = false;
                            note.collided = false;
                        });
                        resolve();
                    });
                });
                
                await new Promise(resolve => setTimeout(resolve, 200));
                
                // 步骤3：创建游戏场景
                gameStartLoader.updateProgress(2, '');
                
                // 预先创建所有方块（带进度）
                await createAllNoteBlocksWithProgress((progress) => {
                    const percentage = Math.round(66 + (progress * 34));
                    loadingPercentage.textContent = `${percentage}%`;
                    loadingProgressBar.style.width = `${percentage}%`;
                });
                
                // 完成
                gameStartLoader.updateProgress(3, '');
                await new Promise(resolve => setTimeout(resolve, 300));
                
                // 隐藏加载界面
                loadingElement.style.display = 'none';
                
                // 开始游戏（startMIDIGame 会设置 gameStartTime）
                midiSpeed = originalBaseSpeed;
                startMIDIGame();
                
                // 播放开始音效
                audioEngine.playStartSound();
                
            } catch (error) {
                console.error('游戏启动失败:', error);
                setTimeout(() => {
                    loadingElement.style.display = 'none';
                    newStartButton.style.display = 'block';
                }, 2000);
            }
        };
        
        newStartButton.addEventListener('click', startGame);
        newStartButton.addEventListener('touchstart', startGame, { passive: false });
    }
}

// 切换灵动岛展开/收起（带暂停/继续功能）
function toggleIsland() {
    if (isIslandExpanded) {
        // 收起 → 继续游戏
        dynamicIsland.classList.remove('expanded');
        isIslandExpanded = false;
        if (!gameRunning && wasGameRunningBeforePause) {
            // 计算暂停的时长
            if (gamePausedTime > 0) {
                const pauseDuration = audioEngine.audioContext.currentTime - gamePausedTime;
                totalPausedDuration += pauseDuration;
                console.log(`⏱️ 暂停时长: ${pauseDuration.toFixed(2)}秒，累计: ${totalPausedDuration.toFixed(2)}秒`);
                gamePausedTime = 0;
            }
            
            gameRunning = true;
            // 恢复背景音乐
            if (audioEngine && audioEngine.bgmPauseTime > 0) {
                audioEngine.resumeBGM();
                console.log('🎵 灵动岛收起，恢复音频播放');
            }
        }
    } else {
        // 展开 → 暂停游戏
        dynamicIsland.classList.add('expanded');
        isIslandExpanded = true;
        wasGameRunningBeforePause = gameRunning;
        
        if (gameRunning) {
            // 记录暂停时间点
            gamePausedTime = audioEngine.audioContext.currentTime;
            gameRunning = false;
            console.log(`⏸️ 游戏暂停在: ${gamePausedTime.toFixed(2)}秒`);
        }
        
        // 暂停背景音乐
        if (audioEngine && audioEngine.bgmIsPlaying) {
            audioEngine.pauseBGM();
            console.log('🎵 灵动岛展开，暂停音频播放');
        }
        // 初始化列表
        if (midiFiles.length > 0) {
            initMidiList();
        }
    }
}

// 灵动岛点击事件
dynamicIsland.addEventListener('click', (e) => {
    // 如果点击的是胶囊本身（未展开状态）
    if (!isIslandExpanded) {
        toggleIsland();
    }
});

// 点击空白处关闭（优先级最高）
document.addEventListener('click', (e) => {
    // 检查是否点击了解锁对话框或其内部元素
    const unlockDialog = document.getElementById('unlockDialog');
    const unlockOverlay = document.getElementById('unlockDialogOverlay');
    
    // 如果解锁对话框存在，不处理灵动岛的收起
    if (unlockDialog || unlockOverlay) {
        return;
    }
    
    if (isIslandExpanded && !dynamicIsland.contains(e.target)) {
        e.preventDefault();
        e.stopPropagation();
        // 调用toggleIsland统一处理收起逻辑
        toggleIsland();
    }
}, true); // 使用捕获阶段，优先处理

// 阻止灵动岛内部点击冒泡
dynamicIsland.addEventListener('click', (e) => {
    if (isIslandExpanded) {
        e.stopPropagation();
    }
});

// 创建触发时的光波扩散效果
function createTriggerWave(x, z) {
    const waveGeometry = new THREE.RingGeometry(0.5, 0.8, 32);
    const waveMaterial = new THREE.MeshBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.8,
        side: THREE.DoubleSide
    });
    const wave = new THREE.Mesh(waveGeometry, waveMaterial);
    wave.rotation.x = -Math.PI / 2;
    wave.position.set(x, 0.05, z);
    scene.add(wave);
    
    // 扩散动画
    let scale = 1;
    let opacity = 0.8;
    const expandInterval = setInterval(() => {
        scale += 0.3;
        opacity -= 0.08;
        wave.scale.set(scale, scale, 1);
        waveMaterial.opacity = Math.max(0, opacity);
        
        if (opacity <= 0) {
            clearInterval(expandInterval);
            scene.remove(wave);
            waveGeometry.dispose();
            waveMaterial.dispose();
        }
    }, 30);
}

// 全局清理函数（调试用）
window.forceCleanup = function() {
    console.log('🧹 强制清理所有数据...');
    
    // 停止游戏
    gameRunning = false;
    
    // 清理所有对象
    cleanupObjects(noteObjects);
    
    // 清理数据
    midiNotes = [];
    totalNotes = 0;
    notesTriggered = 0;
    blocksCreated = false;
    
    // 清理拖尾
    trailPositions = [];
    trailSpheres.forEach(sphere => {
        sphere.material.opacity = 0;
    });
    
    console.log('✅ 强制清理完成！', {
        几何体: renderer.info.memory.geometries,
        纹理: renderer.info.memory.textures,
        场景物体: scene.children.length,
        音符方块: noteObjects.length,
        MIDI数据: midiNotes.length
    });
};

// 等待 Supabase 初始化后再启动游戏
async function startGame() {
    // 确保 Supabase 已初始化
    if (typeof initSupabase === 'function') {
        const supabaseReady = initSupabase();
        if (!supabaseReady) {
            console.warn('⚠️ Supabase 未配置，继续以离线模式运行');
        } else {
            console.log('✅ Supabase 已就绪');
        }
    }
    
    // 启动游戏（先初始化场景，再预加载资源）
    init();
    animate(performance.now());
    
    // 立即开始预加载所有资源
    await preloadAllResources();
}

// 启动游戏
startGame();


// 初始化认证界面
function initAuthInterface() {
    const dynamicIsland = document.getElementById('dynamicIsland');
    const authTabs = document.querySelectorAll('.auth-tab');
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');
    const loginBtn = document.getElementById('loginBtn');
    const registerBtn = document.getElementById('registerBtn');
    const logoutBtn = document.getElementById('logoutBtn');
    
    // 认证标签页切换
    authTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const targetTab = tab.dataset.authTab;
            
            // 切换标签激活状态
            authTabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            
            // 切换表单显示
            if (targetTab === 'login') {
                loginForm.classList.add('active');
                registerForm.classList.remove('active');
            } else {
                registerForm.classList.add('active');
                loginForm.classList.remove('active');
            }
        });
    });
    
    // 登录按钮
    loginBtn.addEventListener('click', handleLogin);
    
    // 注册按钮
    registerBtn.addEventListener('click', handleRegister);
    
    // 退出登录按钮
    if (logoutBtn) {
        logoutBtn.addEventListener('click', logout);
    }
    
    // 回车键提交
    document.getElementById('loginPassword').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleLogin();
    });
    
    document.getElementById('registerPasswordConfirm').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleRegister();
    });
}

// 旧的本地存储认证函数已移除
// 旧的本地存储认证系统已完全移除
// 现在使用 auth-system.js 中的 Supabase 认证系统

// 页面加载时初始化
window.addEventListener('DOMContentLoaded', () => {
    initAuthInterface();
    checkAuthStatus();
});
