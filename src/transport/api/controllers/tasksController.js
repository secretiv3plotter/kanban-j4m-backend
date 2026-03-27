const {
    createTask: createTaskRecord,
    getActiveTasksByUserId,
    softDeleteTask,
    updateTask: updateTaskRecord
} = require("../../../data/models/tasksModel");
const { broadcastTasksUpdate } = require("../../websocket/socketServer");

const VALID_STATUSES = new Set(["todo", "doing", "done"]);

function normalizeDue(value) {
    if (value === undefined) {
        return undefined;
    }

    if (value === null || value === "") {
        return null;
    }

    return value;
}

async function getTasks(req, res) {
    try {
        const tasks = await getActiveTasksByUserId(req.user.userId);
        return res.status(200).json(tasks);
    } catch (error) {
        return res.status(500).json({ message: "Failed to fetch tasks." });
    }
}

async function sendTasksBroadcast(userId, action, task = null) {
    const tasks = await getActiveTasksByUserId(userId);
    broadcastTasksUpdate(userId, tasks, {
        action,
        task
    });
}

async function postTask(req, res) {
    try {
        const { action, id, title, due, status } = req.body;

        if (!action) {
            return res.status(400).json({ message: "Action is required." });
        }

        if (action === "create") {
            const trimmedTitle = String(title || "").trim();
            const normalizedStatus = status || "todo";

            if (!trimmedTitle) {
                return res.status(400).json({ message: "Task title is required." });
            }

            if (!VALID_STATUSES.has(normalizedStatus)) {
                return res.status(400).json({ message: "Invalid task status." });
            }

            const task = await createTaskRecord({
                userId: req.user.userId,
                title: trimmedTitle,
                due: normalizeDue(due) ?? null,
                status: normalizedStatus
            });

            await sendTasksBroadcast(req.user.userId, "create", task);

            return res.status(201).json({
                message: "Task created successfully.",
                task
            });
        }

        if (action === "update") {
            if (!id) {
                return res.status(400).json({ message: "Task id is required for update." });
            }

            const updates = {};

            if (title !== undefined) {
                const trimmedTitle = String(title).trim();

                if (!trimmedTitle) {
                    return res.status(400).json({ message: "Task title cannot be empty." });
                }

                updates.title = trimmedTitle;
            }

            if (due !== undefined) {
                updates.due = normalizeDue(due);
            }

            if (status !== undefined) {
                if (!VALID_STATUSES.has(status)) {
                    return res.status(400).json({ message: "Invalid task status." });
                }

                updates.status = status;
            }

            const task = await updateTaskRecord({
                userId: req.user.userId,
                id,
                title: updates.title,
                due: updates.due,
                status: updates.status
            });

            if (!task) {
                return res.status(404).json({ message: "Task not found." });
            }

            await sendTasksBroadcast(req.user.userId, "update", task);

            return res.status(200).json({
                message: "Task updated successfully.",
                task
            });
        }

        if (action === "delete") {
            if (!id) {
                return res.status(400).json({ message: "Task id is required for delete." });
            }

            const task = await softDeleteTask({
                userId: req.user.userId,
                id
            });

            if (!task) {
                return res.status(404).json({ message: "Task not found." });
            }

            await sendTasksBroadcast(req.user.userId, "delete", { id });

            return res.status(200).json({
                message: "Task deleted successfully."
            });
        }

        return res.status(400).json({
            message: "Invalid action. Use create, update, or delete."
        });
    } catch (error) {
        return res.status(500).json({ message: "Failed to process task request." });
    }
}

module.exports = {
    getTasks,
    postTask
};
