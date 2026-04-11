# Dual Web Clients

TaskBandit now treats the web surface as two separate products served from one web container:

- `/admin`: configuration and operations
- `/`: day-to-day household usage in a normal browser, with optional installable PWA behavior

The API server is deployed separately and should not be the primary web host.

## Product Boundary

### Admin Web UI

Use the admin UI for:

- household settings
- member management
- template and translation management
- authentication and SMTP configuration
- system status, backup readiness, and recovery operations

### Client Web UI

Use the client UI for:

- chores, approvals, and takeover flow
- scheduling chores for non-child users
- notifications inbox
- end-user notification/device settings
- browser-based daily use on desktop, tablet, or mobile

The client UI is browser-first. It must work as a normal website even when the user never installs it as a PWA.

## Build Outputs

From `apps/web`:

- `npm run build:admin` -> `dist-admin/`
- `npm run build:client` -> `dist-client/`
- `npm run build` -> both split outputs

There is no supported combined production web bundle anymore.

## Runtime Config

The split frontends use a runtime-generated `taskbandit-runtime-config.js` file so the Docker image can be reused without rebuilding.

Runtime values:

- `TASKBANDIT_API_BASE_URL`
- `TASKBANDIT_ADMIN_BASE_URL`
- `TASKBANDIT_CLIENT_BASE_URL`

For local Docker Compose, these usually map to:

- API: `http://localhost:8080`
- admin web: `http://localhost:4173/admin`
- client web: `http://localhost:4173`

## Container Layout

Recommended deployment:

- `server` -> NestJS API/auth/realtime backend
- `web` -> static web container serving the client UI/PWA at `/` and the admin UI at `/admin`

The canonical Compose stack exposes:

- API on `TASKBANDIT_PORT` (default `8080`)
- web UI on `TASKBANDIT_WEB_PORT` (default `4173`)

## Server Settings

Recommended server settings for the split deployment:

- `TASKBANDIT_SERVE_EMBEDDED_WEB=false`
- `TASKBANDIT_CORS_ALLOWED_ORIGINS=http://localhost:4173`

In this mode:

- the NestJS server serves API, docs, and health
- the shared web container serves the client UI/PWA at `/`
- the shared web container serves the admin UI at `/admin`

## Client Notifications

The client web UI uses two delivery paths:

- foreground live updates while the client is open
- background browser notifications through Web Push when VAPID keys are configured

Server env vars for browser push:

- `TASKBANDIT_WEB_PUSH_PUBLIC_KEY`
- `TASKBANDIT_WEB_PUSH_PRIVATE_KEY`
- `TASKBANDIT_WEB_PUSH_SUBJECT`

If those values are blank:

- the client still works in a normal browser
- the client still gets live updates while open
- browser background notifications remain unavailable

## Session Model

The split web apps use separate browser storage keys:

- the client UI keeps its session in `localStorage`
- the admin UI keeps its session in `sessionStorage`

Legacy token migration is still supported so older browser sessions can move forward into the new split layout.

## Reverse Proxy Rules

For split deployment:

- terminate TLS at the reverse proxy
- route API traffic to the `server` container
- route web traffic to the `web` container
- keep `/admin` on the web container for the admin UI
- allow the web browser origin through `TASKBANDIT_CORS_ALLOWED_ORIGINS`

The API health endpoint remains rooted at `/health`.

## Coexistence

The split web deployment can coexist with the native Android app.

Current supported clients:

- admin web UI at `/admin`
- client web UI/PWA at `/`
- native Android app

The Android app continues to talk to the API directly and is not replaced by this split.
