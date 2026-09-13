FROM node:24-alpine AS build

WORKDIR /app

COPY package.json package-lock.json ./
COPY backend/package.json backend/package.json
COPY server/package.json server/package.json
COPY worker/package.json worker/package.json
COPY client/package.json client/package.json

RUN npm ci

COPY backend backend
COPY server server

RUN npm run build --workspace=@sitepulse/backend
RUN npm run build --workspace=server

FROM node:24-alpine AS runtime

WORKDIR /app

ENV NODE_ENV=production

COPY package.json package-lock.json ./
COPY backend/package.json backend/package.json
COPY server/package.json server/package.json
COPY worker/package.json worker/package.json
COPY client/package.json client/package.json

RUN npm ci --omit=dev

COPY --from=build /app/backend/dist backend/dist
COPY --from=build /app/server/dist server/dist

EXPOSE 3000

CMD ["node", "server/dist/server.js"]