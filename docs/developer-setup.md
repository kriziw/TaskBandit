# Developer Setup

## Required Tooling

- Docker Desktop
- Node.js 24 or later
- npm
- JDK 17
- Android Studio or Gradle-compatible Android toolchain

## Recommended Local Flow

1. Copy `.env.example` to `.env` and adjust any values you want to override.
2. Start PostgreSQL with Docker Compose from `infra/docker`.
3. Decide whether you want demo seed data. For a clean install, set `TASKBANDIT_BOOTSTRAP_SEED_DEMO_DATA=false`.
4. If you want to run the published container instead of a local build, leave `TASKBANDIT_IMAGE_TAG` at `latest` or pin it to a published Docker Hub tag.
5. If you want to run the server locally, install dependencies in `apps/server`, run `npm run prisma:generate`, then start the NestJS API.
6. Run the React app from `apps/web`.
7. Open the Android project from `apps/android` in Android Studio.

## Notes

- The backend now targets PostgreSQL through Prisma and seeds an initial household on startup.
- The backend also exposes bootstrap endpoints for checking initialization state and creating the first household when demo seeding is disabled.
- The current database setup includes a Prisma schema but not committed migrations yet.
- Docker Compose now pulls the server image from `kriziw/taskbandit`.
- The Android project currently includes Gradle files but not a checked-in wrapper yet.
- Authentik is the target OIDC provider for the first external identity integration.
- Reverse proxy support is built in through trusted proxy handling and optional path-base configuration.
