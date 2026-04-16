<p align="center">
  <img src="docs/assets/taskbandit-logo.svg" alt="TaskBandit logo" width="520" />
</p>

<p align="center">
  Self-hosted chores, approvals, streaks, and proof photos for playful households.
</p>

TaskBandit is a self-hosted, heavily gamified household chore manager with:

- a server component that exposes the API, auth, realtime sync, and notification delivery
- an admin-facing web UI for templates, household configuration, translation, and system operations
- a client-facing web UI that works in a normal desktop/mobile browser and can also be installed as a PWA
- a native Android application for daily use, offline actions, photo proof, and widgets
- chore templates built around group, type, and optional sub-type layers so chores stay clear in both admin setup and client views

## Documentation

The public documentation site is the main source for setup, deployment, reverse proxy, configuration, client, and release guidance:

[TaskBandit documentation](https://kriziw.github.io/taskbandit/)

Repository-local docs are kept for source-adjacent references that are useful while developing or reviewing implementation details.
The current release verification baseline is documented in [docs/release-verification.md](docs/release-verification.md).

## Quick Start

Fastest self-hosted setup:

```bash
mkdir -p taskbandit
cd taskbandit
wget -O docker-compose.yml https://raw.githubusercontent.com/kriziw/TaskBandit/main/docker-compose.yml
wget -O .env https://raw.githubusercontent.com/kriziw/TaskBandit/main/.env.example
mkdir -p data/postgres data/taskbandit
docker compose up -d
```

Before first real use, edit `.env`:

- change `TASKBANDIT_DB_PASSWORD` and `TASKBANDIT_JWT_SECRET`
- keep `TASKBANDIT_DATA_ROOT=./data` unless you intentionally want another persistent storage path
- set `TASKBANDIT_BOOTSTRAP_SEED_DEMO_DATA=true` only if you want demo accounts for testing
- for most installs, only set `TASKBANDIT_PUBLIC_WEB_BASE_URL` and `TASKBANDIT_PUBLIC_API_BASE_URL`; TaskBandit derives the admin URL automatically and also derives CORS/reverse-proxy behavior from those public URLs
- leave the default log safety limits in place unless you have a reason to change them: the persistent runtime log rotates at `100 MB` with a `500 MB` total cap, and Docker container logs rotate at `100 MB` with `5` retained files per container
- only use the advanced overrides (`TASKBANDIT_CORS_ALLOWED_ORIGINS`, `TASKBANDIT_REVERSE_PROXY_ENABLED`) if you intentionally need custom browser-origin or proxy behavior

Example domain setup:

```env
TASKBANDIT_PUBLIC_WEB_BASE_URL=https://taskbandit.example.com
TASKBANDIT_PUBLIC_API_BASE_URL=https://api.taskbandit.example.com
```

If you use Nginx Proxy Manager, the quick rule is:

- `taskbandit.example.com` -> `taskbandit-web:4173`
- `api.taskbandit.example.com` -> `taskbandit-server:8080`
- keep `/admin` on the web host; do not create a separate upstream for it

Then open:

- client UI/PWA: `http://localhost:4173/`
- admin UI: `http://localhost:4173/admin`
- API health check: `http://localhost:8080/health`

On a fresh install, the first household setup can optionally import the built-in starter templates. These are translated into English, German, and Hungarian and include linked follow-up tasks for common routines such as laundry, cleaning, kitchen, waste, bedroom, and plant care.

If demo seeding is enabled, the sample accounts use the password `TaskBandit123!`:

- `alex@taskbandit.local`
- `maya@taskbandit.local`
- `luca@taskbandit.local`

For a real install, copy `.env.example` to `.env`, change the secrets and public URLs, and follow the [configuration guide](https://kriziw.github.io/taskbandit/configuration.html).

## Logging Safety Defaults

TaskBandit now protects disk usage in two layers by default:

- the application runtime log under `data/taskbandit/storage/logs` rotates at `100 MB` and keeps up to `500 MB` total across the active log plus rotated archives
- Docker `json-file` logs for the `postgres`, `server`, and `web` containers rotate at `100 MB` and keep `5` files per container

The related `.env` settings are:

```env
TASKBANDIT_RUNTIME_LOG_MAX_FILE_SIZE_MB=100
TASKBANDIT_RUNTIME_LOG_MAX_TOTAL_SIZE_MB=500
TASKBANDIT_DOCKER_LOG_MAX_SIZE=100m
TASKBANDIT_DOCKER_LOG_MAX_FILES=5
```

The admin system status view also shows the effective runtime and Docker log limits as read-only values, so operators can confirm what the running stack picked up from `.env`.

If you change these values later, recreate the containers so Docker picks up the updated container log policy.

## Repository Layout

- `apps/server` - NestJS + Prisma backend API
- `apps/web` - React + TypeScript web UI
- `apps/android` - Android app built with Kotlin and Jetpack Compose
- `docker-compose.yml` - canonical self-hosted stack entrypoint for repo checkouts and quick-start downloads
- `infra/docker` - mirrored Compose location kept for direct download compatibility
- `docs` - source-adjacent architecture and implementation references

## Deployment Shape

The current Docker deployment uses two runtime containers:

- `taskbandit-server` / `kriziw/taskbandit` for the API server
- `taskbandit-web` / `kriziw/taskbandit-web` for the client UI/PWA at `/` and the admin UI at `/admin`

See the [deployment guide](https://kriziw.github.io/taskbandit/deployment.html) and [reverse proxy guide](https://kriziw.github.io/taskbandit/reverse-proxy.html) for production setup.

## Local Development

Local server and web development require Node.js. Android verification requires a full Android toolchain with JDK 17+, Android SDK, and Gradle or Android Studio.

Useful entrypoints:

- server: `apps/server`
- web client/admin: `apps/web` with `npm run dev:client` and `npm run dev:admin`
- Android: open `apps/android` in Android Studio

## AI Disclaimer

This repository is developed with AI assistance, but AI is used here as a tool, not as an autonomous maintainer. Humans stay in control of every meaningful step: setting direction, reviewing and editing output, validating behavior, and deciding what is merged, released, and deployed.

AI can help accelerate drafting, implementation, and iteration across code, documentation, copy, and configuration. Every AI-assisted change should still be treated like any other contributor output and reviewed carefully, especially for security, privacy, infrastructure, and deployment-sensitive work.

## License

TaskBandit is licensed under the [GNU Affero General Public License v3.0](LICENSE.md).

This is a FOSS copyleft license. Commercial use is allowed, but redistributed or network-hosted modified versions must remain available under the AGPLv3 terms.
