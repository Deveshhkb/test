# ---------- build ----------
FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
COPY packages/game-math/package.json packages/game-math/
COPY packages/shared/package.json packages/shared/
COPY apps/server/package.json apps/server/
COPY apps/client/package.json apps/client/
RUN npm ci
COPY . .
RUN npm run build

# ---------- runtime ----------
FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production PORT=4000 CLIENT_DIST=/app/public
COPY package.json package-lock.json ./
COPY packages/game-math/package.json packages/game-math/
COPY packages/shared/package.json packages/shared/
COPY apps/server/package.json apps/server/
COPY apps/client/package.json apps/client/
RUN npm ci --omit=dev -w @neon/server --include-workspace-root=false && npm cache clean --force
COPY --from=build /app/apps/server/dist ./apps/server/dist
COPY --from=build /app/apps/client/dist ./public
EXPOSE 4000
USER node
CMD ["node", "apps/server/dist/index.js"]
