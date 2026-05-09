# NERP Starter

Basic tech stack:

- Node.js runtime
- Express.js API server
- React frontend
- PostgreSQL database

## Project Structure

```text
frontend/    React + Vite frontend
backend/     Node.js + Express API
docker-compose.yml  Local PostgreSQL database
```

## Setup

1. Install dependencies:

```powershell
npm.cmd install
```

2. Create local env files:

```powershell
Copy-Item backend/.env.example backend/.env
Copy-Item frontend/.env.example frontend/.env
```

3. Start PostgreSQL:

```powershell
npm.cmd run db:up
```

4. Start the app:

```powershell
npm.cmd run dev
```

Frontend: http://localhost:5173

Backend health check: http://localhost:3000/api/health

Swagger API docs: http://localhost:3000/api-docs

OpenAPI YAML: http://localhost:3000/openapi.yaml

## Database

The server creates a `commands` table automatically on startup. The sample UI sends commands to the server and stores them in PostgreSQL.
