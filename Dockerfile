# syntax=docker/dockerfile:1

# ---- build ----------------------------------------------------------------
FROM node:22-alpine AS build
WORKDIR /app

# Copy manifests first so `npm ci` is cached until dependencies actually change.
COPY package.json package-lock.json ./
RUN npm ci

COPY . .
# Runs `astro check && astro build` — a type error fails the image build.
RUN npm run build

# ---- runtime --------------------------------------------------------------
FROM nginx:alpine AS runtime

# Listen on 8080 so the container can run as a non-root user; the stock
# nginx image binds 80, which requires root.
COPY docker/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s \
	CMD wget -q --spider http://127.0.0.1:8080/ || exit 1
