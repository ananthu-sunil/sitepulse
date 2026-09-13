FROM node:24-alpine AS build

WORKDIR /app

COPY package.json package-lock.json ./
COPY client/package.json client/package.json
COPY backend/package.json backend/package.json
COPY server/package.json server/package.json
COPY worker/package.json worker/package.json

RUN npm ci

COPY client client

RUN npm run build --workspace=client

FROM nginx:alpine AS runtime

COPY --from=build /app/client/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]