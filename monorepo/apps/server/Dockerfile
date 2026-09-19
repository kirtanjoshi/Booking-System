FROM node:20-alpine

WORKDIR /app

RUN corepack enable && corepack prepare pnpm@10.32.1 --activate

COPY package.json pnpm-lock.yaml* pnpm-workspace.yaml turbo.json ./
COPY apps/server ./apps/server

RUN pnpm install --frozen-lockfile

WORKDIR /app/apps/server

EXPOSE 3001

CMD ["pnpm", "dev"]
