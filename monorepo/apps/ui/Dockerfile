FROM node:20-alpine

WORKDIR /app

RUN corepack enable && corepack prepare pnpm@10.32.1 --activate

COPY package.json pnpm-lock.yaml* pnpm-workspace.yaml turbo.json ./
COPY apps/ui ./apps/ui

RUN pnpm install --frozen-lockfile

WORKDIR /app/apps/ui

EXPOSE 3000

CMD ["pnpm", "dev"]
