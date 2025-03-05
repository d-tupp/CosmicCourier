const WebSocket = require('ws');
const wss = new WebSocket.Server({ port: 8080 });

let players = {};

wss.on('connection', (ws) => {
    ws.id = Date.now().toString();
    console.log(`Player ${ws.id} connected`);

    ws.on('message', (message) => {
        const data = JSON.parse(message);
        if (data.type === 'update') {
            players[ws.id] = data;
            // Server-side culling: only send updates to nearby players
            wss.clients.forEach((client) => {
                if (client.readyState === WebSocket.OPEN && distance(ws.id, client.id) < 50) {
                    client.send(JSON.stringify({ type: 'update', id: ws.id, ...data }));
                }
            });
        }
    });

    ws.on('close', () => {
        delete players[ws.id];
        console.log(`Player ${ws.id} disconnected`);
        // Notify all clients of disconnection
        wss.clients.forEach((client) => {
            if (client.readyState === WebSocket.OPEN) {
                client.send(JSON.stringify({ type: 'update', id: ws.id, disconnected: true }));
            }
        });
    });
});

function distance(id1, id2) {
    if (id1 === id2) return 0; // Same player
    const p1 = players[id1]?.position, p2 = players[id2]?.position;
    if (!p1 || !p2) return Infinity;
    return Math.sqrt((p1.x - p2.x) ** 2 + (p1.z - p2.z) ** 2);
}

console.log('Server running on ws://localhost:8080');
