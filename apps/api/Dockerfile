# syntax=docker/dockerfile:1

# ---- build ----
FROM golang:1.25-alpine AS build
WORKDIR /src

# Unduh dependency dulu agar layer ini ter-cache selama go.mod/go.sum tak berubah
COPY go.mod go.sum ./
RUN --mount=type=cache,target=/go/pkg/mod go mod download

# Salin sumber & build binari statis (tanpa CGO → image runtime bisa minimal).
# Tiga binary dari satu codebase (modular monolith multi-binary): school-api
# (akademik+keuangan), koperasi-api, dan sdm-api (SDM/HR penggajian).
# Lihat docs/architecture/adr-002.
COPY . .
RUN --mount=type=cache,target=/root/.cache/go-build \
    --mount=type=cache,target=/go/pkg/mod \
    CGO_ENABLED=0 GOOS=linux go build -trimpath -ldflags="-s -w" -o /out/api ./cmd/api \
 && CGO_ENABLED=0 GOOS=linux go build -trimpath -ldflags="-s -w" -o /out/koperasi ./cmd/koperasi \
 && CGO_ENABLED=0 GOOS=linux go build -trimpath -ldflags="-s -w" -o /out/sdm ./cmd/sdm

# ---- runtime ----
FROM alpine:3.20
RUN apk add --no-cache ca-certificates tzdata wget postgresql-client \
    && addgroup -S app && adduser -S -G app app
ENV TZ=Asia/Jakarta
WORKDIR /app
COPY --from=build /out/api /app/api
COPY --from=build /out/koperasi /app/koperasi
COPY --from=build /out/sdm /app/sdm
USER app
EXPOSE 8080
# Default = school-api. Binary lain dipilih via `entrypoint` di compose.
ENTRYPOINT ["/app/api"]
