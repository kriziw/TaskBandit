FROM node:22-bookworm-slim AS build
WORKDIR /app

RUN apt-get update \
    && apt-get install -y --no-install-recommends openssl ca-certificates \
    && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./
RUN npm ci

COPY tsconfig.json tsconfig.build.json nest-cli.json ./
COPY prisma ./prisma
RUN npx prisma generate

COPY src ./src
RUN npm run build

FROM node:22-bookworm-slim AS runtime
WORKDIR /app

RUN apt-get update \
    && apt-get install -y --no-install-recommends openssl wget ca-certificates \
    && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY prisma ./prisma
RUN npx prisma generate

COPY --from=build /app/dist ./dist
RUN mkdir -p /var/lib/taskbandit/storage

ENV NODE_ENV=production
ENV PORT=8080
ENV TASKBANDIT_STORAGE_ROOT=/var/lib/taskbandit/storage

HEALTHCHECK --interval=30s --timeout=5s --start-period=40s --retries=5 CMD wget -q -O /dev/null "http://127.0.0.1:${PORT:-8080}/health" || exit 1

CMD ["npm", "run", "start:docker"]
