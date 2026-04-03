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

CMD ["npm", "run", "start:docker"]
