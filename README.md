# TaskBandit

TaskBandit is a self-hosted, heavily gamified household chore manager with:

- a server component that exposes the API and hosts the web UI
- a native Android application for daily use, offline actions, photo proof, and widgets

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
- the first-pass web UI shell with JSON language files
- the first-pass Android shell with localized string resources
- Docker-based local infrastructure for PostgreSQL
- a bootstrap path for initializing the first household
- reverse-proxy aware server configuration for Nginx or Traefik deployments

## Local Tooling Note

This workspace currently has Node.js available, but does not have Gradle installed. The NestJS server can be developed with Node.js, while Android build verification will require a full Android/Gradle toolchain.

## Deployment Notes

TaskBandit is intended to support self-hosting behind reverse proxies such as Nginx or Traefik. See `docs/reverse-proxy.md` for the initial configuration guidance.

Docker Compose is configured to pull the server image from Docker Hub via `kriziw/taskbandit`. Use `TASKBANDIT_IMAGE_TAG` to pin a specific published tag if you do not want `latest`.
The publishing workflow and required GitHub secrets are documented in `docs/docker-publishing.md`.
Localization structure and language-file locations are documented in `docs/localization.md`.
Authentication endpoints and environment variables are documented in `docs/authentication.md`.
Chore submission and review endpoints are documented in `docs/chore-workflow.md`.

## Backend Notes

The backend now uses NestJS with Prisma and PostgreSQL, plus a seed/bootstrap path for the initial single-household dataset. Local account login foundations are in place, and Authentik-focused OIDC configuration is exposed for the next auth iteration.

For local/demo environments, sample household seeding can be toggled with `TASKBANDIT_BOOTSTRAP_SEED_DEMO_DATA`. For real installs, that should typically be disabled and the first household should be created through the bootstrap API.
