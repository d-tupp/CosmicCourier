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
            wss.clients.forEach((client) => {
                if (client.readyState === WebSocket.OPEN) {
                    client.send(JSON.stringify({ type: 'update', id: ws.id, ...data }));
                }
            });
        }
    });

    ws.on('close', () => {
        delete players[ws.id];
        console.log(`Player ${ws.id} disconnected`);
    });
});

console.log('Server running on ws://localhost:8080');
