// 道具系统 - 管理游戏中的可拾取道具

const ItemType = {
    WHITE_FRUIT: 'white_fruit',
    RED_FRUIT: 'red_fruit',
    PUZZLE_PIECE: 'puzzle_piece'
};

const ItemConfig = {
    [ItemType.WHITE_FRUIT]: { name: '白色果实', color: 0xffffff, healthChange: 20, scoreChange: 50, size: 0.3 },
    [ItemType.RED_FRUIT]: { name: '红色果实', color: 0xff0000, healthChange: -30, scoreChange: -50, size: 0.3 },
    [ItemType.PUZZLE_PIECE]: { name: '拼图碎片', color: 0xaaaaff, healthChange: 0, scoreChange: 100, puzzlePieceChange: 1, size: 0.4 }
};

class ItemSpawner {
    constructor(scene, lanes, laneWidth) {
        this.scene = scene;
        this.lanes = lanes;
        this.laneWidth = laneWidth;
        this.items = [];
        this.spawnInterval = 2500;
        this.lastSpawnTime = 0;
        this.enabled = false;
        this.firstBlockZ = null;
        this.lastBlockZ = null;
    }

    start() {
        this.enabled = true;
        this.lastSpawnTime = performance.now();
        this.updateBlockRange();
    }

    updateBlockRange() {
        if (typeof noteObjects === 'undefined' || !noteObjects || noteObjects.length === 0) {
            this.firstBlockZ = null;
            this.lastBlockZ = null;
            return;
        }
        let minZ = Infinity, maxZ = -Infinity;
        for (const block of noteObjects) {
            if (block.position.z < minZ) minZ = block.position.z;
            if (block.position.z > maxZ) maxZ = block.position.z;
        }
        this.firstBlockZ = maxZ;
        this.lastBlockZ = minZ;
    }

    stop() { this.enabled = false; }

    clear() {
        this.items.forEach(item => {
            if (item.mesh.parent) this.scene.remove(item.mesh);
            if (item.mesh.geometry) item.mesh.geometry.dispose();
            if (item.mesh.material) item.mesh.material.dispose();
            if (item.lightBeam) {
                if (item.lightBeam.parent) this.scene.remove(item.lightBeam);
                if (item.lightBeam.geometry) item.lightBeam.geometry.dispose();
                if (item.lightBeam.material) item.lightBeam.material.dispose();
            }
        });
        this.items = [];
    }

    update(currentTime, deltaTime, moveSpeed) {
        if (!this.enabled) return;
        if (currentTime - this.lastSpawnTime > this.spawnInterval) {
            this.spawnItem();
            this.lastSpawnTime = currentTime;
        }
        for (let i = this.items.length - 1; i >= 0; i--) {
            const item = this.items[i];
            item.mesh.position.z += moveSpeed * deltaTime;
            item.mesh.rotation.y += deltaTime * 2;
            item.floatTime += deltaTime * 3;
            item.mesh.position.y = item.baseY + Math.sin(item.floatTime) * 0.1;
            if (item.lightBeam) {
                item.lightBeam.position.z = item.mesh.position.z;
                const beamHeight = item.mesh.position.y - 0.05;
                item.lightBeam.position.y = beamHeight / 2 + 0.05;
                item.lightBeam.scale.y = beamHeight / (item.baseY - 0.05);
            }
            if (item.mesh.position.z > 10) this.removeItem(i);
        }
    }

    spawnItem() {
        this.updateBlockRange();
        if (this.firstBlockZ === null || this.lastBlockZ === null) { this.stop(); return; }
        
        const itemType = this.getRandomItemType();
        const lane = Math.floor(Math.random() * this.lanes);
        const x = (lane - 2) * this.laneWidth;
        const currentFogFar = (typeof scene !== 'undefined' && scene?.fog) ? scene.fog.far : 120;
        const cameraZ = (typeof camera !== 'undefined' && camera) ? camera.position.z : 5;
        const fogEdgeZ = cameraZ - currentFogFar * 0.5;
        const spawnBehindFog = 30, spawnRange = 20;
        const minZ = fogEdgeZ - spawnBehindFog - spawnRange;
        const maxZ = fogEdgeZ - spawnBehindFog;
        const distanceToLastBlock = Math.abs(cameraZ - this.lastBlockZ);
        if (distanceToLastBlock < 50) return;
        const actualMinZ = Math.max(minZ, this.lastBlockZ + 10);
        const actualMaxZ = Math.max(maxZ, this.lastBlockZ + 30);
        if (actualMaxZ - actualMinZ < 10 || actualMaxZ > cameraZ - 30) return;
        
        const z = actualMinZ + Math.random() * (actualMaxZ - actualMinZ);
        const y = 0.5;
        if (this.checkOverlapWithBlocks(x, y, z, lane)) return;
        
        const item = this.createItemMesh(itemType, x, y, z, lane);
        this.items.push(item);
        this.scene.add(item.mesh);
    }

    checkOverlapWithBlocks(x, y, z, lane) {
        if (typeof noteObjects === 'undefined' || !noteObjects) return false;
        for (const block of noteObjects) {
            if (!block.userData?.noteData || block.userData.noteData.lane !== lane) continue;
            const zDistance = Math.abs(z - block.position.z);
            if (zDistance < 2.0) {
                const blockHeight = block.userData.blockHeight || 0.4;
                const blockTop = block.position.y + blockHeight / 2;
                const blockBottom = block.position.y - blockHeight / 2;
                if (y - 0.3 < blockTop && y + 0.3 > blockBottom) return true;
            }
        }
        return false;
    }

    getRandomItemType() {
        const blockCount = typeof noteObjects !== 'undefined' && noteObjects ? noteObjects.length : 0;
        const puzzlePieceProb = 0.15;
        let whiteFruitProb, redFruitProb;
        if (blockCount > 100) { whiteFruitProb = 0.60; redFruitProb = 0.25; }
        else if (blockCount > 50) { whiteFruitProb = 0.50; redFruitProb = 0.35; }
        else if (blockCount > 20) { whiteFruitProb = 0.35; redFruitProb = 0.50; }
        else { whiteFruitProb = 0.25; redFruitProb = 0.60; }
        const totalProb = whiteFruitProb + redFruitProb + puzzlePieceProb;
        whiteFruitProb /= totalProb;
        redFruitProb /= totalProb;
        const rand = Math.random();
        if (rand < whiteFruitProb) return ItemType.WHITE_FRUIT;
        if (rand < whiteFruitProb + redFruitProb) return ItemType.RED_FRUIT;
        return ItemType.PUZZLE_PIECE;
    }

    createLightBeam(x, y, z) {
        const beamHeight = y - 0.05;
        const beamGeometry = new THREE.CylinderGeometry(0.15, 0.2, beamHeight, 8);
        const beamMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.3, side: THREE.DoubleSide });
        const beam = new THREE.Mesh(beamGeometry, beamMaterial);
        beam.position.set(x, beamHeight / 2 + 0.05, z);
        return beam;
    }

    createItemMesh(itemType, x, y, z, lane) {
        const config = ItemConfig[itemType];
        let geometry, material, mesh;
        
        if (itemType === ItemType.PUZZLE_PIECE) {
            const puzzleShape = new THREE.Shape();
            const size = config.size;
            puzzleShape.moveTo(-size, -size);
            puzzleShape.lineTo(size, -size);
            puzzleShape.lineTo(size, size);
            puzzleShape.lineTo(-size, size);
            puzzleShape.lineTo(-size, -size);
            geometry = new THREE.ExtrudeGeometry(puzzleShape, { depth: 0.1, bevelEnabled: true, bevelThickness: 0.02, bevelSize: 0.02, bevelSegments: 2 });
            material = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xaaaaff, emissiveIntensity: 0.6, metalness: 0.2, roughness: 0.3, transparent: true, opacity: 0.95 });
        } else {
            geometry = new THREE.SphereGeometry(config.size, 16, 16);
            material = new THREE.MeshStandardMaterial({ color: config.color, emissive: config.color, emissiveIntensity: 0.5, metalness: 0.3, roughness: 0.4, transparent: true, opacity: 0.9 });
        }
        
        mesh = new THREE.Mesh(geometry, material);
        mesh.position.set(x, y, z);
        mesh.castShadow = true;
        
        const edgesGeometry = new THREE.EdgesGeometry(geometry);
        const edgesMaterial = new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.6 });
        mesh.add(new THREE.LineSegments(edgesGeometry, edgesMaterial));
        
        let lightBeam = null;
        if (y > 1.0) { lightBeam = this.createLightBeam(x, y, z); this.scene.add(lightBeam); }
        
        return { type: itemType, mesh, lane, collected: false, baseY: y, floatTime: Math.random() * Math.PI * 2, lightBeam };
    }

    removeItem(index) {
        const item = this.items[index];
        if (item.mesh.parent) this.scene.remove(item.mesh);
        if (item.mesh.geometry) item.mesh.geometry.dispose();
        if (item.mesh.material) item.mesh.material.dispose();
        if (item.lightBeam) {
            if (item.lightBeam.parent) this.scene.remove(item.lightBeam);
            if (item.lightBeam.geometry) item.lightBeam.geometry.dispose();
            if (item.lightBeam.material) item.lightBeam.material.dispose();
        }
        this.items.splice(index, 1);
    }

    checkCollision(playerPosition, playerLane, playerRadius, onCollect) {
        for (let i = this.items.length - 1; i >= 0; i--) {
            const item = this.items[i];
            if (item.collected) continue;
            const itemPos = item.mesh.position;
            const dx = itemPos.x - playerPosition.x, dy = itemPos.y - playerPosition.y, dz = itemPos.z - playerPosition.z;
            const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);
            const collisionRadius = playerRadius + ItemConfig[item.type].size;
            if (distance < collisionRadius) {
                item.collected = true;
                if (onCollect) onCollect(item.type);
                this.playCollectAnimation(item, i);
            }
        }
    }

    playCollectAnimation(item, index) {
        const mesh = item.mesh;
        let scale = 1, opacity = 0.9;
        const animateInterval = setInterval(() => {
            scale += 0.15; opacity -= 0.15;
            mesh.scale.set(scale, scale, scale);
            mesh.material.opacity = Math.max(0, opacity);
            if (opacity <= 0) { clearInterval(animateInterval); this.removeItem(index); }
        }, 30);
    }
}

class HealthSystem {
    constructor(maxHealth = 100) {
        this.maxHealth = maxHealth;
        this.currentHealth = maxHealth;
        this.healthBarElement = null;
        this.healthTextElement = null;
        this.onHealthChange = null;
        this.onDeath = null;
    }

    initUI(playerMesh, camera, renderer) {
        const container = document.createElement('div');
        container.id = 'healthBarContainer';
        container.style.cssText = 'position: absolute; pointer-events: none; z-index: 50; display: block;';
        document.body.appendChild(container);
        
        const healthBarBg = document.createElement('div');
        healthBarBg.style.cssText = 'width: 100px; height: 8px; background: rgba(0,0,0,0.5); border-radius: 4px; border: 1px solid rgba(255,255,255,0.3); overflow: hidden;';
        
        const healthBar = document.createElement('div');
        healthBar.id = 'healthBar';
        healthBar.style.cssText = 'width: 100%; height: 100%; background: linear-gradient(90deg, #4ade80 0%, #22c55e 100%); transition: width 0.3s ease, background 0.3s ease; border-radius: 3px;';
        healthBarBg.appendChild(healthBar);
        
        const healthText = document.createElement('div');
        healthText.id = 'healthText';
        healthText.style.cssText = 'color: #fff; font-size: 12px; font-weight: 600; text-align: center; margin-top: 2px; text-shadow: 0 1px 3px rgba(0,0,0,0.8);';
        healthText.textContent = `${this.currentHealth}/${this.maxHealth}`;
        
        container.appendChild(healthBarBg);
        container.appendChild(healthText);
        
        this.healthBarElement = healthBar;
        this.healthTextElement = healthText;
        this.containerElement = container;
        this.playerMesh = playerMesh;
        this.camera = camera;
        this.renderer = renderer;
        this.updatePosition();
    }

    updatePosition() {
        if (!this.playerMesh || !this.camera || !this.containerElement) return;
        const vector = new THREE.Vector3();
        vector.setFromMatrixPosition(this.playerMesh.matrixWorld);
        vector.y += 0.8;
        vector.project(this.camera);
        const x = (vector.x * 0.5 + 0.5) * this.renderer.domElement.clientWidth;
        const y = (-vector.y * 0.5 + 0.5) * this.renderer.domElement.clientHeight;
        this.containerElement.style.left = `${x - 50}px`;
        this.containerElement.style.top = `${y}px`;
    }

    changeHealth(amount) {
        const oldHealth = this.currentHealth;
        this.currentHealth = Math.max(0, Math.min(this.maxHealth, this.currentHealth + amount));
        this.updateUI();
        if (this.onHealthChange) this.onHealthChange(this.currentHealth, oldHealth, amount);
        if (this.currentHealth <= 0 && this.onDeath) this.onDeath();
    }

    updateUI() {
        if (!this.healthBarElement || !this.healthTextElement) return;
        const percentage = (this.currentHealth / this.maxHealth) * 100;
        this.healthBarElement.style.width = `${percentage}%`;
        this.healthTextElement.textContent = `${this.currentHealth}/${this.maxHealth}`;
        if (percentage > 60) this.healthBarElement.style.background = 'linear-gradient(90deg, #4ade80 0%, #22c55e 100%)';
        else if (percentage > 30) this.healthBarElement.style.background = 'linear-gradient(90deg, #fbbf24 0%, #f59e0b 100%)';
        else this.healthBarElement.style.background = 'linear-gradient(90deg, #ef4444 0%, #dc2626 100%)';
    }

    reset() { this.currentHealth = this.maxHealth; this.updateUI(); }

    destroy() {
        if (this.containerElement?.parentNode) this.containerElement.parentNode.removeChild(this.containerElement);
        this.healthBarElement = null;
        this.healthTextElement = null;
        this.containerElement = null;
    }
}

class PuzzlePieceSystem {
    constructor() {
        this.puzzlePieces = 0;
        this.loadFromDatabase();
    }

    async loadFromDatabase() {
        if (typeof getPuzzlePieces === 'function') {
            const result = await getPuzzlePieces();
            if (result.success) {
                this.puzzlePieces = result.count;
                if (this.puzzlePieces === 0) { this.puzzlePieces = 25; await this.saveToDatabase(); }
            }
        }
        this.updateUI();
    }

    async saveToDatabase() {
        if (typeof updatePuzzlePieces === 'function') await updatePuzzlePieces(this.puzzlePieces);
    }

    async add(amount = 1) {
        this.puzzlePieces += amount;
        await this.saveToDatabase();
        this.updateUI();
        if (typeof cloudSyncManager !== 'undefined' && cloudSyncManager) await cloudSyncManager.pushAllDataToCloud();
    }

    async spend(amount) {
        if (this.puzzlePieces >= amount) {
            this.puzzlePieces -= amount;
            await this.saveToDatabase();
            this.updateUI();
            if (typeof cloudSyncManager !== 'undefined' && cloudSyncManager) await cloudSyncManager.pushAllDataToCloud();
            return true;
        }
        return false;
    }

    getCount() { return this.puzzlePieces; }

    updateUI() {
        const el = document.getElementById('puzzlePieceCount');
        if (el) el.textContent = this.puzzlePieces;
    }
}

if (typeof window !== 'undefined') {
    window.ItemType = ItemType;
    window.ItemConfig = ItemConfig;
    window.ItemSpawner = ItemSpawner;
    window.HealthSystem = HealthSystem;
    window.PuzzlePieceSystem = PuzzlePieceSystem;
}
