ARG TASKBANDIT_RELEASE_VERSION=0.0.0-dev
ARG TASKBANDIT_BUILD_NUMBER=local
ARG TASKBANDIT_COMMIT_SHA=local

FROM node:22-bookworm-slim AS server-build
WORKDIR /workspace/apps/server

RUN apt-get update \
    && apt-get install -y --no-install-recommends openssl ca-certificates \
    && rm -rf /var/lib/apt/lists/*

COPY apps/server/package.json apps/server/package-lock.json ./
RUN npm ci

COPY apps/server/tsconfig.json apps/server/tsconfig.build.json apps/server/nest-cli.json ./
COPY apps/server/prisma ./prisma
RUN npx prisma generate

COPY apps/server/src ./src
RUN npm run build

FROM node:22-bookworm-slim AS web-build
WORKDIR /workspace/apps/web

ARG TASKBANDIT_RELEASE_VERSION
ARG TASKBANDIT_BUILD_NUMBER
ARG TASKBANDIT_COMMIT_SHA

ENV VITE_TASKBANDIT_RELEASE_VERSION=${TASKBANDIT_RELEASE_VERSION}
ENV VITE_TASKBANDIT_BUILD_NUMBER=${TASKBANDIT_BUILD_NUMBER}
ENV VITE_TASKBANDIT_COMMIT_SHA=${TASKBANDIT_COMMIT_SHA}

COPY apps/web/package.json apps/web/package-lock.json ./
RUN npm ci

COPY apps/web/tsconfig.json apps/web/vite.config.ts apps/web/index.html ./
COPY apps/web/public ./public
COPY apps/web/src ./src
RUN npm run build

FROM node:22-bookworm-slim AS runtime
WORKDIR /workspace/apps/server

ARG TASKBANDIT_RELEASE_VERSION
ARG TASKBANDIT_BUILD_NUMBER
ARG TASKBANDIT_COMMIT_SHA

RUN apt-get update \
    && apt-get install -y --no-install-recommends openssl wget ca-certificates \
    && rm -rf /var/lib/apt/lists/*

COPY apps/server/package.json apps/server/package-lock.json ./
RUN npm ci --omit=dev

COPY apps/server/prisma ./prisma
RUN npx prisma generate

COPY --from=server-build /workspace/apps/server/dist ./dist
COPY --from=web-build /workspace/apps/web/dist ./public
RUN mkdir -p /var/lib/taskbandit/storage

ENV NODE_ENV=production
ENV PORT=8080
ENV TASKBANDIT_STORAGE_ROOT=/var/lib/taskbandit/storage
ENV TASKBANDIT_RELEASE_VERSION=${TASKBANDIT_RELEASE_VERSION}
ENV TASKBANDIT_BUILD_NUMBER=${TASKBANDIT_BUILD_NUMBER}
ENV TASKBANDIT_COMMIT_SHA=${TASKBANDIT_COMMIT_SHA}

HEALTHCHECK --interval=30s --timeout=5s --start-period=40s --retries=5 CMD wget -q -O /dev/null "http://127.0.0.1:${PORT:-8080}/health" || exit 1

CMD ["npm", "run", "start:docker"]
