# Developer Setup

## Required Tooling

- Docker Desktop
- Node.js 24 or later
- npm
- JDK 17
- Android Studio or Gradle-compatible Android toolchain

## Recommended Local Flow

1. Copy `.env.example` to `.env` and adjust any values you want to override.
2. Start PostgreSQL and TaskBandit with Docker Compose from the repository root.
3. Decide whether you want demo seed data. For a clean install, set `TASKBANDIT_BOOTSTRAP_SEED_DEMO_DATA=false`.
4. If you want to run the published container instead of a local build, leave `TASKBANDIT_IMAGE_TAG` at `latest` or pin it to a published Docker Hub tag.
5. If you want to run the server locally, install dependencies in `apps/server`, run `npm run prisma:generate`, apply the Prisma migration, then start the NestJS API.
6. If needed, copy `apps/web/.env.example` to `apps/web/.env` and set `VITE_TASKBANDIT_API_BASE_URL` to the reachable API origin.
7. Run the split web apps from `apps/web`:
   `npm run dev:admin` for the admin UI and `npm run dev:client` for the client UI.
8. Open the Android project from `apps/android` in Android Studio.

## Notes

- The backend now targets PostgreSQL through Prisma and seeds an initial household on startup.
- The backend also exposes bootstrap endpoints for checking initialization state and creating the first household when demo seeding is disabled.
- Local authentication foundations are in place with JWT-based login endpoints and Authentik-oriented OIDC configuration settings.
- The repository now includes an initial Prisma migration snapshot under `apps/server/prisma/migrations`.
- Docker Compose now pulls three images in the split deployment model:
  `kriziw/taskbandit`, `kriziw/taskbandit-admin`, and `kriziw/taskbandit-client`.
- The Android project currently includes Gradle files but not a checked-in wrapper yet.
- Authentik is the target OIDC provider for the first external identity integration.
- Reverse proxy support is built in through trusted proxy handling and optional path-base configuration.
- Demo seeded local accounts use the password `TaskBandit123!` for `alex@taskbandit.local`, `maya@taskbandit.local`, and `luca@taskbandit.local`.
- The client web app works as a normal browser app first and can also be installed as a PWA.
- The client web app keeps its session in durable local storage, while the admin entrypoint uses session storage so admin access is more tightly scoped to the active browser session.
- Split frontend deployment and migration rules are documented in `docs/dual-web-clients.md`.
- Proof-photo uploads are now written to local disk under `TASKBANDIT_STORAGE_ROOT` and should point at a persistent path outside disposable containers in real deployments.
