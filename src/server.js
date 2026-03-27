const cors = require("cors");
const express = require("express");
const http = require("http");
const { connectDb, disconnectDb } = require("./system/config/db");
const { startTaskCleanupJob, stopTaskCleanupJob } = require("./system/jobs/taskCleanupJob");
const { closeWebSocketServer, initWebSocketServer } = require("./transport/websocket/socketServer");
const authRoutes = require("./transport/api/routes/authRoutes");
const tasksRoutes = require("./transport/api/routes/tasksRoutes");

const app = express();
const httpServer = http.createServer(app);
const PORT = process.env.PORT || 3000;
const allowedOrigins = (process.env.CORS_ORIGINS)
    .split(",")
    .map(origin => origin.trim())
    .filter(Boolean);
let server = null;
let isShuttingDown = false;

app.use(
    cors({
        origin(origin, callback) {
            if (!origin || allowedOrigins.includes(origin)) {
                callback(null, true);
                return;
            }

            callback(new Error("Origin not allowed by CORS."));
        },
        methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        allowedHeaders: ["Content-Type", "Authorization"]
    })
);
app.use(express.json());

app.use("/auth", authRoutes);
app.use("/tasks", tasksRoutes);

async function gracefulShutdown(reason, error) {
    if (isShuttingDown) {
        return;
    }

    isShuttingDown = true;

    console.error(`Shutting down: ${reason}`);

    if (error) {
        console.error(error.stack || error.message);
    }

    try {
        stopTaskCleanupJob();
    } catch (jobError) {
        console.error("Failed to stop cron jobs cleanly.");
        console.error(jobError.stack || jobError.message);
    }

    try {
        await closeWebSocketServer();
    } catch (socketError) {
        console.error("Failed to close the WebSocket server cleanly.");
        console.error(socketError.stack || socketError.message);
    }

    try {
        if (server) {
            await new Promise((resolve, reject) => {
                server.close(closeError => {
                    if (closeError) {
                        reject(closeError);
                        return;
                    }

                    resolve();
                });
            });
        }
    } catch (closeError) {
        console.error("Failed to close the HTTP server cleanly.");
        console.error(closeError.stack || closeError.message);
    }

    try {
        await disconnectDb();
    } catch (disconnectError) {
        console.error("Failed to disconnect from the database cleanly.");
        console.error(disconnectError.stack || disconnectError.message);
    } finally {
        process.exit(error ? 1 : 0);
    }
}

async function startServer() {
    try {
        const dbStatus = await connectDb();
        initWebSocketServer(httpServer);
        startTaskCleanupJob();

        server = httpServer.listen(PORT, () => {
            console.log(`Server is running on port ${PORT}`);
            console.log(`Connected to database: ${dbStatus.database_name}`);
            console.log(`WebSocket server is running on ws://localhost:${PORT}/ws`);
        });
    } catch (error) {
        await gracefulShutdown("database startup failure", error);
    }
}

process.on("SIGINT", () => {
    gracefulShutdown("SIGINT received");
});

process.on("SIGTERM", () => {
    gracefulShutdown("SIGTERM received");
});

process.on("uncaughtException", error => {
    gracefulShutdown("uncaught exception", error);
});

process.on("unhandledRejection", reason => {
    const error = reason instanceof Error ? reason : new Error(String(reason));
    gracefulShutdown("unhandled rejection", error);
});

startServer();
