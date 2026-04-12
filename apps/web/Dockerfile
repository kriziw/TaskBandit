ARG TASKBANDIT_RELEASE_VERSION=0.0.0-dev
ARG TASKBANDIT_BUILD_NUMBER=local
ARG TASKBANDIT_COMMIT_SHA=local

FROM node:22-bookworm-slim AS build
WORKDIR /workspace/apps/web

ARG TASKBANDIT_RELEASE_VERSION
ARG TASKBANDIT_BUILD_NUMBER
ARG TASKBANDIT_COMMIT_SHA

ENV VITE_TASKBANDIT_RELEASE_VERSION=${TASKBANDIT_RELEASE_VERSION}
ENV VITE_TASKBANDIT_BUILD_NUMBER=${TASKBANDIT_BUILD_NUMBER}
ENV VITE_TASKBANDIT_COMMIT_SHA=${TASKBANDIT_COMMIT_SHA}

COPY apps/web/package.json apps/web/package-lock.json ./
RUN npm ci

COPY apps/web/tsconfig.json apps/web/vite.config.ts apps/web/index.html apps/web/admin.html apps/web/client.html ./
COPY apps/web/public ./public
COPY apps/web/src ./src
RUN npm run build

FROM nginx:1.27-alpine AS runtime
WORKDIR /usr/share/nginx/html

COPY apps/web/docker/40-generate-runtime-config.sh /docker-entrypoint.d/40-generate-runtime-config.sh
COPY apps/web/docker/nginx-web.conf /etc/nginx/conf.d/default.conf
RUN chmod +x /docker-entrypoint.d/40-generate-runtime-config.sh

ENV TASKBANDIT_API_BASE_URL=http://localhost:8080
ENV TASKBANDIT_WEB_BASE_URL=http://localhost:4173
ENV TASKBANDIT_ADMIN_BASE_URL=http://localhost:4173/admin
ENV TASKBANDIT_CLIENT_BASE_URL=http://localhost:4173

COPY --from=build /workspace/apps/web/dist-client/ /usr/share/nginx/html/
COPY --from=build /workspace/apps/web/dist-admin/ /usr/share/nginx/html/admin/
