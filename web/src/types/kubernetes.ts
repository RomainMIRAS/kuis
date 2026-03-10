export interface KubeMetadata {
  name: string
  namespace?: string
  uid: string
  creationTimestamp: string
  labels?: Record<string, string>
  annotations?: Record<string, string>
  resourceVersion?: string
}

export interface KubeResource {
  apiVersion: string
  kind: string
  metadata: KubeMetadata
  spec?: Record<string, any>
  status?: Record<string, any>
}

export interface PodStatus {
  phase: 'Pending' | 'Running' | 'Succeeded' | 'Failed' | 'Unknown'
  conditions?: Array<{
    type: string
    status: string
    lastTransitionTime: string
  }>
  containerStatuses?: Array<{
    name: string
    ready: boolean
    restartCount: number
    state: Record<string, any>
    image: string
  }>
}

export interface DeploymentStatus {
  replicas?: number
  readyReplicas?: number
  availableReplicas?: number
  unavailableReplicas?: number
  updatedReplicas?: number
}

export interface WatchEvent {
  type: 'ADDED' | 'MODIFIED' | 'DELETED'
  resource: string
  namespace: string
  object: KubeResource
}

export type ResourceType =
  | 'pods'
  | 'deployments'
  | 'services'
  | 'configmaps'
  | 'secrets'
  | 'ingresses'
  | 'statefulsets'
  | 'daemonsets'
  | 'jobs'
  | 'cronjobs'
  | 'nodes'
  | 'namespaces'
  | 'events'
  | 'replicasets'

export interface ResourceGroup {
  label: string
  icon: string
  items: Array<{
    type: ResourceType
    label: string
    group: string
  }>
}

export const RESOURCE_GROUPS: ResourceGroup[] = [
  {
    label: 'Workloads',
    icon: 'box',
    items: [
      { type: 'pods', label: 'Pods', group: 'core' },
      { type: 'deployments', label: 'Deployments', group: 'apps' },
      { type: 'statefulsets', label: 'StatefulSets', group: 'apps' },
      { type: 'daemonsets', label: 'DaemonSets', group: 'apps' },
      { type: 'replicasets', label: 'ReplicaSets', group: 'apps' },
      { type: 'jobs', label: 'Jobs', group: 'batch' },
      { type: 'cronjobs', label: 'CronJobs', group: 'batch' },
    ],
  },
  {
    label: 'Network',
    icon: 'network',
    items: [
      { type: 'services', label: 'Services', group: 'core' },
      { type: 'ingresses', label: 'Ingresses', group: 'networking.k8s.io' },
    ],
  },
  {
    label: 'Config',
    icon: 'settings',
    items: [
      { type: 'configmaps', label: 'ConfigMaps', group: 'core' },
      { type: 'secrets', label: 'Secrets', group: 'core' },
    ],
  },
  {
    label: 'Cluster',
    icon: 'server',
    items: [
      { type: 'nodes', label: 'Nodes', group: 'core' },
      { type: 'namespaces', label: 'Namespaces', group: 'core' },
      { type: 'events', label: 'Events', group: 'core' },
    ],
  },
]
