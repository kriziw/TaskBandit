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
3. Run the ASP.NET API from `apps/server/src/TaskBandit.Api`.
4. Run the React app from `apps/web`.
5. Open the Android project from `apps/android` in Android Studio.

## Notes

- The current backend still uses in-memory domain state; PostgreSQL persistence is the next implementation milestone.
- The Android project currently includes Gradle files but not a checked-in wrapper yet.
- Authentik is the target OIDC provider for the first external identity integration.
- Reverse proxy support is built in through forwarded-header handling and optional path-base configuration.
