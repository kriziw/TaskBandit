<p align="center">
  <img src="docs/assets/taskbandit-logo.svg" alt="TaskBandit logo" width="520" />
</p>

<p align="center">
  Self-hosted chores, approvals, streaks, and proof photos for playful households.
</p>

TaskBandit is a self-hosted, heavily gamified household chore manager with:

- a server component that exposes the API and can either serve the embedded combined web UI or sit behind separate admin/client web frontends
- a client-facing web PWA for installable browser-based daily use
- a native Android application for daily use, offline actions, photo proof, and widgets

## AI Disclaimer

This repository is developed with AI assistance, but AI is used here as a tool, not as an autonomous maintainer. Humans stay in control of every meaningful step: setting direction, reviewing and editing output, validating behavior, and deciding what is merged, released, and deployed.

AI can help accelerate drafting, implementation, and iteration across code, documentation, copy, and configuration. Every AI-assisted change should still be treated like any other contributor output and reviewed carefully, especially for security, privacy, infrastructure, and deployment-sensitive work.

## License

TaskBandit is licensed under the [GNU Affero General Public License v3.0](LICENSE.md).

This is a FOSS copyleft license. Commercial use is allowed, but redistributed or network-hosted modified versions must remain available under the AGPLv3 terms.

## Repository Layout

- `apps/server` - NestJS + Prisma backend API
- `apps/web` - React + TypeScript web UI
- `apps/android` - Android app built with Kotlin and Jetpack Compose
- `docker-compose.yml` - canonical self-hosted stack entrypoint for repo checkouts and quick-start downloads
- `infra/docker` - mirrored Compose location kept for direct download compatibility
- `docs` - product, architecture, and delivery notes

## Current Status

This repository is in the initial implementation phase. The current scaffold includes:

- the v1 product and technical architecture
- an initial NestJS + Prisma backend with PostgreSQL schema, starter endpoints, bootstrap flow, and local-auth foundations
- a live React web dashboard with local login, language files, approvals, household settings, and chore views
- per-member notification preferences respected by reminder and activity notifications
- Android installations now register notification devices with the server, and mobile push is the primary household notification channel
- optional Firebase Cloud Messaging delivery is now wired on the server and Android can register real FCM tokens when Firebase is configured at build/runtime
- optional Web Push delivery is now wired for the client PWA when VAPID keys are configured on the server
- optional SMTP settings configurable from the admin UI, with built-in connection testing
- optional SMTP-backed fallback delivery for notifications when no push-ready mobile device is available
- local-account password reset via SMTP-backed email links
- a first-time admin onboarding flow for setup guidance and feature overview
- an Android app shell with live login, chore actions, offline queueing, proof-photo upload, and a home-screen widget foundation
- admin snapshot export of the live household state for backup/support use
- an admin backup-readiness panel showing which host paths, files, and recovery settings should be preserved before migrating the stack
- an admin system-status panel for checking runtime readiness across database, storage, auth, push, and email fallback
- an admin notification-recovery panel for retrying failed push or email-fallback deliveries
- Docker-based local infrastructure for PostgreSQL
- a bootstrap path for initializing the first household
- reverse-proxy aware server configuration for Nginx or Traefik deployments

## Local Tooling Note

Local server and web development only require Node.js. Local Android verification requires a full Android toolchain with JDK 17+, Android SDK, and Gradle or Android Studio.

## Android Releases

The repository now includes a GitHub Actions workflow that builds a release APK for Android phones. The main release pipeline is driven by `release-please`, which builds and attaches the Android APK when a release is cut. A separate manual `android-release` workflow remains available for ad-hoc validation or rebuilds without creating a new release.

Because the current app does not bundle native NDK libraries, the generated APK is a standard universal Android package and is suitable for ARM smartphones.

The Android app also now includes a home-screen widget that shows the latest cached chore snapshot and can trigger a lightweight refresh using the signed-in session.

If Android signing secrets are not configured yet, the workflow still builds and uploads a release APK artifact, but it does not attach that unsigned package to the GitHub release. Once you are ready for signed installs, add these GitHub repository secrets:

- `ANDROID_KEYSTORE_BASE64`
- `ANDROID_KEYSTORE_PASSWORD`
- `ANDROID_KEY_ALIAS`
- `ANDROID_KEY_PASSWORD`

You can also trigger the manual Android workflow from GitHub Actions to validate the Android release pipeline before creating a public release.

## Release Automation

TaskBandit now uses `release-please` as the main release-preparation workflow.

- Pushes to `main` automatically run `release-please`.
- The intended workflow is to do day-to-day work on branches and merge via PRs, with `main` treated as the release branch.
- If you keep pushing feature work directly to `main`, `release-please` will quite reasonably keep preparing the next release PR after releasable commits such as `feat:` and `fix:`.
- PRs targeting `main` now validate their title format so squash merges stay release-please-safe. Use conventional titles such as `feat: ...`, `fix: ...`, or `chore: ...`.
- When that release PR is merged, the workflow creates the GitHub release, builds and attaches the Android APK, and publishes versioned Docker images.
- The workflow now also verifies that the release tag exists after a successful release creation, so future releases do not drift into the old missing-tag state that caused repeated historical release notes.
- The separate `android-release` workflow is manual-only, so the release APK is not built twice for the same release event.
- The `simple` release strategy tracks the root [CHANGELOG.md](C:/Users/krist/Documents/GitHub/Chore%20Manager/CHANGELOG.md) and [version.txt](C:/Users/krist/Documents/GitHub/Chore%20Manager/version.txt).

Prerelease control:

- Repository variable `PRE_RELEASE_SETTING` controls whether release-please marks releases as prereleases.
- Truthy values such as `TRUE`, `TRU`, `YES`, `ON`, or `1` make the release a prerelease.
- `FALSE` turns prerelease mode off for future releases.
- Stable releases also move the Docker `latest` tag. Prereleases publish version tags plus the mutable `prerelease` Docker tag instead.
- The manual `backfill-release-tags` workflow exists only to repair already-missed historical tags; it should be run once after merging the fix branch if those tags are still absent.

Recommended GitHub release secret:

- `RELEASE_PLEASE_TOKEN`
  Use a fine-grained or classic PAT with repository contents and pull-request write access.
  The workflow falls back to `GITHUB_TOKEN`, but a PAT is recommended if you want other workflows to run on release-please PRs and release-created events outside the main release workflow.

## Deployment Notes

TaskBandit is intended to support self-hosting behind reverse proxies such as Nginx or Traefik. See `docs/reverse-proxy.md` for the initial configuration guidance.
The split admin/client rollout model, session strategy, and coexistence rules are documented in `docs/dual-web-clients.md`.

Upgrade order for private self-hosted installs:

- update the server container first, which also updates the bundled web UI
- update Android clients after the server is running the newer version
- TaskBandit now degrades gracefully when newer clients meet an older server for some optional features, but server-first upgrades remain the safest path for avoiding mixed-version surprises

Docker Compose is configured to pull the server image from Docker Hub via `kriziw/taskbandit`. Use `TASKBANDIT_IMAGE_TAG` to pin a specific published tag if you do not want `latest`.
The publishing workflow and required GitHub secrets are documented in `docs/docker-publishing.md`.
The Docker publish workflow now refreshes the image on `main` when either the server or bundled web UI changes, and it can also be run manually from GitHub Actions.
Localization structure and language-file locations are documented in `docs/localization.md`.
Authentication endpoints and environment variables are documented in `docs/authentication.md`.
Chore submission and review endpoints are documented in `docs/chore-workflow.md`.
The container startup now applies Prisma migrations automatically and waits for PostgreSQL health before the app boots.
The server container now also exposes `/health` and includes a Docker healthcheck, so `docker ps` will report a real healthy/unhealthy state based on both the Nest app and PostgreSQL connectivity.

## Quick Start

Fastest self-hosted setup:

```bash
mkdir -p taskbandit && cd taskbandit && wget -O docker-compose.yml https://raw.githubusercontent.com/kriziw/TaskBandit/main/docker-compose.yml && wget -O .env https://raw.githubusercontent.com/kriziw/TaskBandit/main/.env.example
```

Then start it with:

```bash
docker compose up -d
```

Manual setup:

1. Clone the repository, then copy `.env.example` to `.env` in the repository root.
2. Review these values in `.env`:
   `TASKBANDIT_DB_NAME`, `TASKBANDIT_DB_USER`, `TASKBANDIT_DB_PASSWORD`, `TASKBANDIT_DB_HOST_PORT`, `TASKBANDIT_DATA_ROOT`, `TASKBANDIT_PORT`, `TASKBANDIT_JWT_SECRET`, `TASKBANDIT_IMAGE_TAG`, `TASKBANDIT_BOOTSTRAP_SEED_DEMO_DATA`, `TASKBANDIT_STORAGE_ROOT`, `TASKBANDIT_REMINDER_INTERVAL_MS`, `TASKBANDIT_DUE_SOON_WINDOW_HOURS`, `TASKBANDIT_DAILY_SUMMARY_HOUR_UTC`, `TASKBANDIT_PUSH_DELIVERY_INTERVAL_MS`, `TASKBANDIT_EMAIL_DELIVERY_INTERVAL_MS`.
   OIDC is optional. Leave `TASKBANDIT_OIDC_ENABLED=false` unless you are actively wiring an OIDC provider.
   `TASKBANDIT_FORCE_LOCAL_AUTH_ENABLED=true` is the emergency recovery switch that keeps local sign-in available even if the UI setting disables it.
   If you enable it, configure your provider redirect URI as `http(s)://<your-taskbandit-base-url>/api/auth/oidc/callback`.
   FCM is also optional. Leave `TASKBANDIT_FCM_ENABLED=false` unless you are actively wiring Firebase Admin delivery for Android push notifications.
   Web Push is optional too. Leave `TASKBANDIT_WEB_PUSH_*` blank unless you want browser push for the client PWA.
3. Start TaskBandit from the repository root:
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
- The server health endpoint is always available at `/health`, even when `TASKBANDIT_REVERSE_PROXY_PATH_BASE` is set.
- `TASKBANDIT_DB_HOST_PORT=5432` controls which host port PostgreSQL is exposed on. The container still uses port `5432` internally.
- `TASKBANDIT_DATA_ROOT=./data` is the host folder Docker Compose binds into the stack for durable migration-friendly data.
- `TASKBANDIT_BOOTSTRAP_SEED_DEMO_DATA=true` creates the demo household automatically for local evaluation.
- `TASKBANDIT_REMINDER_INTERVAL_MS=300000` controls how often the backend scans for due-soon and overdue reminder notifications. Set it to `0` to disable the worker.
- `TASKBANDIT_DUE_SOON_WINDOW_HOURS=6` controls how far ahead TaskBandit creates due-soon reminders.
- `TASKBANDIT_DAILY_SUMMARY_HOUR_UTC=6` controls when the once-per-day TaskBandit summary notification is generated for each user.
- `TASKBANDIT_PUSH_DELIVERY_INTERVAL_MS=60000` controls how often the backend processes queued push deliveries. Set it to `0` to disable background push sending.
- `TASKBANDIT_EMAIL_DELIVERY_INTERVAL_MS=60000` controls how often the backend processes queued notification email fallbacks. Set it to `0` to disable notification email delivery while keeping SMTP available for password reset and invites.
- `TASKBANDIT_RUNTIME_LOG_BUFFER_SIZE=1000` controls how many recent server runtime log entries stay available in the admin web UI live log panel.
- `TASKBANDIT_STORAGE_ROOT=/var/lib/taskbandit/storage` is the server-side path used for uploaded proof photos inside the container.
- `TASKBANDIT_DATA_ROOT_HINT=./data`, `TASKBANDIT_COMPOSE_FILE_HINT=./docker-compose.yml`, and `TASKBANDIT_ENV_FILE_HINT=./.env` feed the admin backup-readiness panel with the host-side paths operators should preserve during migration.
- A repository checkout and the quick-start download now use the same root-level `docker-compose.yml`, so the backup-readiness panel matches both flows by default.
- Android clients now register a durable installation ID with the server so notification-device records move with the data volume and can later be upgraded to real push delivery providers.
- `TASKBANDIT_FCM_ENABLED=false` keeps server-side Firebase Cloud Messaging off entirely.
- `TASKBANDIT_FCM_SERVICE_ACCOUNT_BASE64` is the preferred way to pass a Firebase service-account JSON into Docker Compose for push delivery. `TASKBANDIT_FCM_SERVICE_ACCOUNT_JSON` also works if you prefer a raw JSON env value.
- `TASKBANDIT_WEB_PUSH_PUBLIC_KEY`, `TASKBANDIT_WEB_PUSH_PRIVATE_KEY`, and `TASKBANDIT_WEB_PUSH_SUBJECT` enable browser Web Push for the client PWA. If they are left blank, the client PWA still gets foreground live sync while open, but background browser notifications stay disabled.
- `TASKBANDIT_SERVE_EMBEDDED_WEB=true` keeps the bundled combined web UI served from the server container. Set it to `false` when you want to host admin/client frontends separately.
- `TASKBANDIT_CORS_ALLOWED_ORIGINS=` accepts a comma-separated allowlist of browser origins for split admin/client frontend deployments.
- UI-managed configuration and household state now live under the bind-mounted `TASKBANDIT_DATA_ROOT` folder:
  PostgreSQL data is stored in `${TASKBANDIT_DATA_ROOT}/postgres`, and app-managed files such as uploads and runtime logs are stored in `${TASKBANDIT_DATA_ROOT}/taskbandit`.
  If you migrate that folder to another host and bring the stack up again, the household settings and other UI-managed data come with it.
- `TASKBANDIT_REVERSE_PROXY_ENABLED` and `TASKBANDIT_REVERSE_PROXY_PATH_BASE` should be set when TaskBandit is deployed behind Nginx or Traefik.
- `TASKBANDIT_FORCE_LOCAL_AUTH_ENABLED=false` is the recovery override. When set to `true`, local sign-in stays effectively on even if an admin disabled it from the UI.
- `TASKBANDIT_OIDC_ENABLED=false` keeps environment-based fallback OIDC off entirely. Set it to `true` only when you also provide valid `TASKBANDIT_OIDC_*` values.
- `TASKBANDIT_OIDC_*` values are optional and only needed when you want environment-based fallback OIDC instead of, or in addition to, the UI-managed OIDC settings.
- `TASKBANDIT_OIDC_SCOPE=openid profile email` is the default OIDC scope used for the server-managed authorization-code flow.

## Web App Notes

The web UI now connects to the live API for:

- local sign-in with JWT session persistence
- dashboard summary and leaderboard
- chore lists and submission flow, including proof-photo uploads
- parent/admin approval actions
- admin household settings
- member notification preference controls
- admin-managed auth and SMTP provider controls
- admin household snapshot export
- local password reset request and completion flow
- admin member creation for parent and child accounts

For local development, copy `apps/web/.env.example` to `apps/web/.env` if you want to override the API base URL used by the Vite app.

## Backend Notes

The backend now uses NestJS with Prisma and PostgreSQL, plus a seed/bootstrap path for the initial single-household dataset. Local account login is live, optional Authentik-focused OIDC sign-in is available through the server-managed authorization-code flow, and auth provider settings can now be managed from the admin UI.
SMTP can now also be configured from the admin UI as an optional instance capability, with a connection test for validating host, port, and credentials before future email-based features use it. Local accounts can now use that SMTP setup for password-reset emails from the web sign-in screen, while mobile push remains the primary day-to-day notification path for chore activity. Notification email delivery acts only as a fallback when no push-ready mobile device is available for the recipient.
Notification-device registration is now live for signed-in Android clients, and the backend logs push-delivery fan-out groundwork in the admin runtime log even before a full FCM provider pipeline is enabled.
The backend now also queues provider-backed push deliveries in PostgreSQL and can send them through Firebase Admin when FCM is enabled in the environment.
Admins can also export a household snapshot JSON from the web UI. This is meant as a support/backup snapshot of the current live state, not as a full restore/import feature.
Admins can now also inspect a live system-status panel from the web UI to verify that the instance is ready across database connectivity, storage writability, auth recovery path, push delivery, and email fallback.
Admins can now also inspect a backup-readiness panel from the web UI to see which bind-mounted host paths and config files should move with the stack, alongside quick links to the household snapshot and runtime log exports.
Admins can also retry failed push deliveries and failed email fallbacks from the web UI, which is useful for private self-hosted instances without shell-level log chasing.

## Android Push Notes

Android push is optional and degrades cleanly:
- if the Android app is built without Firebase values, it still runs and registers as a generic notification device
- if the app is built with `TASKBANDIT_FIREBASE_APP_ID`, `TASKBANDIT_FIREBASE_API_KEY`, `TASKBANDIT_FIREBASE_PROJECT_ID`, and `TASKBANDIT_FIREBASE_SENDER_ID`, it initializes Firebase at runtime and registers an FCM token when available
- if the server is also configured with `TASKBANDIT_FCM_ENABLED=true` and a Firebase Admin service account, queued household notifications can be delivered as real Android push notifications

TaskBandit is designed with mobile push as the primary notification method for household activity. SMTP-backed email is currently intended for account recovery, admin-style messages such as invites, and notification fallback only when no push-ready device is available.

Auth precedence:
- Local auth follows the household UI setting unless `TASKBANDIT_FORCE_LOCAL_AUTH_ENABLED=true`, which force-keeps it available as a recovery path.
- OIDC prefers the household UI configuration when enabled there.
- If UI-managed OIDC is off or incomplete, TaskBandit can still fall back to environment-based `TASKBANDIT_OIDC_*` configuration.

For local/demo environments, sample household seeding can be toggled with `TASKBANDIT_BOOTSTRAP_SEED_DEMO_DATA`. For real installs, that should typically be disabled and the first household should be created through the bootstrap API.
The repository also now includes an initial Prisma migration snapshot for the current backend model.
Proof-photo uploads are stored on local disk under `TASKBANDIT_STORAGE_ROOT`, and the Docker Compose stack now mounts persistent storage for that directory.
Docker Compose now uses a bind-mounted data root instead of Docker-only named volumes, so migrating the configured host data folder also migrates the PostgreSQL-backed UI configuration.
If you change `TASKBANDIT_PORT`, the NestJS app will listen on that port automatically through the `PORT` environment variable passed by Docker Compose.
