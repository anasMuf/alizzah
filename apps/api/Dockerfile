# syntax=docker/dockerfile:1

# ---- build ----
FROM golang:1.25-alpine AS build
WORKDIR /src

# Unduh dependency dulu agar layer ini ter-cache selama go.mod/go.sum tak berubah
COPY go.mod go.sum ./
RUN go mod download

# Salin sumber & build binari statis (tanpa CGO → image runtime bisa minimal)
COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -trimpath -ldflags="-s -w" -o /out/api .

# ---- runtime ----
FROM alpine:3.20
RUN apk add --no-cache ca-certificates tzdata wget \
    && addgroup -S app && adduser -S -G app app
ENV TZ=Asia/Jakarta
WORKDIR /app
COPY --from=build /out/api /app/api
USER app
EXPOSE 8080
ENTRYPOINT ["/app/api"]
