const { WebSocketServer } = require('ws');
const jwt = require('jsonwebtoken');
const url = require('url');

let wss = null;

// requestId → Set<ws>
const rooms = new Map();

function attach(server) {
  wss = new WebSocketServer({ server, path: '/ws' });

  wss.on('connection', (ws, req) => {
    // Аутентификация через query-параметр: /ws?token=<JWT>
    const { query } = url.parse(req.url, true);
    try {
      const payload = jwt.verify(query.token, process.env.JWT_SECRET);
      ws.userId = payload.id;
      ws.userRole = payload.role;
    } catch {
      ws.close(4001, 'Unauthorized');
      return;
    }

    ws.on('message', (raw) => {
      let msg;
      try { msg = JSON.parse(raw); } catch { return; }

      // { type: 'subscribe', requestId }
      if (msg.type === 'subscribe' && msg.requestId) {
        ws.requestId = msg.requestId;
        if (!rooms.has(msg.requestId)) rooms.set(msg.requestId, new Set());
        rooms.get(msg.requestId).add(ws);
      }
    });

    ws.on('close', () => {
      if (ws.requestId && rooms.has(ws.requestId)) {
        rooms.get(ws.requestId).delete(ws);
        if (rooms.get(ws.requestId).size === 0) rooms.delete(ws.requestId);
      }
    });
  });
}

// Отправляет обновлённую заявку всем подписчикам комнаты
function broadcast(requestId, payload) {
  const room = rooms.get(requestId);
  if (!room) return;
  const msg = JSON.stringify({ type: 'request_updated', data: payload });
  for (const ws of room) {
    if (ws.readyState === ws.OPEN) ws.send(msg);
  }
}

module.exports = { attach, broadcast };
