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

// 跳跃状态
let isJumping = false;
let verticalVelocity = 0;
const gravity = -0.022; // 增加重力，加快下落速度
const jumpForce = 0.35; // 增加跳跃力度，加快速度
const groundY = 0.25; // 小球的地面高度

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


// 游戏配置
const LANES = 5;
const LANE_WIDTH = 2;
const GROUND_LENGTH = 100;

// 帧率检测和适配
let targetFPS = 60;
let lastFrameTime = performance.now();
let frameCount = 0;
let fpsCheckTime = 0;
let fpsHistory = [];
let currentFPS = 0;

function detectRefreshRate() {
    // 计算平均FPS
    const avgFPS = fpsHistory.reduce((a, b) => a + b, 0) / fpsHistory.length;
    
    if (avgFPS > 110) {
        targetFPS = 120;
    } else if (avgFPS > 80) {
        targetFPS = 90;
    } else {
        targetFPS = 60;
    }
    console.log(`检测到屏幕刷新率: ${targetFPS}Hz (平均FPS: ${avgFPS.toFixed(1)})`);
    fpsElement.textContent = `${targetFPS}Hz`;
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
    scene.background = new THREE.Color(0x87ceeb); // 设置背景色和雾一样
    scene.fog = new THREE.Fog(0x87ceeb, 10, 100);
    
    // 创建相机 - 更宽的视角以显示完整的5条轨道
    const aspect = window.innerWidth / window.innerHeight;
    // 根据屏幕比例调整FOV，手机竖屏需要更大的FOV
    const fov = aspect < 1 ? 75 : 60;
    camera = new THREE.PerspectiveCamera(fov, aspect, 0.1, 1000);
    camera.position.set(0, 5.5, 8);
    camera.lookAt(0, 0, -8);
    
    // 创建渲染器 - 高画质设置
    const canvas = document.getElementById('gameCanvas');
    renderer = new THREE.WebGLRenderer({ 
        canvas: canvas,
        antialias: true,
        powerPreference: "high-performance",
        precision: "highp"
    });
    
    // 设置像素比以提高画质（最高2倍，避免过度消耗性能）
    const pixelRatio = Math.min(window.devicePixelRatio, 2);
    renderer.setPixelRatio(pixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    
    // 优化阴影设置
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    
    // 添加光源
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);
    
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(5, 10, 5);
    directionalLight.castShadow = true;
    directionalLight.shadow.camera.left = -20;
    directionalLight.shadow.camera.right = 20;
    directionalLight.shadow.camera.top = 20;
    directionalLight.shadow.camera.bottom = -20;
    scene.add(directionalLight);
    
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

// 初始化MIDI系统
async function initMIDISystem() {
    try {
        midiParser = new MIDIParser();
        audioEngine = new AudioEngine();
        
        loadingElement.textContent = '加载MIDI文件...';
        
        // 只等待MIDI文件加载
        const notes = await midiParser.loadMIDI('2025-11-16 23.35.43.mp3.mid?v=1');
        
        if (notes.length === 0) {
            console.error('MIDI文件中没有音符');
            startNormalGame();
            return;
        }
        
        // 处理音符数据
        processMIDINotes(notes);
        
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
        const startGame = (e) => {
            console.log('播放按钮被点击');
            if (e) e.preventDefault();
            startButton.removeEventListener('click', startGame);
            startButton.removeEventListener('touchstart', startGame);
            startButton.style.display = 'none';
            
            // 立即开始游戏（不等待任何东西）
            startMIDIGame();
            
            // 在后台启动音频并加载音色（完全不阻塞）
            setTimeout(async () => {
                try {
                    await audioEngine.start();
                    audioEngine.init((loaded, total) => {
                        console.log(`后台加载钢琴音色 ${loaded}/${total}`);
                    }).then(() => {
                        console.log('钢琴音色加载完成！');
                    }).catch(err => {
                        console.error('音色加载失败:', err);
                    });
                } catch (error) {
                    console.error('音频启动失败:', error);
                }
            }, 100);
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

// 处理MIDI音符
function processMIDINotes(notes) {
    // 将音符随机分配到5个轨道（使用音符时间作为种子确保每次结果一致）
    midiNotes = notes.map(note => {
        // 使用音符的时间作为随机种子
        const seed = note.time * 1000; // 放大以获得更好的随机性
        const randomValue = seededRandom(seed);
        const lane = Math.floor(randomValue * LANES);
        
        return {
            time: midiParser.ticksToSeconds(note.time),
            lane: lane,
            note: note.note,
            velocity: note.velocity,
            duration: midiParser.ticksToSeconds(note.duration),
            triggered: false,
            collided: false
        };
    });
    
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

// 创建音符方块
function createNoteBlock(noteData) {
    // 平均分配超高黑块：每5个黑块中有1个超高（20%）
    // 使用音符索引来确保均匀分布
    const noteIndex = noteObjects.length;
    const isTall = (noteIndex % 5) === 0; // 每5个一个超高
    const blockHeight = isTall ? 2.5 : 0.4; // 超高2.5或普通0.4
    const blockY = isTall ? 1.25 : 0.2; // 超高方块的Y位置也要调整
    
    const geometry = new THREE.BoxGeometry(1.5, blockHeight, 1.2);
    const material = new THREE.MeshStandardMaterial({ 
        color: 0x000000, // 黑色
        emissive: 0x111111,
        metalness: 0.3,
        roughness: 0.7,
        transparent: true,
        opacity: 1
    });
    const noteBlock = new THREE.Mesh(geometry, material);
    
    const x = (noteData.lane - 2) * LANE_WIDTH;
    // 根据时间计算初始Z位置
    // 音符需要在正确的时间到达触发线
    // 触发线在 z=2，音符以原始基础速度移动
    // 使用原始基础速度来计算位置，这样位置永远不变
    // 添加额外的偏移量让第一个音符从迷雾边缘开始（大约-40的位置）
    const extraDistance = 42; // 固定距离，让第一个音符出现在迷雾边缘
    const zPosition = 2 - (noteData.time * originalBaseSpeed * 60) - extraDistance;
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
    const groundGeometry = new THREE.PlaneGeometry(LANES * LANE_WIDTH, GROUND_LENGTH);
    const groundMaterial = new THREE.MeshStandardMaterial({ 
        color: 0x2c3e50,
        roughness: 0.8
    });
    
    for (let i = 0; i < 3; i++) {
        const groundMesh = new THREE.Mesh(groundGeometry, groundMaterial);
        groundMesh.rotation.x = -Math.PI / 2;
        groundMesh.position.z = -GROUND_LENGTH * i;
        groundMesh.receiveShadow = true;
        scene.add(groundMesh);
        ground.push(groundMesh);
    }
    
    // 添加轨道线（支持雾效）
    const lineMaterial = new THREE.LineBasicMaterial({ 
        color: 0x95a5a6,
        fog: true  // 让轨道线受雾效影响
    });
    for (let i = 1; i < LANES; i++) {
        const points = [];
        const x = (i - LANES / 2) * LANE_WIDTH;
        points.push(new THREE.Vector3(x, 0.01, 50));
        points.push(new THREE.Vector3(x, 0.01, -200));
        const lineGeometry = new THREE.BufferGeometry().setFromPoints(points);
        const line = new THREE.Line(lineGeometry, lineMaterial);
        scene.add(line);
    }
    
    // 创建触发线（绿色）
    createTriggerLine();
}

// 创建触发线
function createTriggerLine() {
    const geometry = new THREE.PlaneGeometry(LANES * LANE_WIDTH, 0.3);
    const material = new THREE.MeshBasicMaterial({ 
        color: 0xffffff,  // 改为白色
        transparent: true,
        opacity: 0.8,
        side: THREE.DoubleSide
    });
    triggerLine = new THREE.Mesh(geometry, material);
    triggerLine.rotation.x = -Math.PI / 2;
    triggerLine.position.set(0, 0.02, 2);
    scene.add(triggerLine);
}

// 拖尾效果数组
let trailPositions = [];
const trailLength = 10;
let trailSpheres = [];

// 创建玩家（白色小球）
function createPlayer() {
    const geometry = new THREE.SphereGeometry(0.25, 32, 32);
    const material = new THREE.MeshStandardMaterial({ 
        color: 0xffffff,
        emissive: 0xffffff,
        emissiveIntensity: 0.8,
        metalness: 1.0,
        roughness: 0.1
    });
    player = new THREE.Mesh(geometry, material);
    player.position.set(0, 0.25, 0);
    player.castShadow = true;
    scene.add(player);
    
    // 添加发光效果
    const glowGeometry = new THREE.SphereGeometry(0.35, 32, 32);
    const glowMaterial = new THREE.MeshBasicMaterial({
        color: 0x00ffff,
        transparent: true,
        opacity: 0.4
    });
    const glow = new THREE.Mesh(glowGeometry, glowMaterial);
    player.add(glow);
    
    // 创建拖尾球体（炫酷渐变色）
    for (let i = 0; i < trailLength; i++) {
        const trailGeometry = new THREE.SphereGeometry(0.2, 16, 16);
        const hue = (i / trailLength) * 0.3; // 从青色到蓝色渐变
        const color = new THREE.Color().setHSL(0.5 + hue, 1.0, 0.6);
        const trailMaterial = new THREE.MeshBasicMaterial({
            color: color,
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
            const opacity = (1 - i / trailLength) * 0.8;
            trailSpheres[i].material.opacity = opacity;
            const scale = (1 - i / trailLength) * 0.8;
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

// 更新玩家位置
function updatePlayer() {
    // 平滑移动到目标轨道
    if (currentLane !== targetLane) {
        const diff = targetLane - currentLane;
        currentLane += diff * 0.25; // 加快左右移动速度
        if (Math.abs(targetLane - currentLane) < 0.01) {
            currentLane = targetLane;
        }
    }
    
    const targetX = (currentLane - 2) * LANE_WIDTH;
    player.position.x = targetX;
    
    // 相机跟随玩家左右移动
    const cameraTargetX = player.position.x;
    camera.position.x += (cameraTargetX - camera.position.x) * 0.1;
    
    // 相机始终看向玩家前方
    camera.lookAt(player.position.x, 0, player.position.z - 8);
    
    // 跳跃物理 - 基于时间，不绑定帧率
    if (isJumping) {
        // 使用 deltaTime 让跳跃在不同帧率下一致
        const gravityPerSecond = gravity * 60; // 转换为每秒的重力
        const velocityPerSecond = verticalVelocity * 60; // 转换为每秒的速度
        
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

// 跳跃函数
function jump() {
    if (!isJumping) {
        // 在地面 = 跳跃
        isJumping = true;
        verticalVelocity = jumpForce;
    } else {
        // 在空中 = 下落（速度和跳跃一致）
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
            
            // 播放音符
            audioEngine.playNote(noteData.note, noteData.duration, noteData.velocity);
            
            // 改变颜色表示已触发（白色）
            noteBlock.material.color.setHex(0xffffff);
            noteBlock.material.emissive.setHex(0xffffff);
            
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
    
    // 显示完成提示
    comboElement.style.display = 'block';
    comboElement.textContent = `⭐ 完成！获得第 ${starsEarned} 颗星！`;
    comboElement.style.fontSize = '24px';
    comboElement.style.color = '#ffd700';
    
    // 1秒后隐藏提示并继续
    setTimeout(() => {
        comboElement.style.display = 'none';
        restartRound();
    }, 1000);
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
    
    // 更新UI
    scoreElement.textContent = `⭐ ${starsEarned} | 音符: 0/${totalNotes}`;
    distanceElement.textContent = `速度: ${speedMultiplier.toFixed(2)}x`;
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
        // 只有在第二轮及以后才缓慢增加速度
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
        // 上键或空格 = 跳跃或下落
        if (!isJumping) {
            isJumping = true;
            verticalVelocity = jumpForce;
        } else {
            verticalVelocity = -jumpForce * 1.5;
        }
    } else if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') {
        // 下键 = 快速下落
        if (isJumping) {
            verticalVelocity = -jumpForce * 1.5;
        }
    }
});

// 触摸控制（移动设备）- 阻止浏览器默认行为
let touchStartX = 0;
let touchStartY = 0;

document.addEventListener('touchstart', (e) => {
    // 只在游戏运行时阻止默认行为
    if (gameRunning) {
        e.preventDefault();
        touchStartX = e.touches[0].clientX;
        touchStartY = e.touches[0].clientY;
    }
}, { passive: false });

document.addEventListener('touchmove', (e) => {
    // 只在游戏运行时阻止默认行为
    if (gameRunning) {
        e.preventDefault();
    }
}, { passive: false });

document.addEventListener('touchstart', (e) => {
    // 只在游戏运行时阻止默认行为
    if (gameRunning) {
        e.preventDefault();
        touchStartX = e.touches[0].clientX;
        touchStartY = e.touches[0].clientY;
    }
}, { passive: false });

document.addEventListener('touchmove', (e) => {
    // 只在游戏运行时阻止默认行为
    if (gameRunning) {
        e.preventDefault();
    }
}, { passive: false });

document.addEventListener('touchend', (e) => {
    // 只在游戏运行时处理游戏控制
    if (!gameRunning) return;
    
    e.preventDefault();
    
    const touchEndX = e.changedTouches[0].clientX;
    const touchEndY = e.changedTouches[0].clientY;
    const diffX = touchEndX - touchStartX;
    const diffY = touchEndY - touchStartY;
    
    // 判断是滑动还是点击
    if (Math.abs(diffX) > 30 || Math.abs(diffY) > 30) {
        // 滑动操作
        if (Math.abs(diffX) > Math.abs(diffY)) {
            // 左右滑动切换轨道
            if (diffX > 0 && targetLane < LANES - 1) {
                targetLane++;
            } else if (diffX < 0 && targetLane > 0) {
                targetLane--;
            }
        }
    } else {
        // 点击 = 跳跃或下落（松手时判定）
        if (!isJumping) {
            // 在地面 = 跳跃
            isJumping = true;
            verticalVelocity = jumpForce;
        } else {
            // 在空中 = 立即下落到地面
            player.position.y = groundY;
            isJumping = false;
            verticalVelocity = 0;
        }
    }
}, { passive: false });

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



// 启动游戏
init();
animate(performance.now());
