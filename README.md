# TaskBandit

TaskBandit is a self-hosted, heavily gamified household chore manager with:

- a server component that exposes the API and hosts the web UI
- a native Android application for daily use, offline actions, photo proof, and widgets

## Repository Layout

- `apps/server` - ASP.NET Core API and server-side hosting entrypoint
- `apps/web` - React + TypeScript web UI
- `apps/android` - Android app built with Kotlin and Jetpack Compose
- `infra/docker` - local development and deployment stack
- `docs` - product, architecture, and delivery notes

## Current Status

This repository is in the initial implementation phase. The current scaffold includes:

- the v1 product and technical architecture
- initial backend domain models, EF Core persistence structure, and starter endpoints
- the first-pass web UI shell
- the first-pass Android shell
- Docker-based local infrastructure for PostgreSQL
- a bootstrap path for initializing the first household
- reverse-proxy aware server configuration for Nginx or Traefik deployments

## Local Tooling Note

This workspace currently has Node.js available, but does not have a .NET SDK or Gradle installed. The ASP.NET and Android projects are scaffolded for implementation, but local build verification will require those toolchains.

## Deployment Notes

TaskBandit is intended to support self-hosting behind reverse proxies such as Nginx or Traefik. See `docs/reverse-proxy.md` for the initial configuration guidance.

Docker Compose is configured to pull the server image from Docker Hub via `kriziw/taskbandit`. Use `TASKBANDIT_IMAGE_TAG` to pin a specific published tag if you do not want `latest`.
The publishing workflow and required GitHub secrets are documented in `docs/docker-publishing.md`.

## Backend Notes

The backend now uses EF Core with PostgreSQL-oriented configuration and a seed/bootstrap path for the initial single-household dataset. The next backend milestone is expanding from the current seed-backed read/write slice into full authenticated household management and real workflow state transitions.

For local/demo environments, sample household seeding can be toggled with `TaskBandit__Bootstrap__SeedDemoData`. For real installs, that should typically be disabled and the first household should be created through the bootstrap API.
