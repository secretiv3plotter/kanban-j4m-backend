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

## Database Setup

1. Create a PostgreSQL database.
2. Run the schema file:

```bash
psql -U postgres -d kanban_j4m -f src/data/database/schema.sql
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

## Project Structure

```text
src/
  transport/
    api/
      controllers/  Express route handlers
      middleware/   Auth and rate limiting
      routes/       API routes
    websocket/      WebSocket server
  data/
    database/       SQL schema
    models/         Database access
  system/
    config/         Database connection
    jobs/           Cron jobs
  server.js         App entrypoint
```
