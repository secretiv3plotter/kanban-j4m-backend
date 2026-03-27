const { WebSocketServer } = require("ws");
const jwt = require("jsonwebtoken");

let wss = null;

function getTokenFromRequest(req) {
    const requestUrl = new URL(req.url, "http://localhost");
    return requestUrl.searchParams.get("token");
}

function initWebSocketServer(server) {
    if (wss) {
        return wss;
    }

    wss = new WebSocketServer({
        server,
        path: "/ws"
    });

    wss.on("connection", (socket, req) => {
        try {
            const token = getTokenFromRequest(req);

            if (!token) {
                socket.close(4001, "Authentication token is required.");
                return;
            }

            const payload = jwt.verify(token, process.env.JWT_SECRET);
            socket.userId = payload.userId;

            socket.send(
                JSON.stringify({
                    type: "socket.connected",
                    message: "WebSocket connection established."
                })
            );
        } catch (error) {
            socket.close(4001, "Invalid or expired token.");
        }
    });

    return wss;
}

function broadcastTasksUpdate(userId, tasks, metadata = {}) {
    if (!wss) {
        return;
    }

    const message = JSON.stringify({
        type: "tasks.updated",
        data: {
            tasks,
            ...metadata
        }
    });

    wss.clients.forEach(client => {
        if (client.readyState !== 1) {
            return;
        }

        if (client.userId !== userId) {
            return;
        }

        client.send(message);
    });
}

async function closeWebSocketServer() {
    if (!wss) {
        return;
    }

    const activeServer = wss;
    wss = null;

    await new Promise((resolve, reject) => {
        activeServer.close(error => {
            if (error) {
                reject(error);
                return;
            }

            resolve();
        });
    });
}

module.exports = {
    broadcastTasksUpdate,
    closeWebSocketServer,
    initWebSocketServer
};
