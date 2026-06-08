# syntax=docker/dockerfile:1
#
# Build dashboard dari ROOT monorepo agar memakai pnpm-lock.yaml WORKSPACE
# (lockfile standalone apps/dashboard sudah usang). Context build = repo root,
# file = apps/dashboard/Dockerfile.

# ---- build ----
FROM node:22-alpine AS build
WORKDIR /repo
RUN npm install -g pnpm@9

# Manifest dulu (layer cache). Semua package.json workspace harus ada agar
# --frozen-lockfile cocok dengan lockfile root.
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY apps/api/package.json apps/api/package.json
COPY apps/dashboard/package.json apps/dashboard/package.json
RUN pnpm install --frozen-lockfile

# Sumber dashboard + build
COPY apps/dashboard apps/dashboard
ARG VITE_API_URL
ENV VITE_API_URL=${VITE_API_URL}
RUN pnpm --filter dashboard build

# ---- runtime ----
FROM nginx:1.27-alpine
COPY apps/dashboard/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /repo/apps/dashboard/dist /usr/share/nginx/html
EXPOSE 80
