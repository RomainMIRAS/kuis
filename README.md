<p align="center">
  <img src="web/public/favicon.svg" width="80" height="80" alt="KUIS logo" />
</p>

<h1 align="center">KUIS</h1>

<p align="center">
  <strong>Lightweight Kubernetes Web UI — K9s for the browser.</strong>
</p>

<p align="center">
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-00e5a0?style=flat-square" alt="License" /></a>
  <img src="https://img.shields.io/badge/go-1.22+-00ADD8?style=flat-square&logo=go&logoColor=white" alt="Go" />
  <img src="https://img.shields.io/badge/react-19-61DAFB?style=flat-square&logo=react&logoColor=white" alt="React" />
  <img src="https://img.shields.io/badge/docker-~30MB-2496ED?style=flat-square&logo=docker&logoColor=white" alt="Docker" />
</p>

<p align="center">
  Single binary. Embedded frontend. Zero dependencies.<br/>
  Just <code>docker run</code> and manage your clusters from any browser.
</p>

---

## Why KUIS?

- **K9s is great, but terminal-only** — KUIS gives you the same speed in a shareable web UI
- **Kubernetes Dashboard is heavy** — KUIS is a single ~30MB binary with everything embedded
- **Lens is a desktop app** — KUIS runs anywhere Docker does, including inside your cluster
- **Multi-cluster native** — Drop kubeconfigs in a folder, switch between clusters in one click

## Quick Start

```bash
docker run -p 8080:8080 -v ~/.kube:/home/nonroot/.kube:ro ghcr.io/romainmiras/kuis
```

Open [http://localhost:8080](http://localhost:8080) — that's it.

<details>
<summary><strong>Build from source</strong></summary>

```bash
git clone https://github.com/RomainMIRAS/kuis.git
cd kuis
make build
./kuis
```

</details>

<details>
<summary><strong>Deploy in-cluster</strong></summary>

```bash
kubectl apply -f deploy/
```

Creates a namespace `kuis`, a ServiceAccount with read/write RBAC, a Deployment, and a Service on port 8080.

</details>

<!-- ## Screenshots

Screenshots will be added here once the UI is running against a live cluster.

TODO: Add screenshots/GIFs showing:
- Cluster overview dashboard
- Resource table with real-time updates
- Pod logs streaming
- Pod exec terminal
- YAML editor
- Multi-kubeconfig switching
-->

## Features

| Feature | Description |
|---------|-------------|
| **Resource Browser** | Interactive tables for Pods, Deployments, Services, ConfigMaps, Secrets, Ingresses, StatefulSets, DaemonSets, Jobs, CronJobs, Nodes |
| **Real-time Updates** | WebSocket-powered live monitoring via Kubernetes watch API |
| **Pod Logs** | Streaming log viewer with xterm.js terminal emulation |
| **Pod Exec** | Interactive shell into containers directly from the browser |
| **YAML Editor** | View and edit manifests with Monaco Editor (syntax highlighting, validation) |
| **Actions** | Scale deployments, rollout restarts, delete resources with confirmation |
| **Multi-Kubeconfig** | Auto-discovers configs from `~/.kube/configs/`, switch clusters instantly |
| **Namespace & Context** | Quick selectors in the header, searchable dropdowns |
| **Search & Filter** | Filter any resource table by name in real-time |

## Multi-Kubeconfig

KUIS automatically discovers kubeconfig files from two sources:

1. **Default** — `~/.kube/config` (or `$KUBECONFIG`)
2. **Config directory** — All files in `~/.kube/configs/` (or `$KUIS_KUBECONFIG_DIR`)

```
~/.kube/
├── config              → "default"
└── configs/
    ├── production      → "production"
    ├── staging.yaml    → "staging"
    └── dev.conf        → "dev"
```

Switch from the **Config** dropdown in the header. The **Rescan** button picks up new files without restart.

## Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `KUIS_PORT` | `8080` | Server port |
| `KUBECONFIG` | `~/.kube/config` | Default kubeconfig path |
| `KUIS_KUBECONFIG_DIR` | `~/.kube/configs` | Directory with extra kubeconfigs |
| `KUIS_DEV` | `false` | Enable dev mode (frontend proxy) |

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
│  Go Backend (single binary)                  │
│  ┌─────────┐ ┌────────┐ ┌────────────────┐ │
│  │REST API │ │  WS    │ │   Embedded     │ │
│  │handlers │ │  hub   │ │   Frontend     │ │
│  └────┬────┘ └───┬────┘ └────────────────┘ │
│       └──────────┼──────────────────────────│
│            client-go                         │
└──────────────────┼──────────────────────────┘
                   │
           Kubernetes API
```

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | Go 1.22, Fiber v2, client-go |
| Frontend | React 19, TypeScript, Vite, Tailwind CSS |
| Terminal | xterm.js |
| Editor | Monaco Editor |
| Tables | TanStack Table |
| Docker | Multi-stage build, distroless (~30MB) |

## Development

```bash
# Prerequisites: Go 1.22+, Node 22+, access to a K8s cluster

cd web && npm install && cd ..
make dev
```

Backend on `:8080`, frontend dev server on `:5173` with API proxy.

See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

## License

[MIT](LICENSE) — Romain MIRAS
