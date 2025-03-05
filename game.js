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

// Slope (Simple Plane)
const slopeGeometry = new THREE.PlaneGeometry(100, 200, 32, 32);
const slopeMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide });
const slope = new THREE.Mesh(slopeGeometry, slopeMaterial);
slope.rotation.x = -Math.PI / 2; // Lay it flat
scene.add(slope);

// Snowboarder (Cube for simplicity)
const boarderGeometry = new THREE.BoxGeometry(1, 1, 2);
const boarderMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000 });
const boarder = new THREE.Mesh(boarderGeometry, boarderMaterial);
boarder.position.set(0, 1, 0);
scene.add(boarder);

// Puck (Sphere)
const puckGeometry = new THREE.SphereGeometry(0.5, 32, 32);
const puckMaterial = new THREE.MeshBasicMaterial({ color: 0x0000ff });
const puck = new THREE.Mesh(puckGeometry, puckMaterial);
puck.position.set(0, 0.5, 5);
scene.add(puck);

// Camera Position
camera.position.set(0, 10, 15);
camera.lookAt(boarder.position);

// Movement Variables
let speed = 0.1;
let puckSpeed = { x: 0, z: 0 };
let keys = {};

// Key Controls
document.addEventListener('keydown', (event) => {
    keys[event.code] = true;
});
document.addEventListener('keyup', (event) => {
    keys[event.code] = false;
});

// Basic Physics and Collision
function updatePhysics() {
    // Snowboarder Movement
    if (keys['ArrowLeft']) boarder.position.x -= speed;
    if (keys['ArrowRight']) boarder.position.x += speed;
    if (keys['ArrowUp']) boarder.position.z -= speed;
    if (keys['ArrowDown']) boarder.position.z += speed;

    // Boundaries
    boarder.position.x = Math.max(-50, Math.min(50, boarder.position.x));
    boarder.position.z = Math.max(-100, Math.min(100, boarder.position.z));

    // Puck Movement
    puck.position.x += puckSpeed.x;
    puck.position.z += puckSpeed.z;
    puckSpeed.x *= 0.98; // Friction
    puckSpeed.z *= 0.98;

    // Collision with Puck
    const distance = boarder.position.distanceTo(puck.position);
    if (distance < 2 && keys['Space']) {
        puckSpeed.x = (puck.position.x - boarder.position.x) * 0.2;
        puckSpeed.z = (puck.position.z - boarder.position.z) * 0.2;
    }

    // Keep puck on slope
    puck.position.y = 0.5;
}

// Animation Loop
function animate() {
    requestAnimationFrame(animate);
    updatePhysics();
    renderer.render(scene, camera);
}
animate();

// Resize Handler
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});
