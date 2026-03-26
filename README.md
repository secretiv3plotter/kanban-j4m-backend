# Kanban J4M Backend

This repository contains an Express + PostgreSQL backend for a Kanban app, plus a separate static frontend in `KanbanBoard-J4M/`.

## Tech Stack

- Node.js
- Express
- PostgreSQL
- WebSocket (`ws`)
- JWT authentication
- Google Sign-In token verification
- `node-cron` for soft-delete cleanup

## Prerequisites

- Node.js 18+ recommended
- npm
- PostgreSQL 14+ recommended

## Install Dependencies

```bash
npm install
```

## Environment Variables

Create a `.env` file in the project root and set these values:

```env
PORT=3000

DB_HOST=localhost
DB_PORT=5432
DB_NAME=kanban_j4m
DB_USER=postgres
DB_PASSWORD=your_database_password
DB_SSL=false

JWT_SECRET=replace_this_with_a_long_random_secret
GOOGLE_CLIENT_ID=your_google_oauth_client_id
CORS_ORIGINS=http://127.0.0.1:5500,http://localhost:5500
```

Notes:

- `CORS_ORIGINS` should include every frontend origin that will call the backend.
- Set `DB_SSL=true` only if your PostgreSQL server requires SSL.
- `GOOGLE_CLIENT_ID` is required only if you want Google login.

## Database Setup

1. Create a PostgreSQL database.
2. Run the schema file:

```bash
psql -U postgres -d kanban_j4m -f src/database/schema.sql
```

If your local PostgreSQL username or database name is different, replace the values in the command.

## Run the Backend

For development with auto-restart:

```bash
npm run dev
```

For a normal run:

```bash
node src/server.js
```

When the server starts successfully, it will:

- connect to PostgreSQL
- start the HTTP API on `http://localhost:<PORT>`
- start the WebSocket server on `ws://localhost:<PORT>/ws`
- schedule the cleanup cron job

## API Routes

Authentication:

- `POST /auth/register`
- `POST /auth/login`
- `POST /auth/google`
- `POST /auth/logout`
- `GET /auth/me`

Tasks:

- `GET /tasks`
- `POST /tasks`

The `/tasks` POST endpoint accepts these actions in the request body:

- `create`
- `update`
- `delete`

## Cron Job

The backend schedules a daily cron job at midnight to permanently remove tasks that were soft-deleted more than 30 days ago.

You should see logs similar to:

- `"[Cron] Soft-deleted task cleanup job scheduled for daily midnight runs."`
- `"[Cron] Soft-deleted task cleanup completed. Removed X task(s) older than 30 days."`

## Frontend Note

The `KanbanBoard-J4M/` folder is a separate static frontend. In its current state, it uses local storage and does not call this backend API.

You can open it directly in a browser, or serve it with a simple static server if you want a cleaner local workflow.

## Project Structure

```text
src/
  config/         Database connection
  controllers/    Express route handlers
  database/       SQL schema
  jobs/           Cron jobs
  middleware/     Auth and rate limiting
  models/         Database access
  realtime/       WebSocket server
  routes/         API routes
  server.js       App entrypoint

KanbanBoard-J4M/
  Static frontend
```
