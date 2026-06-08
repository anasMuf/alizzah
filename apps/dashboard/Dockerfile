# syntax=docker/dockerfile:1

# ---- build ----
FROM node:22-alpine AS build
WORKDIR /app
RUN npm install -g pnpm@9

# Install dependency dulu (cache selama lockfile tak berubah)
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

# Salin sumber & build
COPY . .
# PENTING: VITE_API_URL di-"bake" saat build (Vite menanam nilainya ke bundle).
# Nilai produksi dikirim CI lewat --build-arg.
ARG VITE_API_URL
ENV VITE_API_URL=${VITE_API_URL}
RUN pnpm build

# ---- runtime ----
FROM nginx:1.27-alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
