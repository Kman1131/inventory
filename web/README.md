# Web

React and Vite dashboard for inventory administration.

## Responsibilities

- dashboard summary and low-stock visibility
- CRUD screens for items, categories, and locations
- transaction entry and stock adjustments
- report download links
- configurable API endpoint and API key in browser storage

## Local development

```powershell
npm install
npm run dev
```

The Vite dev server now proxies `/api` to `http://localhost:3000` by default, so you can run the backend locally without changing the browser settings page.

## Production build

```powershell
npm run build
npm run preview
```

## Docker

The Docker image is a two-stage build:

1. Node builds the static app
2. Nginx serves the build and proxies `/api/*` to the backend container

### Run through Compose

```powershell
docker compose up --build web backend
```

Then open `http://localhost:<WEB_HOST_PORT>`.

## API configuration

The web app resolves the API URL in this order:

1. `localStorage.inv_api_url`
2. `VITE_API_URL`
3. `/api`

Defaulting to `/api` is what makes the Docker deployment work cleanly from any browser on your LAN.

## Browser settings

- `Server URL`: leave as `/api` for the bundled Docker deployment
- `API Key`: must match the backend `API_KEY`