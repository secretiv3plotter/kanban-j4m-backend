const { Pool } = require("pg");
const dotenv = require("dotenv");

dotenv.config();

const pool = new Pool({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT || 5432),
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    ssl: process.env.DB_SSL === "true" ? { rejectUnauthorized: false } : false
});

async function testConnection() {
    const client = await pool.connect();

    try {
        const result = await client.query("SELECT NOW() AS connected_at, current_database() AS database_name");
        return result.rows[0];
    } finally {
        client.release();
    }
}

async function connectDb() {
    return testConnection();
}

async function query(text, params) {
    return pool.query(text, params);
}

async function disconnectDb() {
    await pool.end();
}

module.exports = {
    pool,
    connectDb,
    disconnectDb,
    query,
    testConnection
};
