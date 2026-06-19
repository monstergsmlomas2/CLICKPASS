# Construir SIEMPRE en la misma arquitectura del host de destino (ARM en la VM de Oracle Cloud),
# porque el cliente de Prisma se genera con el binary target "native" del build.

FROM node:25-slim AS base
WORKDIR /repo
RUN apt-get update && apt-get install -y --no-install-recommends openssl && rm -rf /var/lib/apt/lists/*

FROM base AS deps
COPY package.json package-lock.json ./
COPY apps/backend/package.json apps/backend/package.json
COPY packages/shared/package.json packages/shared/package.json
RUN npm ci

FROM deps AS build
COPY . .
RUN npm run build --workspace=@clickpass/shared
RUN npx prisma generate --schema apps/backend/prisma/schema.prisma
RUN npm run build --workspace=@clickpass/backend

FROM base AS runtime
ENV NODE_ENV=production
WORKDIR /repo
COPY package.json package-lock.json ./
COPY apps/backend/package.json apps/backend/package.json
COPY packages/shared/package.json packages/shared/package.json
RUN npm ci --omit=dev
COPY --from=build /repo/packages/shared/src ./packages/shared/src
COPY --from=build /repo/apps/backend/dist ./apps/backend/dist
COPY --from=build /repo/apps/backend/prisma ./apps/backend/prisma
COPY --from=build /repo/node_modules/.prisma ./node_modules/.prisma

EXPOSE 3001
WORKDIR /repo/apps/backend
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/main.js"]
