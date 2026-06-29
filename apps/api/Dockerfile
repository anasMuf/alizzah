# syntax=docker/dockerfile:1

# ---- build ----
FROM golang:1.25-alpine AS build
WORKDIR /src

# Unduh dependency dulu agar layer ini ter-cache selama go.mod/go.sum tak berubah
COPY go.mod go.sum ./
RUN go mod download

# Salin sumber & build binari statis (tanpa CGO → image runtime bisa minimal).
# Dua binary dari satu codebase (modular monolith multi-binary): school-api
# (akademik+keuangan) dan koperasi-api. Lihat docs/architecture/adr-002.
COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -trimpath -ldflags="-s -w" -o /out/api ./cmd/api \
 && CGO_ENABLED=0 GOOS=linux go build -trimpath -ldflags="-s -w" -o /out/koperasi ./cmd/koperasi

# ---- runtime ----
FROM alpine:3.20
RUN apk add --no-cache ca-certificates tzdata wget \
    && addgroup -S app && adduser -S -G app app
ENV TZ=Asia/Jakarta
WORKDIR /app
COPY --from=build /out/api /app/api
COPY --from=build /out/koperasi /app/koperasi
USER app
EXPOSE 8080
# Default = school-api. Binary koperasi-api dipilih via `entrypoint` di compose.
ENTRYPOINT ["/app/api"]
