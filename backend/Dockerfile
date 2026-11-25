# Só para o ambiente local (docker-compose). Em produção, o provedor faz o build.
# ---------- Etapa de build ----------
FROM node:22-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npx prisma generate
RUN npm run build

# ---------- Etapa de execução ----------
FROM node:22-alpine AS production

ENV NODE_ENV=production
WORKDIR /app

# Reaproveita o node_modules do build (já com o Prisma Client gerado) e tira as
# dependências de desenvolvimento.
COPY package*.json ./
COPY --from=builder /app/node_modules ./node_modules
RUN npm prune --omit=dev && npm cache clean --force

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/prisma.config.ts ./prisma.config.ts

EXPOSE 3000

CMD ["sh", "-c", "npx prisma migrate deploy && node dist/src/main"]
