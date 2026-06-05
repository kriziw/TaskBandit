ARG TASKBANDIT_RELEASE_VERSION=0.0.0-dev
ARG TASKBANDIT_BUILD_NUMBER=local
ARG TASKBANDIT_COMMIT_SHA=local
ARG TASKBANDIT_IMAGE_TAG=

FROM node:22-alpine AS server-build
WORKDIR /workspace/apps/server

RUN apk add --no-cache openssl ca-certificates

COPY apps/server/package.json apps/server/package-lock.json ./
RUN npm ci

COPY apps/server/tsconfig.json apps/server/tsconfig.build.json apps/server/nest-cli.json apps/server/prisma.config.ts ./
COPY apps/server/prisma ./prisma
RUN npx prisma generate

COPY apps/server/src ./src
RUN npm run build

FROM node:22-alpine AS runtime
WORKDIR /workspace/apps/server

ARG TASKBANDIT_RELEASE_VERSION
ARG TASKBANDIT_BUILD_NUMBER
ARG TASKBANDIT_COMMIT_SHA
ARG TASKBANDIT_IMAGE_TAG

RUN apk add --no-cache openssl wget ca-certificates

COPY apps/server/package.json apps/server/package-lock.json ./
RUN npm ci --omit=dev

COPY apps/server/prisma.config.ts ./
COPY apps/server/prisma ./prisma
COPY --from=server-build /workspace/apps/server/src/generated ./src/generated

COPY --from=server-build /workspace/apps/server/dist ./dist
RUN mkdir -p /var/lib/taskbandit/storage

ENV NODE_ENV=production
ENV PORT=8080
ENV TASKBANDIT_STORAGE_ROOT=/var/lib/taskbandit/storage
ENV TASKBANDIT_RELEASE_VERSION=${TASKBANDIT_RELEASE_VERSION}
ENV TASKBANDIT_BUILD_NUMBER=${TASKBANDIT_BUILD_NUMBER}
ENV TASKBANDIT_COMMIT_SHA=${TASKBANDIT_COMMIT_SHA}
ENV TASKBANDIT_IMAGE_TAG=${TASKBANDIT_IMAGE_TAG}

HEALTHCHECK --interval=30s --timeout=5s --start-period=40s --retries=5 CMD wget -q -O /dev/null "http://127.0.0.1:${PORT:-8080}/health" || exit 1

CMD ["npm", "run", "start:docker"]
