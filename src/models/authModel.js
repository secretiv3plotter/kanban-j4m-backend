const { query } = require("../config/db");

async function findUserByEmail(email) {
    const sql = `
        SELECT id, email, username, google_id, password_hash, role, created_at, updated_at
        FROM users
        WHERE email = $1
        LIMIT 1
    `;

    const result = await query(sql, [email]);
    return result.rows[0] || null;
}

async function findUserByUsername(username) {
    const sql = `
        SELECT id, email, username, google_id, password_hash, role, created_at, updated_at
        FROM users
        WHERE username = $1
        LIMIT 1
    `;

    const result = await query(sql, [username]);
    return result.rows[0] || null;
}

async function findUserByEmailOrUsername(identifier) {
    const sql = `
        SELECT id, email, username, google_id, password_hash, role, created_at, updated_at
        FROM users
        WHERE email = $1 OR username = $1
        LIMIT 1
    `;

    const result = await query(sql, [identifier]);
    return result.rows[0] || null;
}

async function findUserByGoogleId(googleId) {
    const sql = `
        SELECT id, email, username, google_id, password_hash, role, created_at, updated_at
        FROM users
        WHERE google_id = $1
        LIMIT 1
    `;

    const result = await query(sql, [googleId]);
    return result.rows[0] || null;
}

async function createUser({ email, username, passwordHash = null, googleId = null }) {
    const sql = `
        INSERT INTO users (email, username, password_hash, google_id)
        VALUES ($1, $2, $3, $4)
        RETURNING id, email, username, google_id, role, created_at, updated_at
    `;

    const result = await query(sql, [email, username, passwordHash, googleId]);
    return result.rows[0];
}

async function linkGoogleAccount({ userId, googleId }) {
    const sql = `
        UPDATE users
        SET google_id = $2
        WHERE id = $1
        RETURNING id, email, username, google_id, password_hash, role, created_at, updated_at
    `;

    const result = await query(sql, [userId, googleId]);
    return result.rows[0] || null;
}

module.exports = {
    createUser,
    findUserByEmail,
    findUserByEmailOrUsername,
    findUserByGoogleId,
    findUserByUsername,
    linkGoogleAccount
};
