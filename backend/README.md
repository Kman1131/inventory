# Backend

Express API for the inventory system. It stores data in SQLite, secures most routes with an API key, and generates printable stock reports.

## Responsibilities

- inventory CRUD for items, categories, and locations
- stock movements and adjustment history
- PDF stock report generation
- SQLite persistence with `better-sqlite3`

## Environment variables

- `PORT`: API listen port. Default: `3000`
- `API_KEY`: required in the `x-api-key` header for protected routes
- `DB_PATH`: SQLite database file path. Default: `inventory.db` in the repo root

When running through the root Compose file, the container still listens on `3000` internally, but the host port can be remapped with `BACKEND_HOST_PORT` in the root `.env` file.

## Local development

```powershell
npm install
npm run dev
```

## Production build

```powershell
npm run build
npm run start
```

## Docker

This project is built by the root `docker-compose.yml` file.

### Build and run only the backend

```powershell
docker compose up --build backend
```

### Container behavior

- container port: `3000`
- mounted database path: `/data/inventory.db`
- persisted data volume: `inventory-data`

## Key endpoints

- `GET /health`: health check, no API key required
- `GET /items`
- `GET /categories`
- `GET /locations`
- `POST /transactions`
- `GET /reports/stock?apikey=...`

## Authentication

All routes except `/health` require the API key.

Supported transport:

- `x-api-key` request header
- `apikey` query parameter for direct file downloads such as the PDF report

## Data notes

- SQLite uses WAL mode
- foreign keys are enabled
- the schema is created automatically at startup