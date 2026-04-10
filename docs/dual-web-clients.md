# Dual Web Clients

TaskBandit now treats the web surface as two separate products:

- `admin-web`: configuration and operations
- `client-web`: day-to-day household usage in a normal browser, with optional installable PWA behavior

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

The split frontends use a runtime-generated `taskbandit-runtime-config.js` file so the Docker images can be reused without rebuilding.

Runtime values:

- `TASKBANDIT_API_BASE_URL`
- `TASKBANDIT_ADMIN_BASE_URL`
- `TASKBANDIT_CLIENT_BASE_URL`

For local Docker Compose, these usually map to:

- API: `http://localhost:8080`
- admin web: `http://localhost:4174`
- client web: `http://localhost:4173`

## Container Layout

Recommended deployment:

- `server` -> NestJS API/auth/realtime backend
- `admin-web` -> static admin frontend container
- `client-web` -> static client frontend container

The canonical Compose stack exposes:

- API on `TASKBANDIT_PORT` (default `8080`)
- admin web on `TASKBANDIT_ADMIN_PORT` (default `4174`)
- client web on `TASKBANDIT_CLIENT_PORT` (default `4173`)

## Server Settings

Recommended server settings for the split deployment:

- `TASKBANDIT_SERVE_EMBEDDED_WEB=false`
- `TASKBANDIT_CORS_ALLOWED_ORIGINS=http://localhost:4174,http://localhost:4173`

In this mode:

- the NestJS server serves API, docs, and health
- the admin UI is served by its own container
- the client UI/PWA is served by its own container

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

- `client-web` keeps its session in `localStorage`
- `admin-web` keeps its session in `sessionStorage`

Legacy token migration is still supported so older browser sessions can move forward into the new split layout.

## Reverse Proxy Rules

For split deployment:

- terminate TLS at the reverse proxy
- route API traffic to the `server` container
- route the admin origin/path to `admin-web`
- route the client origin/path to `client-web`
- allow the admin and client browser origins through `TASKBANDIT_CORS_ALLOWED_ORIGINS`

The API health endpoint remains rooted at `/health`.

## Coexistence

The split web deployment can coexist with the native Android app.

Current supported clients:

- `admin-web`
- `client-web`
- native Android app

The Android app continues to talk to the API directly and is not replaced by this split.
