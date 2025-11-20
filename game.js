// Three.js 场景设置
let scene, camera, renderer;
let player, ground = [];
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

// 固定高画质配置（极简方案）
const GRAPHICS_CONFIG = {
    shadowsEnabled: true,
    shadowType: THREE.PCFSoftShadowMap,
    pixelRatio: Math.min(window.devicePixelRatio, 2),
    fogDistance: 80,
    trailLength: 10,
    playerSegments: 32,
    trailSegments: 16
};

// FPS 监控（仅用于显示，不影响画质）
let lastFrameTime = performance.now();
let fpsCheckTime = 0;
let fpsHistory = [];
let currentFPS = 0;

console.log('🎨 使用固定高画质配置');
console.log('📊 帧率由浏览器自动适配屏幕刷新率');

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
    
    // 固定高画质阴影设置
    renderer.shadowMap.enabled = GRAPHICS_CONFIG.shadowsEnabled;
    renderer.shadowMap.type = GRAPHICS_CONFIG.shadowType;
    
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
        console.log(`📥 开始加载 MIDI 文件: ${midiFiles[index]}`);
        
        // 清理旧的音符方块（如果存在）
        if (noteObjects.length > 0) {
            console.log(`🧹 loadMidiFile: 清理 ${noteObjects.length} 个旧方块`);
            cleanupObjects(noteObjects);
            blocksCreated = false;
        }
        
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
        
        loadingElement.style.display = 'block';
        loadingElement.textContent = '加载 MIDI 文件...';
        
        // 并行加载MIDI文件和钢琴音色
        console.log('🚀 开始并行加载 MIDI 文件和钢琴音色...');
        
        let midiLoaded = false;
        let samplesLoaded = 0;
        let totalSamples = 30;
        
        const updateLoadingText = () => {
            if (!midiLoaded) {
                loadingElement.textContent = `加载 MIDI 文件... (音色: ${samplesLoaded}/${totalSamples})`;
            } else {
                loadingElement.textContent = `加载钢琴音色 ${samplesLoaded}/${totalSamples}`;
            }
        };
        
        const [midiSuccess] = await Promise.all([
            // 加载MIDI文件
            loadMidiFile(currentMidiIndex).then(success => {
                console.log('✅ MIDI 文件加载完成');
                midiLoaded = true;
                updateLoadingText();
                return success;
            }),
            // 加载钢琴音色
            (async () => {
                try {
                    // 先启动音频上下文（需要用户交互，但这里先准备好）
                    audioEngine.ensureAudioContext();
                    
                    // 加载音色（带进度显示）
                    await audioEngine.init((loaded, total) => {
                        samplesLoaded = loaded;
                        totalSamples = total;
                        updateLoadingText();
                    });
                    console.log('✅ 钢琴音色加载完成');
                } catch (error) {
                    console.error('钢琴音色加载失败:', error);
                }
            })()
        ]);
        
        if (!midiSuccess) {
            startNormalGame();
            return;
        }
        
        console.log('✅ 所有资源加载完成，显示播放按钮');
        loadingElement.style.display = 'none';
        const startButton = document.getElementById('startButton');
        if (!startButton) {
            console.error('找不到播放按钮元素！');
            return;
        }
        startButton.style.display = 'block';
        
        // 等待用户点击开始按钮
        const startGame = async (e) => {
            console.log('🎮 播放按钮被点击');
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
            
            // 立即播放开始音效（不等待）
            audioEngine.playStartSound();
            
            // 启动音频上下文（在用户交互时）
            console.log('🔊 启动音频上下文...');
            try {
                await audioEngine.start();
                console.log('✅ 音频上下文已启动');
                
                // 开始游戏
                startMIDIGame();
                
            } catch (error) {
                console.error('启动失败:', error);
                alert('启动失败，请刷新页面重试');
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
    console.log(`🎵 处理 ${notes.length} 个 MIDI 音符...`);
    
    // 清理旧的音符数据（如果存在）
    if (midiNotes.length > 0) {
        console.log(`🧹 清理旧的 ${midiNotes.length} 个音符数据`);
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
    
    // 创建新方块
    console.log(`✅ 开始创建 ${midiNotes.length} 个音符方块`);
    midiNotes.forEach(noteData => {
        createNoteBlock(noteData);
    });
    blocksCreated = true;
    console.log(`✅ 创建完成！实际创建了 ${noteObjects.length} 个方块`);
}

// 固定高画质材质（玻璃质感）
function createNoteMaterial() {
    return new THREE.MeshPhysicalMaterial({ 
        color: 0x2a2a2a,
        metalness: 0.9,
        roughness: 0.1,
        transparent: true,
        opacity: 0.85,
        transmission: 0.3, // 玻璃透射
        thickness: 0.5,
        envMapIntensity: 1,
        clearcoat: 1.0,
        clearcoatRoughness: 0.1
    });
}

// 创建音符方块（根据性能模式使用不同材质）
function createNoteBlock(noteData) {
    // 使用预先分配的高度
    const isTall = noteData.isTall;
    const blockHeight = isTall ? 3.0 : 0.4; // 超高3.0或普通0.4
    const blockY = isTall ? 1.5 : 0.2; // 超高方块的Y位置也要调整
    
    const geometry = new THREE.BoxGeometry(1.5, blockHeight, 1.2);
    const material = createNoteMaterial();
    const noteBlock = new THREE.Mesh(geometry, material);
    
    // 添加发光边缘
    const edgesGeometry = new THREE.EdgesGeometry(geometry);
    const edgesMaterial = new THREE.LineBasicMaterial({ 
        color: 0xffffff,
        transparent: true,
        opacity: 0.9,
        linewidth: 2
    });
    const edges = new THREE.LineSegments(edgesGeometry, edgesMaterial);
    noteBlock.add(edges);
    
    const x = (noteData.lane - 2) * LANE_WIDTH;
    // 根据时间计算初始Z位置
    // 触发线在z=2，黑块从迷雾深处移动过来
    // 添加缓冲距离，让黑块从远处出现
    const bufferDistance = 30; // 缓冲距离，让黑块从迷雾中出现
    const zPosition = 2 - (noteData.time * originalBaseSpeed * 60) - bufferDistance;
    noteBlock.position.set(x, blockY, zPosition);
    
    // 启用阴影
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
    for (let i = objectArray.length - 1; i >= 0; i--) {
        disposeObject(objectArray[i]);
    }
    objectArray.length = 0; // 清空数组
    
    // 如果清理的是音符方块，重置标志
    if (objectArray === noteObjects) {
        blocksCreated = false;
        console.log(`🧹 清理了 ${count} 个音符方块，重置创建标志`);
    }
}

// 性能统计（调试用）
function logPerformanceStats() {
    if (renderer && renderer.info) {
        const info = renderer.info;
        console.log('╔═══════════════════════════════════════╗');
        console.log('║         🎮 性能统计面板               ║');
        console.log('╠═══════════════════════════════════════╣');
        console.log(`║ 画质模式: 固定高画质`);
        console.log(`║ 当前FPS: ${currentFPS}`);
        console.log(`║ 像素比: ${renderer.getPixelRatio().toFixed(2)}x`);
        console.log(`║ 阴影: ✅ PCF柔和阴影`);
        console.log(`║ 材质: MeshPhysicalMaterial (玻璃质感)`);
        console.log('╠═══════════════════════════════════════╣');
        console.log(`║ 渲染调用: ${info.render.calls}`);
        console.log(`║ 三角形数: ${info.render.triangles.toLocaleString()}`);
        console.log(`║ 几何体: ${info.memory.geometries}`);
        console.log(`║ 纹理: ${info.memory.textures}`);
        console.log(`║ 场景物体: ${scene.children.length}`);
        console.log(`║ 音符方块: ${noteObjects.length}`);
        console.log(`║ 拖尾长度: ${GRAPHICS_CONFIG.trailLength}`);
        console.log(`║ 雾效距离: ${GRAPHICS_CONFIG.fogDistance}`);
        console.log('╚═══════════════════════════════════════╝');
    }
}

// 每30秒输出一次性能统计（可选）
setInterval(() => {
    if (gameRunning) {
        logPerformanceStats();
    }
}, 30000);

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

// 下滑函数（已禁用）
function roll() {
    // 下滑功能已取消，只能通过跳跃躲避
    return;
}

// 更新地面
function updateGround() {
    const moveSpeed = speed * 60; // 转换为每秒的速度
    ground.forEach(g => {
        g.position.z += moveSpeed * deltaTime;
        if (g.position.z > GROUND_LENGTH) {
            g.position.z -= GROUND_LENGTH * 3;
        }
    });
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
            
            // 改变颜色表示已触发（白色发光）
            noteBlock.material.color.setHex(0xffffff);
            noteBlock.material.emissive = new THREE.Color(0xffffff);
            noteBlock.material.emissiveIntensity = 1.0;
            
            // 创建触发时的光波扩散效果
            createTriggerWave(noteBlock.position.x, noteBlock.position.z);
            
            // 触发效果：放大并淡出
            const originalScale = { x: 1.5, y: 0.4, z: 1.2 };
            let scaleTime = 0;
            const scaleInterval = setInterval(() => {
                scaleTime += 0.05;
                const scale = 1 + scaleTime * 2;
                noteBlock.scale.set(originalScale.x * scale, originalScale.y * scale, originalScale.z * scale);
                noteBlock.material.opacity = Math.max(0, 1 - scaleTime * 2);
                if (scaleTime >= 0.5) {
                    clearInterval(scaleInterval);
                }
            }, 50);
        }
        
        // 移除屏幕外的方块（正确释放内存）
        if (noteBlock.position.z > 10) {
            disposeObject(noteBlock);
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
            disposeObject(obstacle);
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
            disposeObject(coin);
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
                disposeObject(coin);
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
    // 正确清理音符方块（释放内存）
    cleanupObjects(noteObjects);
    
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
    // 正确清理场景（释放内存）
    cleanupObjects(obstacles);
    cleanupObjects(coins);
    cleanupObjects(noteObjects);
    blocksCreated = false; // 重置创建标志
    
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
    
    // 无需帧率检测和画质调整，浏览器自动适配
    
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
        accuracyElement.textContent = `方块: ${noteObjects.length}`;
        
        // 异常检测：如果方块数量超过预期，警告
        if (noteObjects.length > totalNotes * 1.5) {
            console.error(`❌ 方块数量异常！预期: ${totalNotes}, 实际: ${noteObjects.length}`);
        }
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
    // P 键：查看性能统计（无论游戏是否运行）
    if (e.key === 'p' || e.key === 'P') {
        logPerformanceStats();
        return;
    }
    
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
let lastSwitchTime = 0;
const SWITCH_COOLDOWN = 1000; // 1秒冷却时间

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
    console.log('🔄 加载并开始新 MIDI...');
    
    // === 立即清理所有旧数据 ===
    console.log('🧹 清理旧数据...');
    cleanupObjects(obstacles);
    cleanupObjects(coins);
    cleanupObjects(noteObjects);
    blocksCreated = false;
    
    // 清理旧的 MIDI 数据
    midiNotes = [];
    totalNotes = 0;
    
    // 清理拖尾效果
    trailPositions = [];
    trailSpheres.forEach(sphere => {
        sphere.material.opacity = 0;
    });
    
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
    
    // 输出清理后的内存状态
    console.log('✅ 清理完成！内存状态:', {
        几何体: renderer.info.memory.geometries,
        纹理: renderer.info.memory.textures,
        场景物体: scene.children.length,
        音符方块: noteObjects.length,
        MIDI数据: midiNotes.length
    });
    
    // 等待一帧
    await new Promise(resolve => requestAnimationFrame(resolve));
    
    // 加载新的MIDI文件
    console.log('📥 加载新 MIDI 文件...');
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
    
    // 播放点击音效
    if (audioEngine && audioEngine.playClickSound) {
        audioEngine.playClickSound();
    }
    
    // 延迟一点点，让音效播放完
    setTimeout(() => {
        restart();
    }, 50);
}
restartButton.addEventListener('click', handleRestart);
restartButton.addEventListener('touchend', handleRestart);

// 继续功能已取消

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
}, 1000);

// ========== 灵动岛功能 ==========

// 更新灵动岛标题
function updateIslandTitle(name) {
    islandTitle.textContent = name;
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
            } else if (targetTab === 'settings') {
                document.getElementById('settingsTab').classList.add('active');
            }
        });
    });
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
    
    // === 第一步：立即清理所有旧数据 ===
    console.log('🧹 步骤1: 清理旧场景对象...');
    cleanupObjects(obstacles);
    cleanupObjects(coins);
    cleanupObjects(noteObjects);
    blocksCreated = false;
    
    // 清理旧的 MIDI 数据
    console.log('🧹 步骤2: 清理旧 MIDI 数据...');
    midiNotes = [];
    totalNotes = 0;
    notesTriggered = 0;
    collisions = 0;
    
    // 清理拖尾效果
    trailPositions = [];
    trailSpheres.forEach(sphere => {
        sphere.material.opacity = 0;
    });
    
    // 重置游戏状态
    score = 0;
    distance = 0;
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
        
        // 设置播放按钮点击事件
        const startGame = async (e) => {
            if (e) e.preventDefault();
            startButton.removeEventListener('click', startGame);
            startButton.removeEventListener('touchstart', startGame);
            startButton.style.display = 'none';
            
            // 立即播放开始音效
            audioEngine.playStartSound();
            
            // 启动音频上下文（在用户交互时）
            console.log('🔊 启动音频上下文...');
            try {
                await audioEngine.start();
                console.log('✅ 音频上下文已启动');
                
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
                console.error('启动失败:', error);
                alert('启动失败，请刷新页面重试');
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

// 全局清理函数（调试用）
window.forceCleanup = function() {
    console.log('🧹 强制清理所有数据...');
    
    // 停止游戏
    gameRunning = false;
    
    // 清理所有对象
    cleanupObjects(obstacles);
    cleanupObjects(coins);
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

// 启动游戏
init();
animate(performance.now());
