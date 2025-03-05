const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

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
    speed: 5
};

// Planets
const planets = [
    { x: 100, y: 100, radius: 30, color: "blue", type: "pickup" },
    { x: 700, y: 500, radius: 30, color: "green", type: "delivery" }
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

function update() {
    let speed = ship.speed;
    nebulae.forEach(nebula => {
        const dist = distance(ship.x, ship.y, nebula.x, nebula.y);
        if (dist < nebula.radius) {
            speed *= 0.5; // Slow down in nebula
        }
    });

    if (keys.ArrowLeft) ship.x -= speed;
    if (keys.ArrowRight) ship.x += speed;
    if (keys.ArrowUp) ship.y -= speed;
    if (keys.ArrowDown) ship.y += speed;

    // Boundaries
    if (ship.x < ship.width / 2) ship.x = ship.width / 2;
    if (ship.x > canvas.width - ship.width / 2) ship.x = canvas.width - ship.width / 2;
    if (ship.y < ship.height / 2) ship.y = ship.height / 2;
    if (ship.y > canvas.height - ship.height / 2) ship.y = canvas.height - ship.height / 2;

    // Asteroid movement and collision
    asteroids.forEach(asteroid => {
        asteroid.x += asteroid.dx;
        asteroid.y += asteroid.dy;

        if (asteroid.x - asteroid.radius < 0 || asteroid.x + asteroid.radius > canvas.width) {
            asteroid.dx = -asteroid.dx;
        }
        if (asteroid.y - asteroid.radius < 0 || asteroid.y + asteroid.radius > canvas.height) {
            asteroid.dy = -asteroid.dy;
        }

        const dist = distance(ship.x, ship.y, asteroid.x, asteroid.y);
        if (dist < asteroid.radius + 10) { // Assuming ship radius ~10
            console.log("Collision with asteroid");
            // Future: Add damage or reset logic
        }
    });

    // Package interaction
    if (keys.Space && !spacePressed) {
        spacePressed = true;
        planets.forEach(planet => {
            const dist = distance(ship.x, ship.y, planet.x, planet.y);
            if (dist < planet.radius + 20) {
                if (planet.type === "pickup" && !carryingPackage) {
                    carryingPackage = true;
                    console.log("Picked up package");
                } else if (planet.type === "delivery" && carryingPackage) {
                    carryingPackage = false;
                    console.log("Delivered package");
                    // Future: Add score or progress
                }
            }
        });
    } else if (!keys.Space) {
        spacePressed = false;
    }
}

function drawBackground() {
    ctx.fillStyle = "black";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "white";
    stars.forEach(star => {
        ctx.fillRect(star.x, star.y, 1, 1);
    });
}

function drawNebulae() {
    nebulae.forEach(nebula => {
        ctx.beginPath();
        ctx.arc(nebula.x, nebula.y, nebula.radius, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(128, 0, 128, 0.3)"; // Purple nebula
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

function drawPlanets() {
    planets.forEach(planet => {
        ctx.beginPath();
        ctx.arc(planet.x, planet.y, planet.radius, 0, Math.PI * 2);
        ctx.fillStyle = planet.color;
        ctx.fill();
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

function draw() {
    drawBackground();
    drawNebulae();
    drawAsteroids();
    drawPlanets();
    drawShip();
}

function gameLoop() {
    update();
    draw();
    requestAnimationFrame(gameLoop);
}

gameLoop();
