FROM node:22-alpine AS build
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY tsconfig.json tsconfig.build.json nest-cli.json ./
COPY prisma ./prisma
RUN npx prisma generate

COPY src ./src
RUN npm run build

FROM node:22-alpine AS runtime
WORKDIR /app

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
