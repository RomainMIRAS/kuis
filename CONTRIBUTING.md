# Contributing to KUIS

Thanks for your interest in contributing to KUIS! Here's how to get started.

## Prerequisites

- **Go 1.22+**
- **Node 22+** (with npm)
- Access to a **Kubernetes cluster** (minikube, kind, or remote)
- **Docker** (optional, for building the image)

## Local Setup

```bash
git clone https://github.com/RomainMIRAS/kuis.git
cd kuis

# Install frontend dependencies
cd web && npm install && cd ..

# Run backend + frontend with hot reload
make dev
```

Backend runs on `:8080`, frontend dev server on `:5173` (auto-proxies API calls).

## Project Structure

```
kuis/
├── cmd/kuis/           # Go entry point
├── internal/
│   ├── api/            # Fiber HTTP/WS handlers
│   ├── k8s/            # Kubernetes client, watcher, exec, logs
│   └── config/         # App configuration
├── web/
│   ├── src/
│   │   ├── components/ # React components (layout, resources, terminal, editor)
│   │   ├── pages/      # Page-level components
│   │   ├── hooks/      # React hooks (useResources, useWebSocket, etc.)
│   │   ├── services/   # API client and utilities
│   │   └── types/      # TypeScript type definitions
│   └── ...             # Vite, Tailwind, PostCSS config
├── deploy/             # Kubernetes manifests for in-cluster deployment
├── Dockerfile          # Multi-stage build
└── Makefile            # Build targets
```

## Making Changes

1. **Fork** the repo and create a branch from `main`
2. Make your changes
3. Run the build to check for errors:
   ```bash
   # Backend
   go build ./...
   go vet ./...

   # Frontend
   cd web && npm run build
   ```
4. Commit using [Conventional Commits](https://www.conventionalcommits.org/):
   - `feat(web): add node metrics panel`
   - `fix(k8s): handle nil pointer in watcher`
   - `chore: update Go dependencies`
5. Open a **Pull Request** against `main`

## Commit Convention

| Prefix | Usage |
|--------|-------|
| `feat` | New feature |
| `fix` | Bug fix |
| `chore` | Maintenance, dependencies |
| `docs` | Documentation only |
| `refactor` | Code change that neither fixes a bug nor adds a feature |
| `style` | Formatting, missing semicolons, etc. |

Scope is optional but encouraged: `feat(k8s)`, `fix(web)`, `chore(ci)`.

## Pull Requests

- Keep PRs focused — one feature or fix per PR
- Update documentation if your change affects usage
- The CI pipeline must pass (Go build, frontend build, Docker build)
- A maintainer will review and merge

## Reporting Issues

Use the GitHub issue templates:
- **Bug Report** — describe what happened vs. what you expected
- **Feature Request** — describe the use case and proposed solution

## Code of Conduct

Be respectful and constructive. We're all here to build something useful.
