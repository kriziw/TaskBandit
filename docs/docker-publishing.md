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
- a short SHA tag for each published commit

## Docker Compose

The compose stack uses:

`kriziw/taskbandit:${TASKBANDIT_IMAGE_TAG:-latest}`

Set `TASKBANDIT_IMAGE_TAG` in `.env` if you want to pin a specific published build.

