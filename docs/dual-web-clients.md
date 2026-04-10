# Dual Web Clients

TaskBandit can now be deployed in two frontend modes:

- `combined`: the legacy all-in-one web workspace
- `split`: separate admin and client frontends, with the client frontend acting as the installable PWA

This document defines the deployment/runtime contract for the split model.

## Build Outputs

From `apps/web`:

- `npm run build` -> `dist/` (combined bundle with `index.html`, `admin.html`, and `client.html`)
- `npm run build:admin` -> `dist-admin/` (admin-only deployable)
- `npm run build:client` -> `dist-client/` (client-only deployable)

The split outputs are intended for serving on different ports or different origins.

Example local preview ports:

- admin preview: `4174`
- client preview: `4173`
- API server: `8080`

## Runtime Modes

### Embedded Combined Web

Use this when the TaskBandit server should continue serving the bundled web UI itself.

Relevant server settings:

- `TASKBANDIT_SERVE_EMBEDDED_WEB=true`
- `TASKBANDIT_REVERSE_PROXY_ENABLED=...`
- `TASKBANDIT_REVERSE_PROXY_PATH_BASE=...`

This keeps the current self-hosted behavior and is the most backward-compatible option.

### Split Admin And Client Frontends

Use this when the API server and the two web frontends are served separately.

Recommended server settings:

- `TASKBANDIT_SERVE_EMBEDDED_WEB=false`
- `TASKBANDIT_CORS_ALLOWED_ORIGINS=https://admin.example.com,https://client.example.com`

In this mode:

- the NestJS server only serves API, docs, and health endpoints
- the admin frontend is served by a separate static host/container
- the client frontend/PWA is served by a separate static host/container

The frontends should point at the API through `VITE_TASKBANDIT_API_BASE_URL`.

## Client PWA Notifications

The client PWA uses two different delivery paths:

- foreground live updates while the app is open
- background browser notifications through Web Push when the browser allows it

To enable background browser notifications, configure these server env vars:

- `TASKBANDIT_WEB_PUSH_PUBLIC_KEY`
- `TASKBANDIT_WEB_PUSH_PRIVATE_KEY`
- `TASKBANDIT_WEB_PUSH_SUBJECT`

If those values are not set:

- the client PWA still works as an installable app shell
- live sync while open still works
- background browser notifications remain unavailable

## Session Strategy

TaskBandit now uses variant-aware browser storage for web sessions:

- `combined` keeps the legacy durable token in `localStorage`
- `client` uses its own durable `localStorage` token so the PWA keeps working across restarts and install launches
- `admin` uses its own `sessionStorage` token so admin access is more tightly scoped to the current browser session

Migration behavior:

- if `client` or `admin` loads and no variant-specific token exists yet
- TaskBandit will fall back once to the legacy combined token and copy it into the new variant-specific storage key

This prevents existing browser users from being stranded during rollout.

## Reverse Proxy And Origin Rules

For split deployment:

- terminate TLS at the reverse proxy
- route API traffic to the TaskBandit server
- route admin static files to the admin frontend host/container
- route client static files to the client frontend host/container
- allow the frontend origins through `TASKBANDIT_CORS_ALLOWED_ORIGINS`

Keep `/health` on the API server root exactly as before.

## Coexistence Rules

During rollout, these clients can coexist against the same backend:

- old combined web UI
- new admin web UI
- new client PWA
- native Android app

The Android app is unaffected by the split web deployment, because it already talks to the API directly.

The recommended migration order is:

1. Deploy the newer server first.
2. Keep `TASKBANDIT_SERVE_EMBEDDED_WEB=true` initially.
3. Deploy the admin and client frontends separately.
4. Configure `TASKBANDIT_CORS_ALLOWED_ORIGINS` for those frontend origins.
5. Validate sign-in, live sync, and notifications in the client PWA.
6. Only then switch to `TASKBANDIT_SERVE_EMBEDDED_WEB=false` if you want a fully split deployment.

This keeps the legacy combined UI available as a fallback while the new frontends are being verified.
