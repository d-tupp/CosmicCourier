// Scene Setup
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// Lighting
const light = new THREE.DirectionalLight(0xffffff, 1);
light.position.set(5, 10, 5).normalize();
scene.add(light);

// Simple Perlin Noise Implementation
const Noise = {
    seed: function(val) { this._seed = val || Math.random(); },
    perlin2: function(x, y) {
        const n = x + y * 57 + this._seed * 1000;
        const r = Math.sin(n) * 10000;
        return r - Math.floor(r);
    }
};
Noise.seed(Math.random());

// Terrain with Perlin Noise
function generateTerrain() {
    const geometry = new THREE.PlaneGeometry(100, 200, 64, 64);
    const vertices = geometry.attributes.position.array;
    for (let i = 0; i < vertices.length; i += 3) {
        const x = vertices[i];
        const y = vertices[i + 1];
        vertices[i + 2] = Noise.perlin2(x * 0.05, y * 0.05) * 10 + Noise.perlin2(x * 0.1, y * 0.1) * 5;
    }
    geometry.computeVertexNormals();
    const material = new THREE.MeshPhongMaterial({ color: 0xffffff, side: THREE.DoubleSide });
    return new THREE.Mesh(geometry, material);
}
const slope = generateTerrain();
slope.rotation.x = -Math.PI / 2;
scene.add(slope);

// Goal
const goalGeometry = new THREE.BoxGeometry(10, 5, 1);
const goalMaterial = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
const goal = new THREE.Mesh(goalGeometry, goalMaterial);
goal.position.set(0, 2.5, -100);
scene.add(goal);

// Particle System with Fade-Out and Tweaked Colors
function createParticles(position, color) {
    const geometry = new THREE.BufferGeometry();
    const vertices = [];
    const velocities = [];
    for (let i = 0; i < 50; i++) {
        vertices.push(Math.random() * 2 - 1, Math.random() * 2 - 1, Math.random() * 2 - 1);
        velocities.push((Math.random() - 0.5) * 0.05, (Math.random() - 0.5) * 0.05, (Math.random() - 0.5) * 0.05);
    }
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    const material = new THREE.PointsMaterial({ color: color === 0xffff00 ? 0xffa500 : 0x00ffff, size: 0.2, transparent: true, opacity: 1 }); // Orange for tricks, Cyan for goals
    const particles = new THREE.Points(geometry, material);
    particles.position.copy(position);
    scene.add(particles);

    let opacity = 1;
    const fadeOut = setInterval(() => {
        opacity -= 0.05;
        material.opacity = opacity;
        const positions = particles.geometry.attributes.position.array;
        for (let i = 0; i < positions.length; i += 3) {
            positions[i] += velocities[i / 3];
            positions[i + 1] += velocities[i / 3 + 1];
            positions[i + 2] += velocities[i / 3 + 2];
        }
        particles.geometry.attributes.position.needsUpdate = true;
        if (opacity <= 0) {
            clearInterval(fadeOut);
            scene.remove(particles);
        }
    }, 50);
}

// Snowfall Weather Effect
function createSnowfall() {
    const geometry = new THREE.BufferGeometry();
    const vertices = [];
    for (let i = 0; i < 1000; i++) {
        vertices.push(Math.random() * 100 - 50, Math.random() * 50, Math.random() * 200 - 100);
    }
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    const material = new THREE.PointsMaterial({ color: 0xffffff, size: 0.1 });
    const snow = new THREE.Points(geometry, material);
    scene.add(snow);
    return snow;
}
const snow = createSnowfall();

// Load 3D Models from GitHub
const loader = new THREE.GLTFLoader();
let boarder, puck;
loader.load('https://raw.githubusercontent.com/d-tupp/CosmicCourier/main/snowboarder.gltf', (gltf) => {
    boarder = gltf.scene;
    boarder.scale.set(1, 1, 1);
    boarder.position.set(0, 1, 0);
    scene.add(boarder);
}, undefined, (error) => console.error('Snowboarder load error:', error));
loader.load('https://raw.githubusercontent.com/d-tupp/CosmicCourier/main/puck.gltf', (gltf) => {
    puck = gltf.scene;
    puck.scale.set(0.5, 0.5, 0.5);
    puck.position.set(0, 0.5, 5);
    scene.add(puck);
}, undefined, (error) => console.error('Puck load error:', error));

// Camera Position
camera.position.set(0, 10, 15);
camera.lookAt(new THREE.Vector3(0, 0, 0));

// Multiplayer WebSocket
const socket = new WebSocket('ws://localhost:8080');
let players = {};
let scores = {};
let lastUpdateTime = 0;
const updateInterval = 100;
socket.onmessage = (event) => {
    const data = JSON.parse(event.data);
    if (data.type === 'update') {
        players[data.id] = data;
        scores[data.id] = data.score || 0;
        updatePlayerHUD();
        updateLeaderboard();
    }
};

// Sound Effects (Including Wind)
const audioLoader = new THREE.AudioLoader();
const listener = new THREE.AudioListener();
camera.add(listener);
const slapSound = new THREE.Audio(listener);
const goalSound = new THREE.Audio(listener);
const windSound = new THREE.Audio(listener);
audioLoader.load('https://example.com/slap.mp3', (buffer) => slapSound.setBuffer(buffer));
audioLoader.load('https://example.com/goal.mp3', (buffer) => goalSound.setBuffer(buffer));
audioLoader.load('https://example.com/wind.mp3', (buffer) => {
    windSound.setBuffer(buffer);
    windSound.setLoop(true);
    windSound.setVolume(0.5);
    windSound.play();
});

// Game State
let speed = 0.1;
let puckSpeed = { x: 0, z: 0 };
let keys = {};
let isTricking = false;
let score = 0;
const ui = document.getElementById('ui');
const playerHUD = document.getElementById('players');
const leaderboard = document.getElementById('leaderboard');

// HUD and Leaderboard with Avatars
function updatePlayerHUD() {
    const playerList = Object.keys(players).map(id => `Player ${id.slice(-4)}`).join(', ');
    playerHUD.textContent = `Players: ${playerList || 'None'}`;
}
function updateLeaderboard() {
    const sortedScores = Object.entries(scores)
        .sort((a, b) => b[1] - a[1])
        .map(([id, score]) => {
            const color = `#${Math.floor(Math.abs(Math.sin(id) * 16777215)).toString(16).padStart(6, '0')}`;
            return `<span class="avatar" style="background-color: ${color};"></span>Player ${id.slice(-4)}: ${score}`;
        })
        .join('<br>');
    leaderboard.innerHTML = `Leaderboard:<br>${sortedScores || 'No scores yet'}`;
}

// Reset Button
document.getElementById('reset').addEventListener('click', () => {
    score = 0;
    ui.textContent = `Score: ${score}`;
    boarder.position.set(0, 1, 0);
    puck.position.set(0, 0.5, 5);
    puckSpeed.x = 0;
    puckSpeed.z = 0;
    isTricking = false;
    boarder.rotation.set(0, 0, 0);
    scores[socket.id || 'player1'] = 0;
    socket.send(JSON.stringify({ type: 'update', id: socket.id || 'player1', score: 0 }));
});

// Key Controls
document.addEventListener('keydown', (event) => {
    keys[event.code] = true;
    if (event.code === 'KeyT' && !isTricking) isTricking = true;
});
document.addEventListener('keyup', (event) => keys[event.code] = false);

// Physics and Logic
function updatePhysics() {
    if (!boarder || !puck) return;

    // Snowboarder Movement
    if (keys['ArrowLeft']) boarder.position.x -= speed;
    if (keys['ArrowRight']) boarder.position.x += speed;
    if (keys['ArrowUp']) boarder.position.z -= speed;
    if (keys['ArrowDown']) boarder.position.z += speed;

    // Terrain Height Adjustment
    const raycaster = new THREE.Raycaster(boarder.position, new THREE.Vector3(0, -1, 0));
    const intersects = raycaster.intersectObject(slope);
    if (intersects.length > 0) boarder.position.y = intersects[0].point.y + 1;

    // Trick Animation
    if (isTricking) {
        boarder.rotation.x += 0.1;
        if (boarder.rotation.x > Math.PI * 2) {
            boarder.rotation.x = 0;
            isTricking = false;
            score += 10;
            ui.textContent = `Score: ${score}`;
            createParticles(boarder.position, 0xffff00);
        }
    }

    // Puck Movement
    puck.position.x += puckSpeed.x;
    puck.position.z += puckSpeed.z;
    puckSpeed.x *= 0.98;
    puckSpeed.z *= 0.98;

    // Puck Collision with Goal
    if (puck.position.z < -98 && puck.position.z > -102 && puck.position.x > -5 && puck.position.x < 5) {
        score += 50;
        ui.textContent = `Score: ${score}`;
        goalSound.play();
        createParticles(puck.position, 0x00ff00);
        puck.position.set(0, 0.5, 5);
        puckSpeed.x = 0;
        puckSpeed.z = 0;
    }

    // Puck Slap
    const distance = boarder.position.distanceTo(puck.position);
    if (distance < 2 && keys['Space']) {
        puckSpeed.x = (puck.position.x - boarder.position.x) * 0.2;
        puckSpeed.z = (puck.position.z - boarder.position.z) * 0.2;
        slapSound.play();
    }

    // Puck Terrain Adjustment
    const puckRay = new THREE.Raycaster(puck.position, new THREE.Vector3(0, -1, 0));
    const puckIntersects = puckRay.intersectObject(slope);
    if (puckIntersects.length > 0) puck.position.y = puckIntersects[0].point.y + 0.5;

    // Snowfall Animation
    const snowPositions = snow.geometry.attributes.position.array;
    for (let i = 0; i < snowPositions.length; i += 3) {
        snowPositions[i + 1] -= 0.05;
        if (snowPositions[i + 1] < 0) snowPositions[i + 1] = 50;
    }
    snow.geometry.attributes.position.needsUpdate = true;

    // Optimized Multiplayer Update
    const now = Date.now();
    if (now - lastUpdateTime > updateInterval) {
        socket.send(JSON.stringify({
            type: 'update',
            id: socket.id || 'player1',
            position: boarder.position,
            rotation: boarder.rotation,
            score: score
        }));
        lastUpdateTime = now;
    }
}

// Animation Loop
function animate() {
    requestAnimationFrame(animate);
    updatePhysics();
    for (let id in players) {
        if (!scene.getObjectByName(id)) {
            const otherPlayer = boarder.clone();
            otherPlayer.name = id;
            scene.add(otherPlayer);
        }
        const player = scene.getObjectByName(id);
        player.position.copy(players[id].position);
        player.rotation.copy(players[id].rotation);
    }
    renderer.render(scene, camera);
}
animate();

// Resize Handler
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});
