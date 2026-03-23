# Mobile

Expo React Native client for stocktakes, barcode/QR scanning, and report sharing from a phone.

## Responsibilities

- view inventory on a phone
- scan item QR codes
- record stock adjustments against the backend API
- download and share printable stock reports
- let the operator enter the backend server IP, port, and API key

## Local development without Docker

```powershell
npm install
npx expo start
```

## Docker workflow

The root Compose file runs the Expo dev server in a container so you can connect a physical phone over Wi-Fi.

### Start it

```powershell
docker compose up --build mobile
```

### Required root `.env` value

- `LAN_IP`: IPv4 address of the PC running Docker

Expo uses that value to advertise a bundle URL your phone can actually reach.

## Connecting your phone

1. Install Expo Go on the phone.
2. Start the `mobile` service.
3. View the logs:

```powershell
docker compose logs -f mobile
```

4. Scan the QR code or open the Expo URL from the logs.
5. In the app's `Server Settings` screen, set:
   - `Server IP`: the same `LAN_IP` value
   - `Server Port`: the backend host port from `.env` such as `3000` or `3005`
   - `API Key`: the same backend `API_KEY`

## Important limitation

This Docker setup runs the Expo development server. It does not produce a standalone Android or iOS app image inside the Compose stack.

That is still enough for local stocktakes with Expo Go on a phone.

## Ports used by the mobile container

- `8081`: Metro bundler
- `19000`: Expo app transport
- `19001`: Expo dev tools transport
- `19002`: Expo status/UI transport