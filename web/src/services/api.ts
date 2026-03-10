const BASE = ''

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.error || `HTTP ${res.status}`)
  }
  return res.json()
}

async function requestText(path: string): Promise<string> {
  const res = await fetch(`${BASE}${path}`)
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}`)
  }
  return res.text()
}

export const api = {
  listKubeconfigs: () =>
    request<{ configs: string[]; active: string }>('/api/kubeconfigs'),

  switchKubeconfig: (name: string) =>
    request<{ status: string; active: string }>(
      `/api/kubeconfigs/${encodeURIComponent(name)}`,
      { method: 'PUT' }
    ),

  rescanKubeconfigs: () =>
    request<{ configs: string[]; active: string }>('/api/kubeconfigs/rescan', { method: 'POST' }),

  listContexts: () =>
    request<{ contexts: string[]; current: string }>('/api/contexts'),

  switchContext: (name: string) =>
    request(`/api/contexts/${encodeURIComponent(name)}`, { method: 'PUT' }),

  listNamespaces: () =>
    request<{ namespaces: string[] }>('/api/namespaces'),

  listResources: (group: string, resource: string, namespace?: string) => {
    const params = namespace ? `?namespace=${encodeURIComponent(namespace)}` : ''
    return request<{ items: any[]; count: number }>(
      `/api/resources/${encodeURIComponent(group)}/${encodeURIComponent(resource)}${params}`
    )
  },

  getResource: (group: string, resource: string, namespace: string, name: string) =>
    request<any>(
      `/api/resources/${encodeURIComponent(group)}/${encodeURIComponent(resource)}/${encodeURIComponent(namespace)}/${encodeURIComponent(name)}`
    ),

  getResourceYAML: (group: string, resource: string, namespace: string, name: string) =>
    requestText(
      `/api/resources/${encodeURIComponent(group)}/${encodeURIComponent(resource)}/${encodeURIComponent(namespace)}/${encodeURIComponent(name)}/yaml`
    ),

  updateResource: (group: string, resource: string, namespace: string, name: string, yaml: string) =>
    request(
      `/api/resources/${encodeURIComponent(group)}/${encodeURIComponent(resource)}/${encodeURIComponent(namespace)}/${encodeURIComponent(name)}`,
      { method: 'PUT', body: yaml, headers: { 'Content-Type': 'text/yaml' } }
    ),

  deleteResource: (group: string, resource: string, namespace: string, name: string) =>
    request(
      `/api/resources/${encodeURIComponent(group)}/${encodeURIComponent(resource)}/${encodeURIComponent(namespace)}/${encodeURIComponent(name)}`,
      { method: 'DELETE' }
    ),

  scaleDeployment: (namespace: string, name: string, replicas: number) =>
    request(`/api/resources/apps/deployments/${encodeURIComponent(namespace)}/${encodeURIComponent(name)}/scale`, {
      method: 'POST',
      body: JSON.stringify({ replicas }),
    }),

  restartDeployment: (namespace: string, name: string) =>
    request(`/api/resources/apps/deployments/${encodeURIComponent(namespace)}/${encodeURIComponent(name)}/restart`, {
      method: 'POST',
    }),

  listContainers: (group: string, namespace: string, name: string) =>
    request<{ containers: string[] }>(
      `/api/resources/${encodeURIComponent(group)}/pods/${encodeURIComponent(namespace)}/${encodeURIComponent(name)}/containers`
    ),
}

export function wsUrl(path: string): string {
  const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
  return `${proto}//${window.location.host}${path}`
}
