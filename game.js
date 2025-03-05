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

// Complex Terrain Generation (Perlin-like Noise)
function generateTerrain() {
    const geometry = new THREE.PlaneGeometry(100, 200, 64, 64);
    const vertices = geometry.attributes.position.array;
    for (let i = 0; i < vertices.length; i += 3) {
        const x = vertices[i];
        const y = vertices[i + 1];
        vertices[i + 2] = Math.sin(x * 0.1) * 5 + Math.cos(y * 0.1) * 5 + Math.random() * 2; // Hilly with randomness
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

// Load 3D Models from GitHub
const loader = new THREE.GLTFLoader();
let boarder, puck;
loader.load('https://raw.githubusercontent.com/your-username/your-repo/main/snowboarder.gltf', (gltf) => {
    boarder = gltf.scene;
    boarder.scale.set(1, 1, 1);
    boarder.position.set(0, 1, 0);
    scene.add(boarder);
}, undefined, (error) => console.error('Snowboarder load error:', error));
loader.load('https://raw.githubusercontent.com/your-username/your-repo/main/puck.gltf', (gltf) => {
    puck = gltf.scene;
    puck.scale.set(0.5, 0.5, 0.5);
    puck.position.set(0, 0.5, 5);
    scene.add(puck);
}, undefined, (error) => console.error('Puck load error:', error));

// Camera Position
camera.position.set(0, 10, 15);
camera.lookAt(new THREE.Vector3(0, 0, 0));

// Multiplayer WebSocket with Optimization
const socket = new WebSocket('ws://localhost:8080');
let players = {};
let lastUpdateTime = 0;
const updateInterval = 100; // Update every 100ms
socket.onmessage = (event) => {
    const data = JSON.parse(event.data);
    if (data.type === 'update') players[data.id] = data;
};

// Sound Effects
const audioLoader = new THREE.AudioLoader();
const listener = new THREE.AudioListener();
camera.add(listener);
const slapSound = new THREE.Audio(listener);
const goalSound = new THREE.Audio(listener);
audioLoader.load('https://example.com/slap.mp3', (buffer) => slapSound.setBuffer(buffer));
audioLoader.load('https://example.com/goal.mp3', (buffer) => goalSound.setBuffer(buffer));

// Game State
let speed = 0.1;
let puckSpeed = { x: 0, z: 0 };
let keys = {};
let isTricking = false;
let score = 0;
const ui = document.getElementById('ui');

// Key Controls
document.addEventListener('keydown', (event) => {
    keys[event.code] = true;
    if (event.code === 'KeyT' && !isTricking) isTricking = true;
});
document.addEventListener('keyup', (event) => keys[event.code] = false);

// Physics and Logic
function updatePhysics() {
    if (!boarder || !puck) return; // Wait for models to load

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
            score += 10; // Bonus for tricks
            ui.textContent = `Score: ${score}`;
        }
    }

    // Puck Movement
    puck.position.x += puckSpeed.x;
    puck.position.z += puckSpeed.z;
    puckSpeed.x *= 0.98;
    puckSpeed.z *= 0.98;

    // Puck Collision with Goal
    if (puck.position.z < -98 && puck.position.z > -102 && puck.position.x > -5 && puck.position.x < 5) {
        score += 50; // Goal points
        ui.textContent = `Score: ${score}`;
        goalSound.play();
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

    // Optimized Multiplayer Update
    const now = Date.now();
    if (now - lastUpdateTime > updateInterval) {
        socket.send(JSON.stringify({
            type: 'update',
            id: socket.id || 'player1',
            position: boarder.position,
            rotation: boarder.rotation
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
