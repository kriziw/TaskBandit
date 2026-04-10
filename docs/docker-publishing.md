# Docker Publishing

TaskBandit publishes three Docker images to Docker Hub:

- `kriziw/taskbandit` for the API server
- `kriziw/taskbandit-admin` for the admin web UI
- `kriziw/taskbandit-client` for the client web UI

## GitHub Actions Secrets

Set these repository secrets in GitHub:

- `DOCKERHUB_USERNAME`
- `DOCKERHUB_TOKEN`

The token should be a Docker Hub access token with permission to push to the TaskBandit image set.

## Published Tags

The current workflow publishes matching tags for all three images:

- `latest` from the default branch
- `prerelease` when `PRE_RELEASE_SETTING` is truthy

Versioned release tags like `0.9.2` and `v0.9.2` are published by the controlled release workflow (`release-please.yml`).

The automatic Docker publish workflow runs on pushes to `main` that touch the deployable image inputs, including:

- `apps/server/**`
- `apps/web/**`
- `infra/docker/**`
- `.dockerignore`

You can also run the workflow manually from GitHub Actions if you want to refresh Docker Hub without creating a release.

## Docker Compose

The compose stack uses the same shared image tag for:

- `kriziw/taskbandit:${TASKBANDIT_IMAGE_TAG:-latest}`
- `kriziw/taskbandit-admin:${TASKBANDIT_IMAGE_TAG:-latest}`
- `kriziw/taskbandit-client:${TASKBANDIT_IMAGE_TAG:-latest}`

Set `TASKBANDIT_IMAGE_TAG` in `.env` if you want to pin a specific published build across the whole split stack.
