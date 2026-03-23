# Inventory Monorepo

This workspace contains a local inventory system with three apps:

- `backend`: Express API with a SQLite database
- `web`: Vite/React browser dashboard for desktop and mobile browsers
- `mobile`: Expo React Native app for stocktakes on a phone

The repository is now set up to run locally with Docker Compose so you can:

- keep the API and web dashboard running in containers
- persist inventory data in a Docker volume
- run the Expo dev server in Docker and connect your phone over Wi-Fi

## Project structure

- `backend/`: API, auth, reports, and SQLite access
- `web/`: dashboard UI served by Nginx in Docker
- `mobile/`: Expo app for scanning and stocktaking
- `docker-compose.yml`: local orchestration for all services
- `.env.example`: values you should copy to `.env` before starting

## Prerequisites

- Docker Desktop with Compose enabled
- Your phone and PC on the same local network
- Expo Go on your phone if you want to run the mobile app from Docker

## Quick start

1. Copy `.env.example` to `.env` at the repository root.
2. Set `LAN_IP` to the IPv4 address of the PC running Docker.
3. If `3000` or `8080` is already in use on your machine, change `BACKEND_HOST_PORT` and `WEB_HOST_PORT`.
4. Optionally change `API_KEY` from the default and use the same value in the web/mobile clients.
5. Start the stack:

```powershell
docker compose up --build -d backend web
docker compose up --build mobile
```

6. Open the web app at `http://localhost:<WEB_HOST_PORT>` on your PC.
7. Open the same site on your phone at `http://<LAN_IP>:<WEB_HOST_PORT>` if you want browser access.
8. In the mobile app, use `Server Settings` and enter:
   - Server IP: your `LAN_IP`
   - Server port: your `BACKEND_HOST_PORT`
   - API key: the `API_KEY` value from `.env`

## Docker services

### `backend`

- URL: `http://localhost:<BACKEND_HOST_PORT>`
- Health check endpoint: `http://localhost:<BACKEND_HOST_PORT>/health`
- Data path inside the container: `/data/inventory.db`
- Data persistence: Docker volume `inventory-data`

### `web`

- URL: `http://localhost:<WEB_HOST_PORT>`
- Serves the React build with Nginx
- Proxies `/api/*` to the backend container automatically
- Works from any device on your LAN without changing the default web settings

### `mobile`

- Runs `expo start` inside Docker
- Exposes Expo/Metro ports `8081`, `19000`, `19001`, and `19002`
- Requires `LAN_IP` so Expo can advertise a bundle URL your phone can reach

## Phone workflow

For physical stocktaking on a phone:

1. Start the backend and mobile services.
2. View the mobile container logs:

```powershell
docker compose logs -f mobile
```

3. Use the Expo QR code or the printed Expo URL in the logs.
4. Open the app in Expo Go.
5. In the app settings, point the API to your PC's LAN IP, backend host port, and API key.

## Common commands

```powershell
docker compose up --build
docker compose down
docker compose down -v
docker compose logs -f backend
docker compose logs -f web
docker compose logs -f mobile
```

## Notes

- The web app defaults to `/api`, which is correct for the Docker deployment.
- The mobile app still needs your LAN IP because the phone talks directly to the API.
- If Windows Defender Firewall blocks incoming traffic, allow Docker Desktop or open the configured backend and web host ports plus `8081`, `19000`, `19001`, and `19002` on your private network.

## Project readmes

- [backend/README.md](backend/README.md)
- [web/README.md](web/README.md)
- [mobile/README.md](mobile/README.md)