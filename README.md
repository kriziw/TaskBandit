# TaskBandit

TaskBandit is a self-hosted, heavily gamified household chore manager with:

- a server component that exposes the API and hosts the web UI
- a native Android application for daily use, offline actions, photo proof, and widgets

## AI Disclaimer

This repository is being developed with AI assistance. Code, documentation, copy, and configuration generated or edited by AI should be reviewed by a human before production use, especially for security, privacy, and deployment-sensitive changes.

## License

TaskBandit is currently licensed under [PolyForm Noncommercial 1.0.0](C:/Users/krist/Documents/GitHub/Chore%20Manager/LICENSE.md). This matches the goal of allowing source visibility while disallowing commercial use, but it is source-available rather than FOSS/open-source in the strict OSI sense.

## Repository Layout

- `apps/server` - NestJS + Prisma backend API
- `apps/web` - React + TypeScript web UI
- `apps/android` - Android app built with Kotlin and Jetpack Compose
- `infra/docker` - local development and deployment stack
- `docs` - product, architecture, and delivery notes

## Current Status

This repository is in the initial implementation phase. The current scaffold includes:

- the v1 product and technical architecture
- an initial NestJS + Prisma backend with PostgreSQL schema, starter endpoints, bootstrap flow, and local-auth foundations
- a live React web dashboard with local login, language files, approvals, household settings, and chore views
- the first-pass Android shell with localized string resources
- Docker-based local infrastructure for PostgreSQL
- a bootstrap path for initializing the first household
- reverse-proxy aware server configuration for Nginx or Traefik deployments

## Local Tooling Note

This workspace currently has Node.js available, but does not have Gradle installed. The NestJS server can be developed with Node.js, while Android build verification will require a full Android/Gradle toolchain.

## Android Releases

The repository now includes a GitHub Actions workflow that builds a release APK for Android phones when a GitHub release is published. Because the current app does not bundle native NDK libraries, the generated APK is a standard universal Android package and is suitable for ARM smartphones.

If Android signing secrets are not configured yet, the workflow still builds and uploads a release APK artifact, but it does not attach that unsigned package to the GitHub release. Once you are ready for signed installs, add these GitHub repository secrets:

- `ANDROID_KEYSTORE_BASE64`
- `ANDROID_KEYSTORE_PASSWORD`
- `ANDROID_KEY_ALIAS`
- `ANDROID_KEY_PASSWORD`

You can also trigger the workflow manually from GitHub Actions to validate the Android release pipeline before creating a public release.

## Deployment Notes

TaskBandit is intended to support self-hosting behind reverse proxies such as Nginx or Traefik. See `docs/reverse-proxy.md` for the initial configuration guidance.

Docker Compose is configured to pull the server image from Docker Hub via `kriziw/taskbandit`. Use `TASKBANDIT_IMAGE_TAG` to pin a specific published tag if you do not want `latest`.
The publishing workflow and required GitHub secrets are documented in `docs/docker-publishing.md`.
Localization structure and language-file locations are documented in `docs/localization.md`.
Authentication endpoints and environment variables are documented in `docs/authentication.md`.
Chore submission and review endpoints are documented in `docs/chore-workflow.md`.
The container startup now applies Prisma migrations automatically and waits for PostgreSQL health before the app boots.

## Quick Start

Fastest self-hosted setup:

```bash
mkdir -p taskbandit && cd taskbandit && wget -O docker-compose.yml https://raw.githubusercontent.com/kriziw/TaskBandit/main/infra/docker/docker-compose.yml && wget -O .env https://raw.githubusercontent.com/kriziw/TaskBandit/main/.env.example
```

Then start it with:

```bash
docker compose up -d
```

Manual setup:

1. Copy `.env.example` to `.env`.
2. Review these values in `.env`:
   `TASKBANDIT_DB_NAME`, `TASKBANDIT_DB_USER`, `TASKBANDIT_DB_PASSWORD`, `TASKBANDIT_DB_HOST_PORT`, `TASKBANDIT_PORT`, `TASKBANDIT_JWT_SECRET`, `TASKBANDIT_IMAGE_TAG`, `TASKBANDIT_BOOTSTRAP_SEED_DEMO_DATA`, `TASKBANDIT_STORAGE_ROOT`.
   OIDC is optional. Leave `TASKBANDIT_OIDC_ENABLED=false` unless you are actively wiring an OIDC provider.
3. Start TaskBandit:
   `docker compose up -d`
4. Open `http://localhost:<TASKBANDIT_PORT>`.
5. If demo seeding is enabled, sign in with:
   `alex@taskbandit.local` / `TaskBandit123!`
   `maya@taskbandit.local` / `TaskBandit123!`
   `luca@taskbandit.local` / `TaskBandit123!`
6. If demo seeding is disabled, initialize the first household through the bootstrap API and then sign in with the owner account you created.
   The web app now also shows a first-run bootstrap form automatically when no household exists yet.

## .env Notes

- `TASKBANDIT_IMAGE_TAG=latest` pulls the latest published Docker image from Docker Hub.
- `TASKBANDIT_PORT=8080` controls both the port the app listens on inside Docker and the host port published by Docker Compose.
- `TASKBANDIT_DB_HOST_PORT=5432` controls which host port PostgreSQL is exposed on. The container still uses port `5432` internally.
- `TASKBANDIT_BOOTSTRAP_SEED_DEMO_DATA=true` creates the demo household automatically for local evaluation.
- `TASKBANDIT_STORAGE_ROOT` is the server-side path used for uploaded proof photos. In Docker Compose this is mounted to a persistent volume.
- `TASKBANDIT_REVERSE_PROXY_ENABLED` and `TASKBANDIT_REVERSE_PROXY_PATH_BASE` should be set when TaskBandit is deployed behind Nginx or Traefik.
- `TASKBANDIT_OIDC_ENABLED=false` keeps OIDC off entirely. Set it to `true` only when you also provide valid `TASKBANDIT_OIDC_*` values.
- `TASKBANDIT_OIDC_*` values are optional and only needed when you wire Authentik or another OIDC provider.

## Web App Notes

The web UI now connects to the live API for:

- local sign-in with JWT session persistence
- dashboard summary and leaderboard
- chore lists and submission flow, including proof-photo uploads
- parent/admin approval actions
- admin household settings
- admin member creation for parent and child accounts

For local development, copy `apps/web/.env.example` to `apps/web/.env` if you want to override the API base URL used by the Vite app.

## Backend Notes

The backend now uses NestJS with Prisma and PostgreSQL, plus a seed/bootstrap path for the initial single-household dataset. Local account login foundations are in place, and Authentik-focused OIDC configuration is available as an optional feature for the next auth iteration.

For local/demo environments, sample household seeding can be toggled with `TASKBANDIT_BOOTSTRAP_SEED_DEMO_DATA`. For real installs, that should typically be disabled and the first household should be created through the bootstrap API.
The repository also now includes an initial Prisma migration snapshot for the current backend model.
Proof-photo uploads are stored on local disk under `TASKBANDIT_STORAGE_ROOT`, and the Docker Compose stack now mounts persistent storage for that directory.
If you change `TASKBANDIT_PORT`, the NestJS app will listen on that port automatically through the `PORT` environment variable passed by Docker Compose.
