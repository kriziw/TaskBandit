# Docker Publishing

TaskBandit publishes its server image to Docker Hub at `kriziw/taskbandit`.

## GitHub Actions Secrets

Set these repository secrets in GitHub:

- `DOCKERHUB_USERNAME`
- `DOCKERHUB_TOKEN`

The token should be a Docker Hub access token with permission to push to `kriziw/taskbandit`.

## Published Tags

The current workflow publishes:

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

The compose stack uses:

`kriziw/taskbandit:${TASKBANDIT_IMAGE_TAG:-latest}`

Set `TASKBANDIT_IMAGE_TAG` in `.env` if you want to pin a specific published build.
