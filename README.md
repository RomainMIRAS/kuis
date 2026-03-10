# KUIS - Kubernetes UI Service

A lightweight, professional web UI for Kubernetes cluster management. Inspired by K9s, built for the browser.

## Features

- **Resource Browser** — Interactive tables for Pods, Deployments, Services, ConfigMaps, Secrets, Ingresses, StatefulSets, DaemonSets, Jobs, CronJobs, Nodes
- **Real-time Updates** — WebSocket-powered live resource monitoring via Kubernetes informers
- **Pod Logs** — Streaming log viewer with terminal emulation (xterm.js)
- **Pod Exec** — Interactive shell into containers directly from the browser
- **YAML Editor** — View and edit resource manifests with Monaco Editor
- **Actions** — Scale deployments, rollout restarts, delete resources
- **Multi-Kubeconfig** — Load all kubeconfig files from `~/.kube/configs/`, switch between clusters instantly
- **Namespace/Context Switching** — Quick selectors in the header
- **Search & Filter** — Filter resources by name across all tables

## Quick Start

### Docker

```bash
docker build -t kuis .
docker run -p 8080:8080 -v ~/.kube:/home/nonroot/.kube:ro kuis
```

Then open [http://localhost:8080](http://localhost:8080).

### In-Cluster Deployment

Deploy with a ServiceAccount that has the necessary RBAC permissions:

```bash
kubectl apply -f deploy/
```

### Development

```bash
# Install frontend dependencies
cd web && npm install && cd ..

# Run backend + frontend with hot reload
make dev
```

Backend runs on `:8080`, frontend dev server on `:5173` (proxies API calls to backend).

## Architecture

```
┌─────────────────────────────────────────────┐
│  Browser                                     │
│  ┌─────────┐ ┌────────┐ ┌────────────────┐ │
│  │ React   │ │xterm.js│ │ Monaco Editor  │ │
│  │ Tables  │ │Terminal│ │ YAML           │ │
│  └────┬────┘ └───┬────┘ └───────┬────────┘ │
└───────┼──────────┼───────────────┼──────────┘
        │ HTTP/WS  │ WS           │ HTTP
┌───────┼──────────┼───────────────┼──────────┐
│  Go Backend (Fiber v2)                       │
│  ┌─────────┐ ┌────────┐ ┌────────────────┐ │
│  │REST API │ │  WS    │ │   Embedded     │ │
│  │handlers │ │  hub   │ │   Frontend     │ │
│  └────┬────┘ └───┬────┘ └────────────────┘ │
│       └──────────┼───────────────────────── │
│            client-go                         │
└──────────────────┼──────────────────────────┘
                   │
           Kubernetes API
```

## Tech Stack

| Layer    | Technology                          |
|----------|-------------------------------------|
| Backend  | Go 1.22, Fiber v2, client-go        |
| Frontend | React 19, TypeScript, Vite, Tailwind CSS |
| Terminal | xterm.js                            |
| Editor   | Monaco Editor                       |
| Tables   | TanStack Table                      |
| Docker   | Multi-stage, distroless (~30MB)     |

## Multi-Kubeconfig

KUIS automatically discovers kubeconfig files from two sources:

1. **Default kubeconfig** — `~/.kube/config` (or `$KUBECONFIG`)
2. **Config directory** — All files in `~/.kube/configs/` (or `$KUIS_KUBECONFIG_DIR`)

```
~/.kube/
├── config            → listed as "default"
└── configs/
    ├── production    → listed as "production"
    ├── staging.yaml  → listed as "staging"
    └── dev.conf      → listed as "dev"
```

Switch between kubeconfigs from the **Config** dropdown in the header. Each kubeconfig file's name (without extension) becomes its display name.

The **Rescan** button (refresh icon) re-reads the directory to pick up newly added files without restarting KUIS.

For Docker, mount the configs directory:

```bash
docker run -p 8080:8080 \
  -v ~/.kube:/home/nonroot/.kube:ro \
  kuis
```

## Configuration

| Variable              | Default                 | Description                       |
|----------------------|-------------------------|-----------------------------------|
| `KUIS_PORT`          | `8080`                  | Server port                       |
| `KUBECONFIG`         | `~/.kube/config`        | Default kubeconfig path           |
| `KUIS_KUBECONFIG_DIR`| `~/.kube/configs`       | Directory with extra kubeconfigs  |
| `KUIS_DEV`           | `false`                 | Enable dev mode                   |
| `KUIS_DEV_PROXY`     | `http://localhost:5173` | Frontend dev server URL           |

## License

MIT
