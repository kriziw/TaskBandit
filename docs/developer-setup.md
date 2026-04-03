# Developer Setup

## Required Tooling

- Docker Desktop
- .NET SDK 8
- Node.js 24 or later
- JDK 17
- Android Studio or Gradle-compatible Android toolchain

## Recommended Local Flow

1. Copy `.env.example` to `.env` and adjust any values you want to override.
2. Start PostgreSQL with Docker Compose from `infra/docker`.
3. Decide whether you want demo seed data. For a clean install, set `TASKBANDIT_BOOTSTRAP_SEED_DEMO_DATA=false`.
4. Run the ASP.NET API from `apps/server/src/TaskBandit.Api`.
5. Run the React app from `apps/web`.
6. Open the Android project from `apps/android` in Android Studio.

## Notes

- The backend now targets PostgreSQL through EF Core and seeds an initial household on startup.
- The backend also exposes bootstrap endpoints for checking initialization state and creating the first household when demo seeding is disabled.
- The current database setup uses `EnsureCreated` for early development; migrations should replace that before a production release.
- The Android project currently includes Gradle files but not a checked-in wrapper yet.
- Authentik is the target OIDC provider for the first external identity integration.
- Reverse proxy support is built in through forwarded-header handling and optional path-base configuration.
