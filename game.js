// ========== 像素纹理生成系统 ==========
class PixelTextureGenerator {
    /**
     * 创建纯色像素纹理
     * @param {number} color - 颜色值（十六进制）
     * @param {number} size - 纹理尺寸（默认16x16）
     * @returns {THREE.Texture}
     */
    static createSolidTexture(color, size = 16) {
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        
        // 填充纯色
        ctx.fillStyle = '#' + color.toString(16).padStart(6, '0');
        ctx.fillRect(0, 0, size, size);
        
        const texture = new THREE.CanvasTexture(canvas);
        texture.magFilter = THREE.NearestFilter;
        texture.minFilter = THREE.NearestFilter;
        texture.needsUpdate = true;
        
        return texture;
    }
    
    /**
     * 创建精灵纹理（从像素数据数组）
     * @param {Array} spriteData - 二维数组，每个元素是颜色索引
     * @param {Object} colorMap - 颜色映射表 {索引: 颜色值}
     * @param {number} pixelSize - 每个像素的实际大小（默认1）
     * @returns {THREE.Texture}
     */
    static createSpriteTexture(spriteData, colorMap, pixelSize = 1) {
        const height = spriteData.length;
        const width = spriteData[0].length;
        const canvas = document.createElement('canvas');
        canvas.width = width * pixelSize;
        canvas.height = height * pixelSize;
        const ctx = canvas.getContext('2d');
        
        // 绘制每个像素
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const colorIndex = spriteData[y][x];
                if (colorIndex === 0 || colorIndex === 'transparent') {
                    // 透明像素，跳过
                    continue;
                }
                
                const color = colorMap[colorIndex];
                if (color) {
                    ctx.fillStyle = color;
                    ctx.fillRect(x * pixelSize, y * pixelSize, pixelSize, pixelSize);
                }
            }
        }
        
        const texture = new THREE.CanvasTexture(canvas);
        texture.magFilter = THREE.NearestFilter;
        texture.minFilter = THREE.NearestFilter;
        texture.needsUpdate = true;
        
        return texture;
    }
    
    /**
     * 创建重复图案纹理
     * @param {Array} pattern - 图案数据（二维数组）
     * @param {Object} colorMap - 颜色映射表
     * @param {number} size - 纹理尺寸（默认32x32）
     * @returns {THREE.Texture}
     */
    static createPatternTexture(pattern, colorMap, size = 32) {
        const patternHeight = pattern.length;
        const patternWidth = pattern[0].length;
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        
        // 计算每个图案单元的大小
        const cellWidth = Math.floor(size / patternWidth);
        const cellHeight = Math.floor(size / patternHeight);
        
        // 绘制图案
        for (let y = 0; y < patternHeight; y++) {
            for (let x = 0; x < patternWidth; x++) {
                const colorIndex = pattern[y][x];
                if (colorIndex === 0 || colorIndex === 'transparent') {
                    continue;
                }
                
                const color = colorMap[colorIndex];
                if (color) {
                    ctx.fillStyle = color;
                    ctx.fillRect(x * cellWidth, y * cellHeight, cellWidth, cellHeight);
                }
            }
        }
        
        const texture = new THREE.CanvasTexture(canvas);
        texture.magFilter = THREE.NearestFilter;
        texture.minFilter = THREE.NearestFilter;
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        texture.needsUpdate = true;
        
        return texture;
    }
}

// ========== 像素色板定义 ==========
const PIXEL_PALETTE = {
    // 主色调
    SKY_BLUE: 0x87CEEB,
    CLOUD_WHITE: 0xF0F8FF,
    GROUND_BROWN: 0x8B4513,
    
    // 角色色
    WUKONG_GOLD: 0xFFD700,
    WUKONG_RED: 0xFF4500,
    WUKONG_SKIN: 0xFFE4B5,
    WUKONG_BROWN: 0x8B4513,
    WUKONG_BLACK: 0x000000,
    
    // 音符方块色
    MONSTER_RED: 0xFF0000,
    MONSTER_PURPLE: 0x9400D3,
    MONSTER_GREEN: 0x00FF00,
    MONSTER_BLUE: 0x0000FF,
    OBSTACLE_ORANGE: 0xFF8C00,
    
    // UI色
    UI_GOLD: 0xFFD700,
    UI_BROWN: 0x8B4513,
    UI_RED: 0xFF4500,
    
    // 特效色
    EFFECT_WHITE: 0xFFFFFF,
    EFFECT_YELLOW: 0xFFFF00,
    EFFECT_ORANGE: 0xFFA500
};

// ========== 孙悟空精灵像素数据 (16x16) ==========
const WUKONG_SPRITE = [
    [0,0,0,0,0,1,1,1,1,1,1,0,0,0,0,0],
    [0,0,0,1,1,1,1,1,1,1,1,1,1,0,0,0],
    [0,0,1,1,2,2,2,2,2,2,2,2,1,1,0,0],
    [0,1,1,2,2,2,2,2,2,2,2,2,2,1,1,0],
    [0,1,2,2,3,3,2,2,2,2,3,3,2,2,1,0],
    [0,1,2,2,3,3,2,2,2,2,3,3,2,2,1,0],
    [0,1,2,2,2,2,2,3,3,2,2,2,2,2,1,0],
    [0,1,2,2,2,2,3,3,3,3,2,2,2,2,1,0],
    [0,0,1,2,2,2,2,2,2,2,2,2,2,1,0,0],
    [0,0,1,1,2,2,2,2,2,2,2,2,1,1,0,0],
    [0,0,0,1,1,1,1,1,1,1,1,1,1,0,0,0],
    [0,0,0,0,4,4,4,4,4,4,4,4,0,0,0,0],
    [0,0,0,4,4,4,4,4,4,4,4,4,4,0,0,0],
    [0,0,4,4,4,4,4,4,4,4,4,4,4,4,0,0],
    [0,0,5,5,5,0,0,0,0,0,0,5,5,5,0,0],
    [0,0,5,5,5,0,0,0,0,0,0,5,5,5,0,0]
];

// 孙悟空颜色映射
const WUKONG_COLORS = {
    0: 'transparent',
    1: '#8B4513', // 棕色（头发/头箍）
    2: '#FFE4B5', // 肤色
    3: '#000000', // 黑色（眼睛/嘴巴）
    4: '#FF4500', // 红色（衣服）
    5: '#FFD700'  // 金色（鞋子）
};

// ========== 妖怪精灵像素数据 ==========
// 妖怪1 - 牛魔王 (16x16)
const MONSTER_SPRITE_1 = [
    [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
    [0,0,0,1,1,0,0,0,0,0,0,1,1,0,0,0],
    [0,0,1,1,1,1,0,0,0,0,1,1,1,1,0,0],
    [0,1,1,2,2,1,1,0,0,1,1,2,2,1,1,0],
    [0,1,2,2,2,2,1,0,0,1,2,2,2,2,1,0],
    [0,0,1,2,2,1,1,1,1,1,1,2,2,1,0,0],
    [0,0,0,1,1,1,2,2,2,2,1,1,1,0,0,0],
    [0,0,0,1,2,2,2,2,2,2,2,2,1,0,0,0],
    [0,0,1,2,2,3,3,2,2,3,3,2,2,1,0,0],
    [0,0,1,2,2,3,3,2,2,3,3,2,2,1,0,0],
    [0,0,1,2,2,2,2,2,2,2,2,2,2,1,0,0],
    [0,0,1,2,2,2,4,4,4,4,2,2,2,1,0,0],
    [0,0,0,1,2,2,4,4,4,4,2,2,1,0,0,0],
    [0,0,0,0,1,1,2,2,2,2,1,1,0,0,0,0],
    [0,0,0,0,0,1,1,1,1,1,1,0,0,0,0,0],
    [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]
];

const MONSTER_1_COLORS = {
    0: 'transparent',
    1: '#8B4513', // 棕色（牛角）
    2: '#FF0000', // 红色（脸）
    3: '#FFFF00', // 黄色（眼睛）
    4: '#000000'  // 黑色（嘴巴）
};

// 妖怪2 - 白骨精 (16x16)
const MONSTER_SPRITE_2 = [
    [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
    [0,0,0,0,1,1,1,1,1,1,1,1,0,0,0,0],
    [0,0,0,1,1,1,1,1,1,1,1,1,1,0,0,0],
    [0,0,1,1,2,2,1,1,1,1,2,2,1,1,0,0],
    [0,0,1,2,2,2,2,1,1,2,2,2,2,1,0,0],
    [0,0,1,2,3,3,2,1,1,2,3,3,2,1,0,0],
    [0,0,1,2,3,3,2,1,1,2,3,3,2,1,0,0],
    [0,0,1,1,2,2,1,1,1,1,2,2,1,1,0,0],
    [0,0,0,1,1,1,1,1,1,1,1,1,1,0,0,0],
    [0,0,0,1,1,4,4,4,4,4,4,1,1,0,0,0],
    [0,0,0,1,1,1,4,4,4,4,1,1,1,0,0,0],
    [0,0,0,0,1,1,1,1,1,1,1,1,0,0,0,0],
    [0,0,0,0,1,1,1,1,1,1,1,1,0,0,0,0],
    [0,0,0,1,1,1,0,0,0,0,1,1,1,0,0,0],
    [0,0,0,1,1,0,0,0,0,0,0,1,1,0,0,0],
    [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]
];

const MONSTER_2_COLORS = {
    0: 'transparent',
    1: '#FFFFFF', // 白色（骨头）
    2: '#E0E0E0', // 浅灰（阴影）
    3: '#9400D3', // 紫色（眼睛）
    4: '#000000'  // 黑色（嘴巴）
};

// 妖怪3 - 蜘蛛精 (16x16)
const MONSTER_SPRITE_3 = [
    [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
    [0,0,0,0,0,1,1,1,1,1,1,0,0,0,0,0],
    [0,0,0,0,1,1,2,2,2,2,1,1,0,0,0,0],
    [0,0,0,1,1,2,2,2,2,2,2,1,1,0,0,0],
    [0,0,1,1,2,2,3,3,3,3,2,2,1,1,0,0],
    [0,1,1,2,2,3,4,4,4,4,3,2,2,1,1,0],
    [0,1,2,2,3,4,4,4,4,4,4,3,2,2,1,0],
    [0,1,2,2,3,4,5,5,5,5,4,3,2,2,1,0],
    [0,1,2,2,3,4,5,5,5,5,4,3,2,2,1,0],
    [0,1,2,2,3,4,4,4,4,4,4,3,2,2,1,0],
    [0,1,1,2,2,3,4,4,4,4,3,2,2,1,1,0],
    [0,0,1,1,2,2,3,3,3,3,2,2,1,1,0,0],
    [0,0,0,1,1,2,2,2,2,2,2,1,1,0,0,0],
    [0,0,1,0,0,1,1,1,1,1,1,0,0,1,0,0],
    [0,1,0,0,0,0,0,0,0,0,0,0,0,0,1,0],
    [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1]
];

const MONSTER_3_COLORS = {
    0: 'transparent',
    1: '#000000', // 黑色（腿）
    2: '#8B008B', // 深紫（身体外层）
    3: '#9400D3', // 紫色（身体）
    4: '#00FF00', // 绿色（眼睛区域）
    5: '#FF0000'  // 红色（眼睛）
};

// 妖怪精灵数组
const MONSTER_SPRITES = [
    { data: MONSTER_SPRITE_1, colors: MONSTER_1_COLORS },
    { data: MONSTER_SPRITE_2, colors: MONSTER_2_COLORS },
    { data: MONSTER_SPRITE_3, colors: MONSTER_3_COLORS }
];

// ========== 云层图案 (8x8) ==========
const CLOUD_PATTERN = [
    [0,0,1,1,1,1,0,0],
    [0,1,1,2,2,1,1,0],
    [1,1,2,2,2,2,1,1],
    [1,2,2,2,2,2,2,1],
    [1,2,2,2,2,2,2,1],
    [1,1,2,2,2,2,1,1],
    [0,1,1,2,2,1,1,0],
    [0,0,1,1,1,1,0,0]
];

const CLOUD_COLORS = {
    0: '#87CEEB', // 天蓝色（背景）
    1: '#E0F0FF', // 浅蓝白（云边缘）
    2: '#F0F8FF'  // 云白色（云中心）
};

// ========== 符文图案 (8x8) ==========
const RUNE_PATTERN = [
    [0,0,1,1,1,1,0,0],
    [0,1,2,2,2,2,1,0],
    [1,2,2,3,3,2,2,1],
    [1,2,3,2,2,3,2,1],
    [1,2,3,2,2,3,2,1],
    [1,2,2,3,3,2,2,1],
    [0,1,2,2,2,2,1,0],
    [0,0,1,1,1,1,0,0]
];

const RUNE_COLORS = {
    0: 'transparent',
    1: '#FF8C00', // 橙色（外圈）
    2: '#FFD700', // 金色（中圈）
    3: '#FFFF00'  // 黄色（内圈）
};

// Three.js 场景设置
let scene, camera, renderer;
let player, ground = [];
let groundTexture = null; // 保存地面纹理引用
let obstacles = [];
let coins = [];
let gameRunning = false;
let score = 0;
let distance = 0;
let speed = 0.3;
let currentLane = 2;
let targetLane = 2;

// MIDI 音乐系统
let midiParser = null;
let audioEngine = null;
let midiNotes = [];
let noteObjects = [];
let triggerLine = null;
let gameStartTime = 0;
let notesTriggered = 0;
let totalNotes = 0;
let collisions = 0;
let midiSpeed = 0.15; // MIDI模式的当前速度
let originalBaseSpeed = 0.15; // 原始基础速度（永远不变）
let speedMultiplier = 1.0; // 速度倍数
let starsEarned = 0; // 获得的星星数
let speedIncreaseRate = 0.000005; // 每帧速度增长率（更缓慢）
let isCompletingRound = false; // 防止重复触发完成
let lastCollisionBlock = null; // 记录最后碰撞的黑块

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
const instructionsElement = document.getElementById('instructions');

// 灵动岛元素
const dynamicIsland = document.getElementById('dynamicIsland');
const islandTitle = document.getElementById('islandTitle');
const midiList = document.getElementById('midiList');
let isIslandExpanded = false;
let wasGameRunningBeforePause = false; // 记录暂停前的游戏状态


// 游戏配置
const LANES = 5;
const LANE_WIDTH = 2;
const GROUND_LENGTH = 100;

// 统一的移动速度（调整这个值可以改变所有移动速度）
const moveSpeed = 0.50;

// 帧率检测和适配
let targetFPS = 60;
let lastFrameTime = performance.now();
let frameCount = 0;
let fpsCheckTime = 0;
let fpsHistory = [];
let currentFPS = 0;
let performanceMode = 'high'; // high, medium, low

function detectRefreshRate() {
    // 计算平均FPS
    const avgFPS = fpsHistory.reduce((a, b) => a + b, 0) / fpsHistory.length;
    
    if (avgFPS > 110) {
        targetFPS = 120;
        performanceMode = 'high';
    } else if (avgFPS > 80) {
        targetFPS = 90;
        performanceMode = 'high';
    } else if (avgFPS > 50) {
        targetFPS = 60;
        performanceMode = 'medium';
    } else {
        targetFPS = 60;
        performanceMode = 'low';
    }
    
    console.log(`检测到屏幕刷新率: ${targetFPS}Hz (平均FPS: ${avgFPS.toFixed(1)})`);
    console.log(`性能模式: ${performanceMode}`);
    fpsElement.textContent = `${targetFPS}Hz`;
    
    // 根据性能调整画质
    adjustQuality();
}

function adjustQuality() {
    if (performanceMode === 'low') {
        // 低端设备：关闭阴影，降低像素比
        renderer.shadowMap.enabled = false;
        renderer.setPixelRatio(1);
        scene.fog.far = 50; // 减少雾效范围
        console.log('已切换到低画质模式');
    } else if (performanceMode === 'medium') {
        // 中端设备：保持阴影，适中像素比
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
        console.log('已切换到中画质模式');
    }
    // high 模式保持原样
}

function updateFPS(currentTime) {
    const fps = Math.round(1000 / (currentTime - lastFrameTime));
    fpsHistory.push(fps);
    if (fpsHistory.length > 50) {
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
    scene.fog = new THREE.Fog(0x000000, 20, 80); // 黑色雾效，更远的距离
    
    // 创建相机 - 更宽的视角以显示完整的5条轨道
    const aspect = window.innerWidth / window.innerHeight;
    // 根据屏幕比例调整FOV，手机竖屏需要更大的FOV
    const fov = aspect < 1 ? 75 : 60;
    camera = new THREE.PerspectiveCamera(fov, aspect, 0.1, 1000);
    camera.position.set(0, 5.5, 8);
    camera.lookAt(0, 0, -8);
    
    // 创建渲染器 - 高画质设置（透明背景）
    const canvas = document.getElementById('gameCanvas');
    renderer = new THREE.WebGLRenderer({ 
        canvas: canvas,
        antialias: true,
        alpha: true, // 启用透明背景
        powerPreference: "high-performance",
        precision: "highp"
    });
    
    // 设置像素比以提高画质（最高2倍，避免过度消耗性能）
    const pixelRatio = Math.min(window.devicePixelRatio, 2);
    renderer.setPixelRatio(pixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    
    // 设置透明背景
    renderer.setClearColor(0x000000, 0); // 完全透明
    
    // 优化阴影设置
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    
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
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    scene.add(directionalLight);
    
    // 取消点光源，避免白色光柱
    window.playerLight = null;
    
    // 创建地面
    createGround();
    
    // 创建玩家
    createPlayer();
    
    // 窗口大小调整
    window.addEventListener('resize', onWindowResize);
    
    // 初始化MIDI系统
    initMIDISystem();
    
    loadingElement.style.display = 'none';
}

// 获取midi文件夹中的所有MIDI文件
async function getMidiFiles() {
    // 这里手动列出midi文件夹中的文件
    // 因为浏览器无法直接读取文件夹内容
    return [
        'midi/2025-09-08 17.35.08.mp3.mid',
        'midi/2025-11-16 23.35.43.mp3.mid',
        'midi/2025-11-19 17.06.11.mp3.mid',
        'midi/2025-11-19 17.06.53.mp3.mid',
        'midi/2025-11-19 17.07.45.mp3.mid'
        // 在这里添加更多MIDI文件
    ];
}

// 加载指定的MIDI文件
async function loadMidiFile(index) {
    try {
        loadingElement.style.display = 'block';
        loadingElement.textContent = '加载MIDI文件...';
        
        const fileName = midiFiles[index];
        const notes = await midiParser.loadMIDI(fileName + '?v=1');
        
        if (notes.length === 0) {
            console.error('MIDI文件中没有音符');
            return false;
        }
        
        // 处理音符数据
        processMIDINotes(notes);
        
        // 显示文件名（去掉路径和扩展名）
        currentMidiName = fileName.split('/').pop().replace('.mid', '');
        updateIslandTitle(currentMidiName);
        
        loadingElement.style.display = 'none';
        return true;
    } catch (error) {
        console.error('加载MIDI文件失败:', error);
        loadingElement.style.display = 'none';
        return false;
    }
}

// 初始化MIDI系统
async function initMIDISystem() {
    try {
        midiParser = new MIDIParser();
        audioEngine = new AudioEngine();
        
        // 获取MIDI文件列表
        midiFiles = await getMidiFiles();
        
        if (midiFiles.length === 0) {
            console.error('没有找到MIDI文件');
            startNormalGame();
            return;
        }
        
        // 随机选择一个MIDI文件
        currentMidiIndex = Math.floor(Math.random() * midiFiles.length);
        
        loadingElement.textContent = '加载MIDI文件...';
        
        // 加载选中的MIDI文件
        const success = await loadMidiFile(currentMidiIndex);
        
        if (!success) {
            startNormalGame();
            return;
        }
        

        
        // 暂时不加载音色，等用户点击播放按钮后再加载
        // 这样可以避免在没有用户交互时创建AudioContext
        
        console.log('MIDI加载完成，显示播放按钮');
        loadingElement.style.display = 'none';
        const startButton = document.getElementById('startButton');
        if (!startButton) {
            console.error('找不到播放按钮元素！');
            return;
        }
        startButton.style.display = 'block';
        
        // 等待用户点击开始按钮
        const startGame = async (e) => {
            console.log('播放按钮被点击');
            if (e) e.preventDefault();
            startButton.removeEventListener('click', startGame);
            startButton.removeEventListener('touchstart', startGame);
            startButton.style.display = 'none';
            
            // 检查audioEngine是否存在
            if (!audioEngine) {
                console.error('audioEngine 未初始化！');
                alert('音频引擎未初始化，请刷新页面');
                return;
            }
            
            console.log('audioEngine 存在:', audioEngine);
            
            // 显示加载提示
            loadingElement.style.display = 'block';
            loadingElement.textContent = '启动音频系统...';
            console.log('开始加载音色...');
            
            try {
                // 启动音频上下文
                console.log('启动音频上下文...');
                console.log('调用 audioEngine.start()...');
                await audioEngine.start();
                console.log('audioEngine.start() 返回了');
                console.log('音频上下文启动完成');
                
                loadingElement.textContent = '加载钢琴音色 0/30';
                
                // 加载钢琴音色（带进度显示）
                console.log('开始加载钢琴音色...');
                await audioEngine.init((loaded, total) => {
                    loadingElement.textContent = `加载钢琴音色 ${loaded}/${total}`;
                    console.log(`加载进度: ${loaded}/${total}`);
                });
                
                console.log('钢琴音色加载完成！');
                
                // 隐藏加载提示
                loadingElement.style.display = 'none';
                
                // 开始游戏
                startMIDIGame();
                
            } catch (error) {
                console.error('音频加载失败:', error);
                loadingElement.textContent = '加载失败，请刷新重试';
                setTimeout(() => {
                    loadingElement.style.display = 'none';
                    startButton.style.display = 'block';
                    startButton.addEventListener('click', startGame);
                    startButton.addEventListener('touchstart', startGame, { passive: false });
                }, 2000);
            }
        };
        startButton.addEventListener('click', startGame);
        startButton.addEventListener('touchstart', startGame, { passive: false });
        
    } catch (error) {
        console.error('加载失败:', error);
        loadingElement.textContent = '加载失败，使用普通模式';
        setTimeout(startNormalGame, 2000);
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
    
    console.log(`超高黑块分配完成：${notes.filter(n => n.isTall).length}/${notes.length}`);
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
    
    console.log(`轨道调整完成：调整了 ${adjustCount} 个黑块`);
}

// 处理MIDI音符
function processMIDINotes(notes) {
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
    console.log(`MIDI Tempo: ${bpm} BPM`);
    
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
        
        console.log(`MIDI速度分析: BPM=${bpm}, 中位间隔=${medianInterval.toFixed(3)}s, 游戏速度=${midiSpeed.toFixed(3)}`);
    }
    

}

// 开始MIDI游戏
function startMIDIGame() {
    loadingElement.style.display = 'none';
    gameRunning = true;
    gameStartTime = Date.now() / 1000;
    
    // 创建所有音符方块
    createAllNoteBlocks();
}

// 开始普通游戏（无MIDI）
function startNormalGame() {
    loadingElement.style.display = 'none';
    gameRunning = true;
}

// 创建所有音符方块
function createAllNoteBlocks() {
    midiNotes.forEach(noteData => {
        createNoteBlock(noteData);
    });
}

// 创建音符方块（西游记像素风格）
function createNoteBlock(noteData) {
    // 使用预先分配的高度
    const isTall = noteData.isTall;
    const blockHeight = isTall ? 3.0 : 0.4; // 超高3.0或普通0.4
    const blockY = isTall ? 1.5 : 0.2; // 超高方块的Y位置也要调整
    
    const geometry = new THREE.BoxGeometry(1.5, blockHeight, 1.2);
    
    // 根据 isTall 属性选择不同的像素纹理
    let texture;
    if (isTall) {
        // 超高方块：使用障碍物纹理（火焰山等）
        // 使用纯色作为障碍物纹理
        texture = PixelTextureGenerator.createSolidTexture(PIXEL_PALETTE.OBSTACLE_ORANGE, 16);
    } else {
        // 普通方块：随机选择妖怪纹理
        const monsterIndex = Math.floor(Math.random() * MONSTER_SPRITES.length);
        const monster = MONSTER_SPRITES[monsterIndex];
        texture = PixelTextureGenerator.createSpriteTexture(monster.data, monster.colors, 2);
    }
    
    // 设置纹理过滤为 NearestFilter（像素风格）
    texture.magFilter = THREE.NearestFilter;
    texture.minFilter = THREE.NearestFilter;
    
    // 使用 MeshLambertMaterial 替代 MeshPhysicalMaterial
    const material = new THREE.MeshLambertMaterial({ 
        map: texture,
        transparent: false
    });
    
    const noteBlock = new THREE.Mesh(geometry, material);
    
    const x = (noteData.lane - 2) * LANE_WIDTH;
    // 根据时间计算初始Z位置
    // 触发线在z=2，黑块从迷雾深处移动过来
    // 添加缓冲距离，让黑块从远处出现
    const bufferDistance = 30; // 缓冲距离，让黑块从迷雾中出现
    const zPosition = 2 - (noteData.time * originalBaseSpeed * 60) - bufferDistance;
    noteBlock.position.set(x, blockY, zPosition);
    noteBlock.castShadow = true;
    
    noteBlock.userData = {
        noteData: noteData,
        isNote: true,
        isTall: isTall,
        blockHeight: blockHeight
    };
    
    scene.add(noteBlock);
    noteObjects.push(noteBlock);
}

// 创建地面
function createGround() {
    // 西游记像素风格：云层地面
    const groundGeometry = new THREE.PlaneGeometry(LANES * LANE_WIDTH, GROUND_LENGTH);
    
    // 使用 PixelTextureGenerator 创建云层纹理
    groundTexture = PixelTextureGenerator.createPatternTexture(CLOUD_PATTERN, CLOUD_COLORS, 32);
    
    // 设置纹理重复
    groundTexture.wrapS = THREE.RepeatWrapping;
    groundTexture.wrapT = THREE.RepeatWrapping;
    groundTexture.repeat.set(4, 20); // 横向4次，纵向20次
    
    // 使用 MeshLambertMaterial 替代 MeshStandardMaterial
    const groundMaterial = new THREE.MeshLambertMaterial({ 
        map: groundTexture,
        side: THREE.DoubleSide
    });
    
    for (let i = 0; i < 3; i++) {
        const groundMesh = new THREE.Mesh(groundGeometry, groundMaterial);
        groundMesh.rotation.x = -Math.PI / 2;
        groundMesh.position.z = -GROUND_LENGTH * i;
        groundMesh.receiveShadow = true;
        scene.add(groundMesh);
        ground.push(groundMesh);
    }
    
    // 添加轨道线（金色像素风格）
    const lineMaterial = new THREE.MeshBasicMaterial({ 
        color: PIXEL_PALETTE.UI_GOLD, // 金色
        transparent: true,
        opacity: 1.0, // 完全不透明
        fog: true
    });
    
    // 添加轨道分隔线（4条）
    for (let i = 1; i < LANES; i++) {
        const x = (i - LANES / 2) * LANE_WIDTH;
        const lineGeometry = new THREE.BoxGeometry(0.1, 0.05, 250); // 增加宽度和高度
        const lineMesh = new THREE.Mesh(lineGeometry, lineMaterial);
        lineMesh.position.set(x, 0.03, -75); // 提高Y位置使其更明显
        scene.add(lineMesh);
    }
    
    // 添加两侧边界线（金色像素风格，让5条轨道更明显）
    const edgeMaterial = new THREE.MeshBasicMaterial({
        color: PIXEL_PALETTE.UI_GOLD, // 金色
        transparent: true,
        opacity: 1.0, // 完全不透明
        fog: true
    });
    
    // 左边界
    const leftEdge = new THREE.BoxGeometry(0.1, 0.05, 250); // 增加宽度和高度
    const leftMesh = new THREE.Mesh(leftEdge, edgeMaterial);
    leftMesh.position.set(-LANES * LANE_WIDTH / 2, 0.03, -75); // 提高Y位置
    scene.add(leftMesh);
    
    // 右边界
    const rightEdge = new THREE.BoxGeometry(0.1, 0.05, 250); // 增加宽度和高度
    const rightMesh = new THREE.Mesh(rightEdge, edgeMaterial);
    rightMesh.position.set(LANES * LANE_WIDTH / 2, 0.03, -75); // 提高Y位置
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

// 拖尾效果数组（已移除，保持像素风格简洁）
// let trailPositions = [];
// const trailLength = 10;
// let trailSpheres = [];

// 创建玩家（像素风格的孙悟空）
function createPlayer() {
    // 使用 PixelTextureGenerator 创建孙悟空纹理
    const wukongTexture = PixelTextureGenerator.createSpriteTexture(
        WUKONG_SPRITE,
        WUKONG_COLORS,
        2 // 每个像素放大2倍，使纹理更清晰
    );
    
    // 使用 Sprite 创建孙悟空角色
    const material = new THREE.SpriteMaterial({ 
        map: wukongTexture,
        transparent: true
    });
    
    player = new THREE.Sprite(material);
    player.scale.set(0.6, 0.6, 1); // 调整大小使角色合适
    player.position.set(0, 0.25, 0);
    
    // 保持碰撞体积不变（使用原来的球体半径0.25）
    player.userData.collisionRadius = 0.25;
    
    scene.add(player);
    
    // 移除原有的拖尾球体创建代码
    // 拖尾效果已被移除，保持像素风格的简洁
}

// 更新拖尾效果（已移除，保持像素风格简洁）
// function updateTrail() {
//     for (let i = 0; i < trailSpheres.length; i++) {
//         if (i < trailPositions.length) {
//             const pos = trailPositions[trailPositions.length - 1 - i];
//             trailSpheres[i].position.set(pos.x, pos.y, pos.z);
//             const opacity = (1 - i / trailLength) * 0.8;
//             trailSpheres[i].material.opacity = opacity;
//             const scale = (1 - i / trailLength) * 0.8;
//             trailSpheres[i].scale.setScalar(scale);
//         } else {
//             trailSpheres[i].material.opacity = 0;
//         }
//     }
// }

// 创建障碍物
function createObstacle() {
    const lane = Math.floor(Math.random() * LANES);
    const obstacleType = Math.random();
    let geometry, height, yPos;
    
    // 随机生成高障碍物或低障碍物
    if (obstacleType < 0.5) {
        // 高障碍物 - 需要下滑躲避
        geometry = new THREE.BoxGeometry(1.2, 1.0, 1.2);
        height = 1.0;
        yPos = 1.5;
    } else {
        // 低障碍物 - 需要跳跃躲避
        geometry = new THREE.BoxGeometry(1.2, 1.5, 1.2);
        height = 1.5;
        yPos = 0.75;
    }
    
    const material = new THREE.MeshStandardMaterial({ color: 0xe74c3c });
    const obstacle = new THREE.Mesh(geometry, material);
    
    const x = (lane - 2) * LANE_WIDTH;
    obstacle.position.set(x, yPos, -50);
    obstacle.castShadow = true;
    obstacle.userData.lane = lane;
    obstacle.userData.height = height;
    obstacle.userData.yPos = yPos;
    
    scene.add(obstacle);
    obstacles.push(obstacle);
}

// 创建金币
function createCoin() {
    const lane = Math.floor(Math.random() * LANES);
    const geometry = new THREE.CylinderGeometry(0.3, 0.3, 0.1, 32);
    const material = new THREE.MeshStandardMaterial({ 
        color: 0xffd700,
        metalness: 0.8,
        roughness: 0.2
    });
    const coin = new THREE.Mesh(geometry, material);
    
    const x = (lane - 2) * LANE_WIDTH;
    // 随机高度的金币
    const coinHeight = Math.random() < 0.3 ? 2.0 : 0.8;
    coin.position.set(x, coinHeight, -50);
    coin.rotation.x = Math.PI / 2;
    coin.userData.lane = lane;
    coin.userData.isCoin = true;
    coin.userData.height = coinHeight;
    
    scene.add(coin);
    coins.push(coin);
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
        
        // Sprite 不支持 rotation.x，移除旋转动画
        // player.rotation.x = Math.min(verticalVelocity * 0.5, 0.3);
        
        // 落地
        if (player.position.y <= groundY) {
            player.position.y = groundY;
            isJumping = false;
            verticalVelocity = 0;
            // player.rotation.x = 0;
            player.scale.set(0.6, 0.6, 1);
            
            // 落地时的轻微压缩效果（Sprite 只能在 x,y 方向缩放）
            player.scale.set(0.66, 0.54, 1);
            setTimeout(() => {
                if (!isJumping) {
                    player.scale.set(0.6, 0.6, 1);
                }
            }, 100);
        }
    }
    
    // 确保在地面时恢复正常状态
    if (!isJumping) {
        player.scale.set(0.6, 0.6, 1);
        player.position.y = groundY;
    }
    
    // 拖尾效果已移除，保持像素风格简洁
    // trailPositions.push({
    //     x: player.position.x,
    //     y: player.position.y,
    //     z: player.position.z
    // });
    // 
    // if (trailPositions.length > trailLength) {
    //     trailPositions.shift();
    // }
    // 
    // // 更新拖尾球体
    // updateTrail();
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

// 下滑函数（已禁用）
function roll() {
    // 下滑功能已取消，只能通过跳跃躲避
    return;
}

// 更新地面
function updateGround() {
    // 通过纹理偏移实现移动效果，而不是移动几何体
    // 这样云层纹理看起来是静止的
    if (groundTexture) {
        const moveSpeed = speed * 60; // 转换为每秒的速度
        // 调整偏移速度，使其与游戏速度匹配
        groundTexture.offset.y += (moveSpeed * deltaTime) / GROUND_LENGTH * 20;
    }
}

// 更新音符方块
function updateNoteBlocks() {
    const triggerZ = triggerLine.position.z;
    const triggerWindow = 0.2; // 触发窗口
    const playerLane = Math.round(currentLane);
    
    // 基于时间的移动速度（每秒移动的距离）
    const moveSpeed = midiSpeed * 60; // 转换为每秒的速度
    
    for (let i = noteObjects.length - 1; i >= 0; i--) {
        const noteBlock = noteObjects[i];
        noteBlock.position.z += moveSpeed * deltaTime; // 基于时间移动
        
        const noteData = noteBlock.userData.noteData;
        
        // 检查是否与玩家碰撞
        if (!noteData.collided && noteData.lane === playerLane) {
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
                    audioEngine.playCollision();
                    
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
        
        // 检查是否到达触发线（自动触发）
        if (!noteData.triggered && noteBlock.position.z >= triggerZ - triggerWindow && 
            noteBlock.position.z <= triggerZ + triggerWindow) {
            
            noteData.triggered = true;
            notesTriggered++;
            score += 100;
            
            // 播放音符（极致音质 - 传递轨道信息用于3D定位）
            // 使用原始velocity，完美还原MIDI
            audioEngine.playNote(noteData.note, noteData.duration, noteData.velocity, noteData.lane);
            
            // 创建像素爆炸特效
            createPixelExplosion(noteBlock.position.x, noteBlock.position.y, noteBlock.position.z);
            
            // 立即移除方块（不再使用放大淡出动画）
            scene.remove(noteBlock);
            noteObjects.splice(i, 1);
            continue; // 跳过后续处理，因为方块已被移除
        }
        
        // 移除屏幕外的方块
        if (noteBlock.position.z > 10) {
            scene.remove(noteBlock);
            noteObjects.splice(i, 1);
        }
    }
    
    // 检查是否所有音符都已处理
    if (noteObjects.length === 0 && notesTriggered > 0 && !isCompletingRound) {
        // 完成一轮！继续下一轮
        isCompletingRound = true;
        completeRound();
    }
}

// 更新障碍物
function updateObstacles() {
    const moveSpeed = speed * 60;
    for (let i = obstacles.length - 1; i >= 0; i--) {
        const obstacle = obstacles[i];
        obstacle.position.z += moveSpeed * deltaTime;
        obstacle.rotation.y += 0.02 * (deltaTime * 60);
        
        if (obstacle.position.z > 5) {
            scene.remove(obstacle);
            obstacles.splice(i, 1);
        }
    }
}

// 更新金币
function updateCoins() {
    const moveSpeed = speed * 60;
    for (let i = coins.length - 1; i >= 0; i--) {
        const coin = coins[i];
        coin.position.z += moveSpeed * deltaTime;
        coin.rotation.z += 0.1 * (deltaTime * 60);
        
        if (coin.position.z > 5) {
            scene.remove(coin);
            coins.splice(i, 1);
        }
    }
}

// 碰撞检测
function checkCollision() {
    const playerLane = Math.round(currentLane);
    
    // 检测障碍物碰撞
    for (let obstacle of obstacles) {
        if (obstacle.userData.lane === playerLane &&
            Math.abs(obstacle.position.z - player.position.z) < 1) {
            
            // 检查垂直碰撞
            const obstacleY = obstacle.userData.yPos;
            const playerTop = player.position.y + (player.scale.y * 0.6);
            const playerBottom = player.position.y - (player.scale.y * 0.6);
            
            // 高障碍物（需要下滑）
            if (obstacleY > 1.0) {
                if (playerTop > 1.0 && !isRolling) {
                    return true;
                }
            } 
            // 低障碍物（需要跳跃）
            else {
                if (playerBottom < 1.5 && !isJumping) {
                    return true;
                }
            }
        }
    }
    
    // 检测金币收集
    for (let i = coins.length - 1; i >= 0; i--) {
        const coin = coins[i];
        if (coin.userData.lane === playerLane &&
            Math.abs(coin.position.z - player.position.z) < 0.8) {
            
            // 检查垂直位置
            const coinY = coin.userData.height;
            const playerY = player.position.y;
            
            if (Math.abs(playerY - coinY) < 1.5) {
                scene.remove(coin);
                coins.splice(i, 1);
                score += 10;
                scoreElement.textContent = `分数: ${score}`;
            }
        }
    }
    
    return false;
}

// 完成一轮
function completeRound() {
    // 获得一颗星
    starsEarned++;
    
    // 提升速度倍数
    speedMultiplier *= 1.25;
    
    // 更新当前速度为：原始速度 × 倍数
    midiSpeed = originalBaseSpeed * speedMultiplier;
    
    // 直接继续下一轮，不显示提示
    restartRound();
}

// 重新开始一轮（不重置星星和速度）
function restartRound() {
    // 清理音符方块
    noteObjects.forEach(obj => scene.remove(obj));
    noteObjects = [];
    
    // 重置音符状态
    notesTriggered = 0;
    midiNotes.forEach(note => {
        note.triggered = false;
        note.collided = false;
    });
    
    // 重新创建音符方块
    gameStartTime = Date.now() / 1000;
    createAllNoteBlocks();
    
    // 重置完成标志
    isCompletingRound = false;
    
    // 确保游戏继续运行
    gameRunning = true;
    
    // 更新UI
    scoreElement.textContent = `⭐ ${starsEarned} | 音符: 0/${totalNotes}`;
    distanceElement.textContent = `速度: ${speedMultiplier.toFixed(2)}x`;
    
    console.log(`第 ${starsEarned} 轮开始！创建了 ${noteObjects.length} 个音符方块`);
}

// 游戏结束（碰撞死亡）
function gameOver() {
    gameRunning = false;
    gameOverElement.style.display = 'block';
    instructionsElement.style.display = 'none';
    
    if (midiNotes.length > 0) {
        document.getElementById('finalScore').textContent = `游戏结束！`;
        document.getElementById('finalDistance').textContent = `获得 ${starsEarned} 颗星 ⭐ | 速度: ${speedMultiplier.toFixed(2)}x`;
    } else {
        document.getElementById('finalScore').textContent = `最终分数: ${score}`;
        document.getElementById('finalDistance').textContent = `跑了: ${Math.floor(distance)}m`;
    }
}

// 继续游戏（把未触发的黑块整体移动到迷雾边缘）
function continueGame() {
    if (!lastCollisionBlock) return;
    
    gameOverElement.style.display = 'none';
    gameRunning = true;
    
    // 找到所有未触发的黑块
    const untriggeredBlocks = noteObjects.filter(block => !block.userData.noteData.triggered);
    
    if (untriggeredBlocks.length === 0) {
        console.log('没有未触发的黑块');
        lastCollisionBlock = null;
        return;
    }
    
    // 找到最前面的未触发黑块的位置
    let frontmostZ = untriggeredBlocks[0].position.z;
    for (let block of untriggeredBlocks) {
        if (block.position.z > frontmostZ) {
            frontmostZ = block.position.z;
        }
    }
    
    // 计算需要移动的距离（移动到迷雾边缘 z=-50）
    const fogEdgeZ = -50;
    const moveDistance = fogEdgeZ - frontmostZ;
    
    // 整体移动所有未触发的黑块
    for (let block of untriggeredBlocks) {
        block.position.z += moveDistance;
        
        // 重置状态
        const noteData = block.userData.noteData;
        noteData.collided = false;
        noteData.triggered = false;
        block.material.color.setHex(0x000000);
        block.material.emissive.setHex(0x111111);
        block.material.opacity = 1;
        block.scale.set(1, 1, 1);
    }
    
    // 删除已触发的黑块
    for (let i = noteObjects.length - 1; i >= 0; i--) {
        if (noteObjects[i].userData.noteData.triggered) {
            scene.remove(noteObjects[i]);
            noteObjects.splice(i, 1);
        }
    }
    
    // 重置玩家状态
    player.position.y = groundY;
    isJumping = false;
    verticalVelocity = 0;
    
    console.log(`继续游戏：整体移动 ${untriggeredBlocks.length} 个黑块到迷雾边缘，移动距离 ${moveDistance.toFixed(2)}`);
    
    lastCollisionBlock = null;
}

// 重新开始
function restart() {
    // 清理场景
    obstacles.forEach(obj => scene.remove(obj));
    coins.forEach(obj => scene.remove(obj));
    noteObjects.forEach(obj => scene.remove(obj));
    obstacles = [];
    coins = [];
    noteObjects = [];
    
    // 重置游戏状态
    score = 0;
    distance = 0;
    speed = 0.3;
    currentLane = 2;
    targetLane = 2;
    lastObstacleTime = 0;
    lastCoinTime = 0;
    
    // 重置MIDI状态
    notesTriggered = 0;
    collisions = 0;
    starsEarned = 0;
    speedMultiplier = 1.0;
    isCompletingRound = false;
    // 重置速度到原始状态
    midiSpeed = originalBaseSpeed;
    
    // 重置音符状态
    midiNotes.forEach(note => {
        note.triggered = false;
        note.collided = false;
    });
    
    // 重置 UI
    if (midiNotes.length > 0) {
        scoreElement.textContent = `⭐ 0 | 音符: 0/${totalNotes}`;
        distanceElement.textContent = `速度: 1.00x`;
        accuracyElement.textContent = `剩余: ${totalNotes}`;
    } else {
        scoreElement.textContent = `分数: 0`;
        distanceElement.textContent = `距离: 0m`;
    }
    comboElement.style.display = 'none';
    gameOverElement.style.display = 'none';
    instructionsElement.style.display = 'block';
    
    // 重置玩家位置和状态
    player.position.set(0, 0.6, 0);
    player.scale.set(1, 1, 1);
    isJumping = false;
    verticalVelocity = 0;
    
    // 如果是MIDI模式，重新创建音符方块
    if (midiNotes.length > 0) {
        gameStartTime = Date.now() / 1000;
        createAllNoteBlocks();
    }
    
    gameRunning = true;
}

// 窗口大小调整
function onWindowResize() {
    const aspect = window.innerWidth / window.innerHeight;
    camera.aspect = aspect;
    // 根据屏幕比例调整FOV
    camera.fov = aspect < 1 ? 75 : 60;
    camera.updateProjectionMatrix();
    const pixelRatio = Math.min(window.devicePixelRatio, 2);
    renderer.setPixelRatio(pixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
}

// 游戏主循环
let lastObstacleTime = 0;
let lastCoinTime = 0;
let lastUpdateTime = 0;
let deltaTime = 0;

function animate(currentTime) {
    requestAnimationFrame(animate);
    
    // 计算时间差（秒）
    if (lastUpdateTime === 0) {
        lastUpdateTime = currentTime;
    }
    deltaTime = (currentTime - lastUpdateTime) / 1000; // 转换为秒
    lastUpdateTime = currentTime;
    
    // 触发线脉动动画
    if (window.triggerLineGlow && window.triggerLineMaterial) {
        const pulse = Math.sin(currentTime * 0.003) * 0.1 + 0.3;
        window.triggerLineGlow.material.opacity = pulse;
        window.triggerLineMaterial.opacity = 0.8 + Math.sin(currentTime * 0.003) * 0.2;
    }
    
    // 更新FPS统计
    updateFPS(currentTime);
    
    // 帧率检测（前100帧）
    if (frameCount < 100) {
        frameCount++;
        if (frameCount === 50) {
            detectRefreshRate();
        }
    }
    
    lastFrameTime = currentTime;
    
    if (!gameRunning) {
        renderer.render(scene, camera);
        return;
    }
    
    // 更新游戏元素
    updatePlayer();
    updateGround();
    
    // 如果有MIDI音符，更新音符方块；否则更新普通障碍物
    if (midiNotes.length > 0) {
        // 禁用速度增长，以后才缓慢增加速度
        if (starsEarned > 0) {
            midiSpeed += speedIncreaseRate * speedMultiplier;
        }
        updateNoteBlocks();
    } else {
        updateObstacles();
        updateCoins();
    }
    
    // 只在非MIDI模式下生成障碍物和金币
    if (midiNotes.length === 0) {
        const now = Date.now();
        if (now - lastObstacleTime > 2000) {
            createObstacle();
            lastObstacleTime = now;
        }
        
        if (now - lastCoinTime > 1500) {
            createCoin();
            lastCoinTime = now;
        }
    }
    
    // 增加难度
    if (speed < 0.8) {
        speed += 0.0001;
    }
    
    // 更新分数和UI
    if (midiNotes.length > 0) {
        // MIDI模式 - 显示星星和实时速度（相对于原始基础速度）
        const currentSpeedRatio = (midiSpeed / originalBaseSpeed).toFixed(2);
        scoreElement.textContent = `⭐ ${starsEarned} | 音符: ${notesTriggered}/${totalNotes}`;
        distanceElement.textContent = `速度: ${currentSpeedRatio}x`;
        accuracyElement.textContent = `剩余: ${noteObjects.length}`;
    } else {
        // 普通模式
        distance += speed * 2;
        score += 1;
        
        if (Math.floor(distance) % 10 === 0) {
            scoreElement.textContent = `分数: ${score}`;
            distanceElement.textContent = `距离: ${Math.floor(distance)}m`;
        }
    }
    
    // 碰撞检测
    if (checkCollision()) {
        gameOver();
        return;
    }
    
    renderer.render(scene, camera);
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

// 切换MIDI文件的动画
let isSwitchingMidi = false;

// 切换到下一个MIDI文件
async function switchToNextMidi() {
    if (midiFiles.length <= 1) return;
    
    // 允许在切换过程中再次点击（取消锁定）
    if (isSwitchingMidi) {
        console.log('正在切换中，请稍候...');
        return;
    }
    
    isSwitchingMidi = true;
    
    // 切换到下一个文件
    currentMidiIndex = (currentMidiIndex + 1) % midiFiles.length;
    
    // 上滑动画
    await playSlideAnimation('up');
    
    // 加载新的MIDI文件
    await loadAndStartNewMidi();
    
    isSwitchingMidi = false;
}

// 切换到上一个MIDI文件
async function switchToPrevMidi() {
    if (midiFiles.length <= 1) return;
    
    // 允许在切换过程中再次点击（取消锁定）
    if (isSwitchingMidi) {
        console.log('正在切换中，请稍候...');
        return;
    }
    
    isSwitchingMidi = true;
    
    // 切换到上一个文件
    currentMidiIndex = (currentMidiIndex - 1 + midiFiles.length) % midiFiles.length;
    
    // 下滑动画
    await playSlideAnimation('down');
    
    // 加载新的MIDI文件
    await loadAndStartNewMidi();
    
    isSwitchingMidi = false;
}

// 播放滑动动画（抖音风格）
function playSlideAnimation(direction) {
    return new Promise((resolve) => {
        const canvas = document.getElementById('gameCanvas');
        const midiNameElement = document.getElementById('midiName');
        
        // 设置动画
        const translateY = direction === 'up' ? '-100%' : '100%';
        canvas.style.transform = `translateY(${translateY})`;
        
        // 名字淡出
        midiNameElement.style.opacity = '0';
        midiNameElement.style.transition = 'opacity 0.2s';
        
        // 400ms后动画完成
        setTimeout(() => {
            canvas.style.transform = 'translateY(0)';
            canvas.style.transition = 'none';
            
            // 名字淡入
            setTimeout(() => {
                midiNameElement.style.opacity = '1';
                midiNameElement.style.transition = 'opacity 0.3s';
                resolve();
            }, 50);
        }, 400);
        
        // 启用过渡
        setTimeout(() => {
            canvas.style.transition = 'transform 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94)';
        }, 10);
    });
}

// 加载并开始新的MIDI
async function loadAndStartNewMidi() {
    // 重置游戏状态
    obstacles.forEach(obj => scene.remove(obj));
    coins.forEach(obj => scene.remove(obj));
    noteObjects.forEach(obj => scene.remove(obj));
    obstacles = [];
    coins = [];
    noteObjects = [];
    
    score = 0;
    distance = 0;
    notesTriggered = 0;
    collisions = 0;
    starsEarned = 0;
    speedMultiplier = 1.0;
    isCompletingRound = false;
    midiSpeed = originalBaseSpeed;
    
    player.position.set(0, groundY, 0);
    player.scale.set(1, 1, 1);
    isJumping = false;
    verticalVelocity = 0;
    currentLane = 2;
    targetLane = 2;
    
    // 加载新的MIDI文件
    const success = await loadMidiFile(currentMidiIndex);
    
    if (success) {
        // 显示文件名提示
        comboElement.style.display = 'block';
        comboElement.textContent = `♪ ${currentMidiName}`;
        comboElement.style.fontSize = '28px';
        comboElement.style.color = '#ffd700';
        
        // 隐藏游戏结束界面
        gameOverElement.style.display = 'none';
        
        setTimeout(() => {
            comboElement.style.display = 'none';
        }, 2000);
    }
}

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

// 重新开始按钮（统一的事件处理）
function handleRestart(e) {
    e.preventDefault();
    e.stopPropagation();
    restart();
}
restartButton.addEventListener('click', handleRestart);
restartButton.addEventListener('touchend', handleRestart);

// 继续功能已取消



// ========== 灵动岛功能 ==========

// 更新灵动岛标题
function updateIslandTitle(name) {
    islandTitle.textContent = name;
}

// 初始化 MIDI 列表
function initMidiList() {
    midiList.innerHTML = '';
    midiFiles.forEach((file, index) => {
        const item = document.createElement('div');
        item.className = 'midi-item';
        if (index === currentMidiIndex) {
            item.classList.add('active');
        }
        
        const cover = document.createElement('div');
        cover.className = 'midi-cover';
        cover.textContent = '🎵';
        
        const name = document.createElement('div');
        name.className = 'midi-name';
        name.textContent = file.split('/').pop().replace('.mid', '');
        
        item.appendChild(cover);
        item.appendChild(name);
        
        // 点击切换 MIDI
        item.addEventListener('click', (e) => {
            e.stopPropagation();
            if (index !== currentMidiIndex) {
                selectMidi(index);
            }
        });
        
        midiList.appendChild(item);
    });
}

// 选择 MIDI 文件 - 随时可点击
async function selectMidi(index) {
    // 先收起动画
    dynamicIsland.classList.remove('expanded');
    isIslandExpanded = false;
    
    // 等待动画完成（缩短等待时间）
    await new Promise(resolve => setTimeout(resolve, 300));
    
    // 停止当前游戏
    gameRunning = false;
    
    // 清理场景
    obstacles.forEach(obj => scene.remove(obj));
    coins.forEach(obj => scene.remove(obj));
    noteObjects.forEach(obj => scene.remove(obj));
    obstacles = [];
    coins = [];
    noteObjects = [];
    
    // 重置游戏状态
    score = 0;
    distance = 0;
    notesTriggered = 0;
    collisions = 0;
    starsEarned = 0;
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
    
    // 切换 MIDI
    currentMidiIndex = index;
    const success = await loadMidiFile(currentMidiIndex);
    
    if (success) {
        // 显示播放按钮，等待用户点击
        const startButton = document.getElementById('startButton');
        startButton.style.display = 'block';
        
        // 更新列表中的选中状态
        initMidiList();
        
        // 设置播放按钮点击事件
        const startGame = async (e) => {
            if (e) e.preventDefault();
            startButton.removeEventListener('click', startGame);
            startButton.removeEventListener('touchstart', startGame);
            startButton.style.display = 'none';
            
            // 显示加载提示
            loadingElement.style.display = 'block';
            loadingElement.textContent = '加载钢琴音色中...';
            
            try {
                // 确保音频已启动
                await audioEngine.start();
                
                // 如果音色未加载，则加载
                if (!audioEngine.isReady) {
                    await audioEngine.init((loaded, total) => {
                        loadingElement.textContent = `加载钢琴音色 ${loaded}/${total}`;
                    });
                }
                
                // 隐藏加载提示
                loadingElement.style.display = 'none';
                
                // 开始游戏
                gameStartTime = Date.now() / 1000;
                midiSpeed = originalBaseSpeed;
                
                // 重置音符状态
                midiNotes.forEach(note => {
                    note.triggered = false;
                    note.collided = false;
                });
                
                // 创建音符方块
                createAllNoteBlocks();
                
                // 开始游戏
                gameRunning = true;
                
            } catch (error) {
                console.error('音频加载失败:', error);
                loadingElement.textContent = '加载失败，请刷新重试';
                setTimeout(() => {
                    loadingElement.style.display = 'none';
                    startButton.style.display = 'block';
                    startButton.addEventListener('click', startGame);
                    startButton.addEventListener('touchstart', startGame, { passive: false });
                }, 2000);
            }
        };
        
        startButton.addEventListener('click', startGame);
        startButton.addEventListener('touchstart', startGame, { passive: false });
    }
}

// 切换灵动岛展开/收起（带暂停/继续功能）
function toggleIsland() {
    if (isIslandExpanded) {
        // 收起 → 继续游戏
        dynamicIsland.classList.remove('expanded');
        isIslandExpanded = false;
        if (!gameRunning && wasGameRunningBeforePause) {
            gameRunning = true;
        }
    } else {
        // 展开 → 暂停游戏
        dynamicIsland.classList.add('expanded');
        isIslandExpanded = true;
        wasGameRunningBeforePause = gameRunning;
        gameRunning = false;
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

// 点击空白处关闭（优先级更高）
document.addEventListener('click', (e) => {
    if (isIslandExpanded && !dynamicIsland.contains(e.target)) {
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

// 创建像素爆炸特效
function createPixelExplosion(x, y, z) {
    const particles = [];
    const colors = [
        PIXEL_PALETTE.EFFECT_WHITE,
        PIXEL_PALETTE.EFFECT_YELLOW,
        PIXEL_PALETTE.EFFECT_ORANGE,
        PIXEL_PALETTE.WUKONG_GOLD
    ];
    
    // 创建8个小方块
    for (let i = 0; i < 8; i++) {
        const geometry = new THREE.BoxGeometry(0.1, 0.1, 0.1);
        const material = new THREE.MeshBasicMaterial({
            color: colors[Math.floor(Math.random() * colors.length)],
            transparent: true,
            opacity: 1.0
        });
        const particle = new THREE.Mesh(geometry, material);
        
        // 计算向外飞散的方向（8个方向均匀分布）
        const angle = (Math.PI * 2 * i) / 8;
        particle.userData.velocity = {
            x: Math.cos(angle) * 0.1,
            y: 0.1, // 初始向上速度
            z: Math.sin(angle) * 0.1
        };
        
        particle.position.set(x, y, z);
        scene.add(particle);
        particles.push(particle);
    }
    
    // 动画：飞散、重力、淡出
    let frame = 0;
    const maxFrames = 30; // 约0.5秒（30帧）
    const interval = setInterval(() => {
        frame++;
        particles.forEach(p => {
            // 更新位置
            p.position.x += p.userData.velocity.x;
            p.position.y += p.userData.velocity.y;
            p.position.z += p.userData.velocity.z;
            
            // 应用重力
            p.userData.velocity.y -= 0.01;
            
            // 淡出
            p.material.opacity = 1 - frame / maxFrames;
        });
        
        // 动画结束，清理
        if (frame >= maxFrames) {
            clearInterval(interval);
            particles.forEach(p => {
                scene.remove(p);
                p.geometry.dispose();
                p.material.dispose();
            });
        }
    }, 33); // 约30fps
}

// 启动游戏
init();
animate(performance.now());
