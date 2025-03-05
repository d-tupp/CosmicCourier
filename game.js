// Three.js setup
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.getElementById("gameCanvas").appendChild(renderer.domElement);

// Game state
let gameState = "title";

// Ship (3D cone)
const shipGeometry = new THREE.ConeGeometry(5, 20, 32);
const shipMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff });
const ship = new THREE.Mesh(shipGeometry, shipMaterial);
ship.position.set(0, 0, 0);
ship.rotation.x = Math.PI / 2; // Point forward
scene.add(ship);

// Camera setup (third-person view)
camera.position.set(0, 50, 100);
camera.lookAt(ship.position);

// Lighting
const ambientLight = new THREE.AmbientLight(0x404040);
scene.add(ambientLight);
const pointLight = new THREE.PointLight(0xffffff, 1, 500);
pointLight.position.set(50, 50, 50);
scene.add(pointLight);

// Stars (small cubes)
const stars = [];
for (let i = 0; i < 200; i++) {
    const star = new THREE.Mesh(
        new THREE.BoxGeometry(1, 1, 1),
        new THREE.MeshBasicMaterial({ color: 0xffffff })
    );
    star.position.set(
        (Math.random() - 0.5) * 1000,
        (Math.random() - 0.5) * 1000,
        (Math.random() - 0.5) * 1000
    );
    scene.add(star);
    stars.push(star);
}

// Planets (spheres)
const planets = [
    { mesh: new THREE.Mesh(new THREE.SphereGeometry(15, 32, 32), new THREE.MeshBasicMaterial({ color: 0x0000ff })), x: -100, y: 0, z: -100 },
    { mesh: new THREE.Mesh(new THREE.SphereGeometry(15, 32, 32), new THREE.MeshBasicMaterial({ color: 0x00ff00 })), x: 100, y: 0, z: 100 },
    { mesh: new THREE.Mesh(new THREE.SphereGeometry(15, 32, 32), new THREE.MeshBasicMaterial({ color: 0xffa500 })), x: -100, y: 0, z: 100 },
    { mesh: new THREE.Mesh(new THREE.SphereGeometry(15, 32, 32), new THREE.MeshBasicMaterial({ color: 0x800080 })), x: 100, y: 0, z: -100 }
];
planets.forEach(planet => {
    planet.mesh.position.set(planet.x, planet.y, planet.z);
    scene.add(planet.mesh);
});

// Nebulae (semi-transparent spheres)
const nebulae = [
    { mesh: new THREE.Mesh(new THREE.SphereGeometry(50, 32, 32), new THREE.MeshBasicMaterial({ color: 0x800080, transparent: true, opacity: 0.3 })), x: 0, y: 0, z: 50 },
    { mesh: new THREE.Mesh(new THREE.SphereGeometry(70, 32, 32), new THREE.MeshBasicMaterial({ color: 0x800080, transparent: true, opacity: 0.3 })), x: 50, y: 0, z: -50 }
];
nebulae.forEach(nebula => {
    nebula.mesh.position.set(nebula.x, nebula.y, nebula.z);
    scene.add(nebula.mesh);
});

// Asteroids (moving spheres)
const asteroids = [
    { mesh: new THREE.Mesh(new THREE.SphereGeometry(10, 32, 32), new THREE.MeshBasicMaterial({ color: 0x808080 })), x: -50, y: 0, z: 0, dx: 0.5, dz: 0.3 },
    { mesh: new THREE.Mesh(new THREE.SphereGeometry(12, 32, 32), new THREE.MeshBasicMaterial({ color: 0x808080 })), x: 50, y: 0, z: -50, dx: -0.4, dz: 0.5 }
];
asteroids.forEach(asteroid => {
    asteroid.mesh.position.set(asteroid.x, asteroid.y, asteroid.z);
    scene.add(asteroid.mesh);
});

// Game variables
let carryingPackage = false;
let spacePressed = false;
let score = 0;
let currentPickup = 0;
let currentDelivery = 1;
let deliveryTimer = 0;
let pirateSpawnTimer = 0;
let pirates = [];
let fuelCanisters = [];
let fuelSpawnTimer = 600;
let highscores = loadHighscores();

const keys = {
    ArrowLeft: false,
    ArrowRight: false,
    ArrowUp: false,
    ArrowDown: false,
    Space: false
};

document.addEventListener("keydown", (e) => {
    if (e.code in keys) keys[e.code] = true;
});

document.addEventListener("keyup", (e) => {
    if (e.code in keys) keys[e.code] = false;
});

function distance3D(x1, y1, z1, x2, y2, z2) {
    return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2 + (z2 - z1) ** 2);
}

function setNewDelivery() {
    let pickupIndex, deliveryIndex;
    do {
        pickupIndex = Math.floor(Math.random() * planets.length);
        deliveryIndex = Math.floor(Math.random() * planets.length);
    } while (pickupIndex === deliveryIndex);
    currentPickup = pickupIndex;
    currentDelivery = deliveryIndex;
}

function spawnPirate() {
    const pirate = new THREE.Mesh(
        new THREE.ConeGeometry(5, 20, 32),
        new THREE.MeshBasicMaterial({ color: 0xff0000 })
    );
    pirate.rotation.x = Math.PI / 2;
    const edge = Math.random();
    if (edge < 0.25) pirate.position.set(-150, 0, Math.random() * 300 - 150);
    else if (edge < 0.5) pirate.position.set(150, 0, Math.random() * 300 - 150);
    else if (edge < 0.75) pirate.position.set(Math.random() * 300 - 150, 0, -150);
    else pirate.position.set(Math.random() * 300 - 150, 0, 150);
    scene.add(pirate);
    pirates.push({ mesh: pirate, speed: 0.5 });
}

function spawnFuelCanister() {
    const canister = new THREE.Mesh(
        new THREE.SphereGeometry(5, 32, 32),
        new THREE.MeshBasicMaterial({ color: 0xffff00 })
    );
    canister.position.set(
        Math.random() * 300 - 150,
        0,
        Math.random() * 300 - 150
    );
    scene.add(canister);
    fuelCanisters.push({ mesh: canister });
}

function loadHighscores() {
    const saved = localStorage.getItem("highscores");
    return saved ? JSON.parse(saved) : [];
}

function saveHighscores() {
    localStorage.setItem("highscores", JSON.stringify(highscores));
}

function update() {
    if (gameState !== "playing") return;

    // Fuel canister spawning
    fuelSpawnTimer--;
    if (fuelSpawnTimer <= 0) {
        spawnFuelCanister();
        fuelSpawnTimer = 600;
    }

    // Check fuel canister collection
    fuelCanisters = fuelCanisters.filter(canister => {
        const dist = distance3D(ship.position.x, ship.position.y, ship.position.z, canister.mesh.position.x, canister.mesh.position.y, canister.mesh.position.z);
        if (dist < 15) {
            ship.fuel = Math.min(ship.maxFuel, ship.fuel + 20);
            scene.remove(canister.mesh);
            return false;
        }
        return true;
    });

    // Movement with fuel and nebulae
    let speed = ship.speed;
    nebulae.forEach(nebula => {
        if (distance3D(ship.position.x, ship.position.y, ship.position.z, nebula.mesh.position.x, nebula.mesh.position.y, nebula.mesh.position.z) < 50) {
            speed *= 0.5;
        }
    });
    if (ship.fuel <= 0) speed = 0;

    if (keys.ArrowLeft) ship.rotation.y += 0.05;
    if (keys.ArrowRight) ship.rotation.y -= 0.05;
    if (keys.ArrowUp) {
        ship.position.x += Math.sin(ship.rotation.y) * speed;
        ship.position.z += Math.cos(ship.rotation.y) * speed;
        if (ship.fuel > 0) ship.fuel -= 0.05;
    }
    if (keys.ArrowDown) {
        ship.position.x -= Math.sin(ship.rotation.y) * speed;
        ship.position.z -= Math.cos(ship.rotation.y) * speed;
        if (ship.fuel > 0) ship.fuel -= 0.05;
    }
    ship.fuel = Math.max(0, ship.fuel);

    // Camera follows ship
    camera.position.set(ship.position.x, 50, ship.position.z + 100);
    camera.lookAt(ship.position);

    // Asteroid movement and collision
    asteroids.forEach(asteroid => {
        asteroid.mesh.position.x += asteroid.dx;
        asteroid.mesh.position.z += asteroid.dz;
        if (asteroid.mesh.position.x < -150 || asteroid.mesh.position.x > 150) asteroid.dx = -asteroid.dx;
        if (asteroid.mesh.position.z < -150 || asteroid.mesh.position.z > 150) asteroid.dz = -asteroid.dz;
        if (distance3D(ship.position.x, ship.position.y, ship.position.z, asteroid.mesh.position.x, asteroid.mesh.position.y, asteroid.mesh.position.z) < 15) {
            console.log("Collision with asteroid");
        }
    });

    // Pirates movement and collision
    pirates.forEach(pirate => {
        const dx = ship.position.x - pirate.mesh.position.x;
        const dz = ship.position.z - pirate.mesh.position.z;
        const dist = Math.sqrt(dx * dx + dz * dz);
        if (dist > 0) {
            pirate.mesh.position.x += (dx / dist) * pirate.speed;
            pirate.mesh.position.z += (dz / dist) * pirate.speed;
        }
        if (distance3D(ship.position.x, ship.position.y, ship.position.z, pirate.mesh.position.x, pirate.mesh.position.y, pirate.mesh.position.z) < 15) {
            console.log("Pirate collision");
        }
    });

    // Package interaction
    if (keys.Space && !spacePressed) {
        spacePressed = true;
        const planet = planets.find((p, index) => 
            distance3D(ship.position.x, ship.position.y, ship.position.z, p.mesh.position.x, p.mesh.position.y, p.mesh.position.z) < 35 && 
            ((index === currentPickup && !carryingPackage) || (index === currentDelivery && carryingPackage))
        );
        if (planet) {
            if (!carryingPackage) {
                carryingPackage = true;
                deliveryTimer = 1800; // 30s
                pirateSpawnTimer = 1200; // 20s
                shipMaterial.color.setHex(0xffff00); // Yellow when carrying
            } else {
                carryingPackage = false;
                score += 100;
                shipMaterial.color.setHex(0xffffff); // White when empty
                setNewDelivery();
                pirates.forEach(p => scene.remove(p.mesh));
                pirates = [];
            }
        }
    } else if (!keys.Space) {
        spacePressed = false;
    }

    // Timer and pirate spawning
    if (carryingPackage) {
        deliveryTimer--;
        if (deliveryTimer <= 0) {
            carryingPackage = false;
            shipMaterial.color.setHex(0xffffff);
        }
        pirateSpawnTimer--;
        if (pirateSpawnTimer <= 0) {
            spawnPirate();
            pirateSpawnTimer = 600; // every 10s
        }
    }

    // Check for game over
    if (ship.fuel <= 0 && !carryingPackage) {
        gameState = "gameOver";
        document.getElementById("gameOverScreen").classList.remove("hidden");
        if (highscores.length < 5 || score > highscores[highscores.length - 1].score) {
            const initials = prompt("Enter your initials (3 letters):").slice(0, 3).toUpperCase();
            highscores.push({ initials, score });
            highscores.sort((a, b) => b.score - a.score);
            if (highscores.length > 5) highscores.pop();
            saveHighscores();
        }
        updateHighscoreDisplay();
    }

    // Update UI
    document.getElementById("fuelBar").style.width = `${(ship.fuel / ship.maxFuel) * 100}%`;
    if (carryingPackage) {
        document.getElementById("timeLeft").classList.remove("hidden");
        document.getElementById("timeLeft").textContent = `Time Left: ${Math.ceil(deliveryTimer / 60)}s`;
    } else {
        document.getElementById("timeLeft").classList.add("hidden");
    }
    document.getElementById("score").textContent = `Score: ${score}`;
}

function updateHighscoreDisplay() {
    const highscoreDiv = document.getElementById("highscores");
    highscoreDiv.innerHTML = "<p>Highscores:</p>";
    highscores.forEach((entry, index) => {
        highscoreDiv.innerHTML += `<p>${index + 1}. ${entry.initials} - ${entry.score}</p>`;
    });
}

function animate() {
    if (gameState === "playing") {
        update();
    }
    renderer.render(scene, camera);
    requestAnimationFrame(animate);
}

// Start or restart game on click
document.addEventListener("click", () => {
    if (gameState === "title") {
        gameState = "playing";
        document.getElementById("titleScreen").classList.add("hidden");
        setNewDelivery();
    } else if (gameState === "gameOver") {
        // Reset game variables
        ship.position.set(0, 0, 0);
        ship.fuel = 100;
        carryingPackage = false;
        score = 0;
        pirates.forEach(p => scene.remove(p.mesh));
        pirates = [];
        fuelCanisters.forEach(f => scene.remove(f.mesh));
        fuelCanisters = [];
        fuelSpawnTimer = 600;
        shipMaterial.color.setHex(0xffffff);
        setNewDelivery();
        gameState = "playing";
        document.getElementById("gameOverScreen").classList.add("hidden");
    }
});

animate();
