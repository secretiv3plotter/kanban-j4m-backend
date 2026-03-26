const { query } = require("../config/db");

async function getActiveTasksByUserId(userId) {
    const sql = `
        SELECT
            id,
            title,
            due_date AS due,
            status,
            created_at,
            updated_at
        FROM tasks
        WHERE user_id = $1 AND deleted_at IS NULL
        ORDER BY created_at DESC
    `;

    const result = await query(sql, [userId]);
    return result.rows;
}

async function createTask({ userId, title, due, status }) {
    const sql = `
        INSERT INTO tasks (user_id, title, due_date, status)
        VALUES ($1, $2, $3, $4)
        RETURNING
            id,
            title,
            due_date AS due,
            status,
            created_at,
            updated_at
    `;

    const result = await query(sql, [userId, title, due, status]);
    return result.rows[0];
}

async function updateTask({ userId, id, title, due, status }) {
    const sql = `
        UPDATE tasks
        SET
            title = COALESCE($3, title),
            due_date = COALESCE($4, due_date),
            status = COALESCE($5, status)
        WHERE id = $1 AND user_id = $2 AND deleted_at IS NULL
        RETURNING
            id,
            title,
            due_date AS due,
            status,
            created_at,
            updated_at
    `;

    const result = await query(sql, [id, userId, title, due, status]);
    return result.rows[0] || null;
}

async function softDeleteTask({ userId, id }) {
    const sql = `
        UPDATE tasks
        SET deleted_at = NOW()
        WHERE id = $1 AND user_id = $2 AND deleted_at IS NULL
        RETURNING id
    `;

    const result = await query(sql, [id, userId]);
    return result.rows[0] || null;
}

async function purgeSoftDeletedTasksOlderThanDays(days) {
    const sql = `
        DELETE FROM tasks
        WHERE deleted_at IS NOT NULL
          AND deleted_at < NOW() - ($1 * INTERVAL '1 day')
    `;

    const result = await query(sql, [days]);
    return result.rowCount || 0;
}

module.exports = {
    createTask,
    getActiveTasksByUserId,
    purgeSoftDeletedTasksOlderThanDays,
    softDeleteTask,
    updateTask
};
