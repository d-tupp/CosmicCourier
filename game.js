const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

// Game states
let gameState = "title"; // "title", "playing", "gameOver"

// Background stars
const stars = [];
for (let i = 0; i < 100; i++) {
    stars.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height
    });
}

// Player's ship
const ship = {
    x: canvas.width / 2,
    y: canvas.height / 2,
    width: 20,
    height: 30,
    speed: 5,
    fuel: 100,
    maxFuel: 100
};

// Planets
const planets = [
    { x: 100, y: 100, radius: 30, color: "blue" },
    { x: 700, y: 500, radius: 30, color: "green" },
    { x: 200, y: 500, radius: 30, color: "orange" },
    { x: 600, y: 100, radius: 30, color: "purple" }
];

// Nebulae (slow zones)
const nebulae = [
    { x: 300, y: 200, radius: 50 },
    { x: 500, y: 400, radius: 70 }
];

// Asteroids (moving obstacles)
const asteroids = [
    { x: 200, y: 300, radius: 20, dx: 2, dy: 1 },
    { x: 600, y: 100, radius: 25, dx: -1.5, dy: 2 }
];

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

function distance(x1, y1, x2, y2) {
    return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
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
    const edge = Math.floor(Math.random() * 4);
    let x, y;
    if (edge === 0) { // top
        x = Math.random() * canvas.width;
        y = -20;
    } else if (edge === 1) { // right
        x = canvas.width + 20;
        y = Math.random() * canvas.height;
    } else if (edge === 2) { // bottom
        x = Math.random() * canvas.width;
        y = canvas.height + 20;
    } else { // left
        x = -20;
        y = Math.random() * canvas.height;
    }
    pirates.push({ x, y, speed: 2 });
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
        fuelCanisters.push({
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height,
            radius: 10
        });
        fuelSpawnTimer = 600;
    }

    // Check fuel canister collection
    fuelCanisters = fuelCanisters.filter(canister => {
        const dist = distance(ship.x, ship.y, canister.x, canister.y);
        if (dist < canister.radius + 10) {
            ship.fuel = Math.min(ship.maxFuel, ship.fuel + 20);
            return false;
        }
        return true;
    });

    // Movement with fuel and nebulae
    let speed = ship.speed;
    nebulae.forEach(nebula => {
        if (distance(ship.x, ship.y, nebula.x, nebula.y) < nebula.radius) {
            speed *= 0.5;
        }
    });
    if (ship.fuel <= 0) speed = 0;

    let isMoving = false;
    if (keys.ArrowLeft) {
        ship.x -= speed;
        isMoving = true;
    }
    if (keys.ArrowRight) {
        ship.x += speed;
        isMoving = true;
    }
    if (keys.ArrowUp) {
        ship.y -= speed;
        isMoving = true;
    }
    if (keys.ArrowDown) {
        ship.y += speed;
        isMoving = true;
    }
    if (isMoving && ship.fuel > 0) {
        ship.fuel -= 0.05;
        ship.fuel = Math.max(0, ship.fuel);
    }

    // Boundaries
    ship.x = Math.max(ship.width / 2, Math.min(canvas.width - ship.width / 2, ship.x));
    ship.y = Math.max(ship.height / 2, Math.min(canvas.height - ship.height / 2, ship.y));

    // Asteroid movement and collision
    asteroids.forEach(asteroid => {
        asteroid.x += asteroid.dx;
        asteroid.y += asteroid.dy;
        if (asteroid.x - asteroid.radius < 0 || asteroid.x + asteroid.radius > canvas.width) asteroid.dx = -asteroid.dx;
        if (asteroid.y - asteroid.radius < 0 || asteroid.y + asteroid.radius > canvas.height) asteroid.dy = -asteroid.dy;
        if (distance(ship.x, ship.y, asteroid.x, asteroid.y) < asteroid.radius + 10) {
            console.log("Collision with asteroid");
        }
    });

    // Pirates movement and collision
    pirates.forEach(pirate => {
        const dx = ship.x - pirate.x;
        const dy = ship.y - pirate.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist > 0) {
            pirate.x += (dx / dist) * pirate.speed;
            pirate.y += (dy / dist) * pirate.speed;
        }
        if (distance(ship.x, ship.y, pirate.x, pirate.y) < 20) {
            console.log("Pirate collision");
        }
    });

    // Package interaction
    if (keys.Space && !spacePressed) {
        spacePressed = true;
        const planet = planets.find((p, index) => 
            distance(ship.x, ship.y, p.x, p.y) < p.radius + 20 && 
            ((index === currentPickup && !carryingPackage) || (index === currentDelivery && carryingPackage))
        );
        if (planet) {
            if (!carryingPackage) {
                carryingPackage = true;
                deliveryTimer = 1800; // 30s at 60fps
                pirateSpawnTimer = 1200; // 20s
                console.log("Picked up package from planet " + currentPickup);
            } else {
                carryingPackage = false;
                score += 100;
                console.log("Delivered package to planet " + currentDelivery);
                setNewDelivery();
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
            console.log("Time's up! Package reset.");
        }
        pirateSpawnTimer--;
        if (pirateSpawnTimer <= 0) {
            spawnPirate();
            pirateSpawnTimer = 600; // every 10s
        }
    }

    // Check for game over (out of fuel and not carrying package)
    if (ship.fuel <= 0 && !carryingPackage) {
        gameState = "gameOver";
        // Save score if it's a highscore
        if (highscores.length < 5 || score > highscores[highscores.length - 1].score) {
            const initials = prompt("Enter your initials (3 letters):").slice(0, 3).toUpperCase();
            highscores.push({ initials, score });
            highscores.sort((a, b) => b.score - a.score);
            if (highscores.length > 5) highscores.pop();
            saveHighscores();
        }
    }
}

function drawBackground() {
    ctx.fillStyle = "black";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "white";
    stars.forEach(star => ctx.fillRect(star.x, star.y, 1, 1));
}

function drawNebulae() {
    nebulae.forEach(nebula => {
        ctx.beginPath();
        ctx.arc(nebula.x, nebula.y, nebula.radius, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(128, 0, 128, 0.3)";
        ctx.fill();
    });
}

function drawAsteroids() {
    asteroids.forEach(asteroid => {
        ctx.beginPath();
        ctx.arc(asteroid.x, asteroid.y, asteroid.radius, 0, Math.PI * 2);
        ctx.fillStyle = "gray";
        ctx.fill();
    });
}

function drawFuelCanisters() {
    fuelCanisters.forEach(canister => {
        ctx.beginPath();
        ctx.arc(canister.x, canister.y, canister.radius, 0, Math.PI * 2);
        ctx.fillStyle = "yellow";
        ctx.fill();
    });
}

function drawPirates() {
    pirates.forEach(pirate => {
        ctx.save();
        ctx.translate(pirate.x, pirate.y);
        ctx.beginPath();
        ctx.moveTo(0, -10);
        ctx.lineTo(5, 5);
        ctx.lineTo(-5, 5);
        ctx.closePath();
        ctx.fillStyle = "red";
        ctx.fill();
        ctx.restore();
    });
}

function drawPlanets() {
    planets.forEach((planet, index) => {
        ctx.beginPath();
        ctx.arc(planet.x, planet.y, planet.radius, 0, Math.PI * 2);
        ctx.fillStyle = planet.color;
        ctx.fill();
        if (index === currentPickup && !carryingPackage) {
            ctx.fillStyle = "white";
            ctx.font = "16px Arial";
            ctx.fillText("Pickup", planet.x - 20, planet.y - planet.radius - 10);
        } else if (index === currentDelivery && carryingPackage) {
            ctx.fillText("Deliver", planet.x - 20, planet.y - planet.radius - 10);
        }
    });
}

function drawShip() {
    ctx.save();
    ctx.translate(ship.x, ship.y);
    ctx.beginPath();
    ctx.moveTo(0, -ship.height / 2);
    ctx.lineTo(ship.width / 2, ship.height / 2);
    ctx.lineTo(-ship.width / 2, ship.height / 2);
    ctx.closePath();
    ctx.fillStyle = carryingPackage ? "yellow" : "white";
    ctx.fill();
    ctx.restore();
}

function drawFuelBar() {
    const barWidth = 200;
    const barHeight = 20;
    const x = 10;
    const y = 30; // Positioned to avoid cropping
    ctx.fillStyle = "gray";
    ctx.fillRect(x, y, barWidth, barHeight);
    const fuelFraction = ship.fuel / ship.maxFuel;
    ctx.fillStyle = "green";
    ctx.fillRect(x, y, barWidth * fuelFraction, barHeight);
    ctx.fillStyle = "white";
    ctx.font = "16px Arial";
    ctx.fillText("Fuel", x, y - 5);
}

function drawTitleScreen() {
    ctx.fillStyle = "white";
    ctx.font = "48px Arial";
    ctx.fillText("Cosmic Courier", 250, 200);
    ctx.font = "24px Arial";
    ctx.fillText("Click to Start", 320, 300);
    ctx.font = "18px Arial";
    ctx.fillText("Use arrow keys to move.", 280, 400);
    ctx.fillText("Press spacebar to pick up or deliver packages.", 200, 430);
    ctx.fillText("Avoid obstacles and manage fuel!", 250, 460);
}

function drawGameOverScreen() {
    ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "white";
    ctx.font = "48px Arial";
    ctx.fillText("Game Over", 300, 200);
    ctx.font = "24px Arial";
    ctx.fillText("Click to Restart", 320, 250);
    ctx.font = "18px Arial";
    ctx.fillText("Highscores:", 350, 350);
    highscores.forEach((entry, index) => {
        ctx.fillText(`${index + 1}. ${entry.initials} - ${entry.score}`, 350, 380 + index * 30);
    });
}

function draw() {
    drawBackground();
    if (gameState === "title") {
        drawTitleScreen();
    } else if (gameState === "playing") {
        drawNebulae();
        drawAsteroids();
        drawFuelCanisters();
        drawPirates();
        drawPlanets();
        drawShip();
        drawFuelBar();
        if (carryingPackage) {
            const timeLeft = Math.ceil(deliveryTimer / 60);
            ctx.fillStyle = "white";
            ctx.font = "20px Arial";
            ctx.fillText(`Time Left: ${timeLeft}s`, 10, 60); // Moved to y = 60
        }
        ctx.fillText(`Score: ${score}`, 10, 90); // Moved to y = 90
    } else if (gameState === "gameOver") {
        drawGameOverScreen();
    }
}

function gameLoop() {
    if (gameState === "playing") {
        update();
    }
    draw();
    requestAnimationFrame(gameLoop);
}

// Start or restart game on click
canvas.addEventListener("click", () => {
    if (gameState === "title") {
        gameState = "playing";
        setNewDelivery();
    } else if (gameState === "gameOver") {
        // Reset game variables
        ship.x = canvas.width / 2;
        ship.y = canvas.height / 2;
        ship.fuel = 100;
        carryingPackage = false;
        score = 0;
        pirates = [];
        fuelCanisters = [];
        fuelSpawnTimer = 600;
        setNewDelivery();
        gameState = "playing";
    }
});

gameLoop();
