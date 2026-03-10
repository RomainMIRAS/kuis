# Stage 1: Build frontend
FROM node:22-alpine AS frontend
WORKDIR /app/web
COPY web/package*.json ./
RUN npm ci --no-audit --no-fund
COPY web/ ./
RUN npm run build

# Stage 2: Build backend
FROM golang:1.22-alpine AS backend
RUN apk add --no-cache git
WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download
COPY cmd/ cmd/
COPY internal/ internal/
COPY --from=frontend /app/web/dist ./internal/api/dist
RUN CGO_ENABLED=0 GOOS=linux go build -ldflags="-s -w" -o kuis ./cmd/kuis

# Stage 3: Final minimal image
FROM gcr.io/distroless/static-debian12:nonroot
COPY --from=backend /app/kuis /kuis
EXPOSE 8080
USER nonroot:nonroot
ENTRYPOINT ["/kuis"]
