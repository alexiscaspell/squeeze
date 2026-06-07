# syntax=docker/dockerfile:1.4
FROM node:24-bookworm-slim AS builder

WORKDIR /app

RUN apt-get update \
    && apt-get install -y --no-install-recommends git ca-certificates \
    && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json .npmrc ./
COPY packages/scratch-gui/package.json packages/scratch-gui/
COPY packages/scratch-vm/package.json packages/scratch-vm/
COPY packages/scratch-blocks/package.json packages/scratch-blocks/

RUN sh -c '\
    for attempt in 1 2 3 4 5; do \
        npm ci --ignore-scripts && exit 0; \
        echo "npm ci attempt ${attempt} failed, retrying..."; \
        sleep $((attempt * 10)); \
    done; \
    exit 1'

COPY . .

ENV NODE_ENV=production
RUN npm run build

FROM nginx:alpine

COPY --from=builder /app/packages/scratch-gui/build /usr/share/nginx/html
COPY docker/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
