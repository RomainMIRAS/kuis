.PHONY: dev dev-backend dev-frontend build build-frontend build-backend docker-build docker-run clean

BINARY := kuis
IMAGE := kuis
TAG := latest

# Development: run backend and frontend with hot reload
dev:
	@echo "Starting KUIS in dev mode..."
	@make -j2 dev-backend dev-frontend

dev-backend:
	KUIS_DEV=true KUIS_PORT=8080 go run ./cmd/kuis

dev-frontend:
	cd web && npm run dev

# Build frontend
build-frontend:
	cd web && npm ci && npm run build

# Build backend (requires frontend built first)
build-backend: build-frontend
	@rm -rf internal/api/dist
	@cp -r web/dist internal/api/dist
	CGO_ENABLED=0 go build -ldflags="-s -w" -o $(BINARY) ./cmd/kuis

# Full build
build: build-backend
	@echo "Built $(BINARY)"
	@ls -lh $(BINARY)

# Docker
docker-build:
	docker build -t $(IMAGE):$(TAG) .

docker-run:
	docker run --rm -p 8080:8080 \
		-v $$HOME/.kube:/home/nonroot/.kube:ro \
		$(IMAGE):$(TAG)

# Clean
clean:
	rm -f $(BINARY)
	rm -rf web/dist web/node_modules
	rm -rf internal/api/dist
