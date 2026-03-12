import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import {
  ArrowLeft,
  FileText,
  ScrollText,
  Terminal,
  Clock,
  Scale,
  RotateCcw,
  Trash2,
  Save,
  Loader2,
  ChevronRight,
  AlertTriangle,
  Info,
} from 'lucide-react'
import { api, type ResourceEvent } from '@/services/api'
import type { KubeResource } from '@/types/kubernetes'
import { StatusBadge, getResourceStatus } from '@/components/resources/StatusBadge'
import { timeAgo, formatLabels } from '@/services/utils'
import { YamlEditor } from '@/components/editor/YamlEditor'
import { TerminalPanel } from '@/components/terminal/TerminalPanel'

type Tab = 'overview' | 'yaml' | 'logs' | 'exec' | 'events'

export function ResourceViewPage() {
  const { group = 'core', resource = 'pods', namespace = '', name = '' } = useParams()
  const navigate = useNavigate()

  const [data, setData] = useState<KubeResource | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [tab, setTab] = useState<Tab>('overview')

  const [yamlContent, setYamlContent] = useState('')
  const [yamlLoading, setYamlLoading] = useState(false)
  const [saving, setSaving] = useState(false)

  const [events, setEvents] = useState<ResourceEvent[]>([])
  const [eventsLoading, setEventsLoading] = useState(false)

  const [containers, setContainers] = useState<string[]>([])
  const [selectedContainer, setSelectedContainer] = useState('')

  const [scaleInput, setScaleInput] = useState('')
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  const isPod = resource === 'pods'
  const isDeployment = resource === 'deployments'

  const fetchResource = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const obj = await api.getResource(group, resource, namespace, name)
      setData(obj as KubeResource)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [group, resource, namespace, name])

  useEffect(() => { fetchResource() }, [fetchResource])

  useEffect(() => {
    if (isPod && namespace && name) {
      api.listContainers(group, namespace, name)
        .then(d => {
          setContainers(d.containers || [])
          if (d.containers?.length) setSelectedContainer(d.containers[0])
        })
        .catch(() => {})
    }
  }, [isPod, namespace, name, group])

  useEffect(() => {
    if (tab === 'yaml') {
      setYamlLoading(true)
      api.getResourceYAML(group, resource, namespace, name)
        .then(setYamlContent)
        .catch(() => setYamlContent('# Error loading YAML'))
        .finally(() => setYamlLoading(false))
    }
  }, [tab, group, resource, namespace, name])

  useEffect(() => {
    if (tab === 'events') {
      setEventsLoading(true)
      api.getResourceEvents(group, resource, namespace, name)
        .then(d => setEvents(d.events || []))
        .catch(() => setEvents([]))
        .finally(() => setEventsLoading(false))
    }
  }, [tab, group, resource, namespace, name])

  const handleSaveYaml = async () => {
    setSaving(true)
    try {
      await api.updateResource(group, resource, namespace, name, yamlContent)
      fetchResource()
    } catch (err: any) {
      alert(`Error: ${err.message}`)
    } finally {
      setSaving(false)
    }
  }

  const handleScale = async () => {
    const replicas = parseInt(scaleInput, 10)
    if (isNaN(replicas) || replicas < 0) return
    try {
      await api.scaleDeployment(namespace, name, replicas)
      fetchResource()
      setScaleInput('')
    } catch (err: any) {
      alert(`Error: ${err.message}`)
    }
  }

  const handleRestart = async () => {
    try {
      await api.restartDeployment(namespace, name)
      fetchResource()
    } catch (err: any) {
      alert(`Error: ${err.message}`)
    }
  }

  const handleDelete = async () => {
    try {
      await api.deleteResource(group, resource, namespace, name)
      navigate(`/resources/${group}/${resource}`)
    } catch (err: any) {
      alert(`Error: ${err.message}`)
    }
  }

  const resourceLabel = resource.charAt(0).toUpperCase() + resource.slice(1)

  const tabs: Array<{ id: Tab; label: string; icon: React.ComponentType<any>; show: boolean }> = [
    { id: 'overview', label: 'Overview', icon: FileText, show: true },
    { id: 'yaml', label: 'YAML', icon: ScrollText, show: true },
    { id: 'logs', label: 'Logs', icon: Terminal, show: isPod },
    { id: 'exec', label: 'Exec', icon: Terminal, show: isPod },
    { id: 'events', label: 'Events', icon: Clock, show: true },
  ]

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-6 h-6 text-kuis-accent animate-spin" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3">
        <p className="font-mono text-sm text-kuis-danger">{error}</p>
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono text-kuis-text-dim
            border border-kuis-border rounded hover:bg-kuis-hover transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Go back
        </button>
      </div>
    )
  }

  if (!data) return null

  const status = getResourceStatus(data)

  return (
    <div className="flex flex-col h-full animate-fade-in">
      {/* Breadcrumb */}
      <div className="flex items-center gap-1.5 px-4 py-2 border-b border-kuis-border bg-kuis-surface text-xs font-mono">
        <Link
          to={`/resources/${group}/${resource}`}
          className="text-kuis-muted hover:text-kuis-text-dim transition-colors"
        >
          {resourceLabel}
        </Link>
        {namespace && (
          <>
            <ChevronRight className="w-3 h-3 text-kuis-muted/50" />
            <span className="text-kuis-muted">{namespace}</span>
          </>
        )}
        <ChevronRight className="w-3 h-3 text-kuis-muted/50" />
        <span className="text-kuis-text">{name}</span>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-kuis-border bg-kuis-surface">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(`/resources/${group}/${resource}`)}
            className="p-1.5 rounded hover:bg-kuis-hover text-kuis-muted hover:text-kuis-text transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h1 className="font-mono font-semibold text-kuis-text">{name}</h1>
            <div className="flex items-center gap-2 mt-0.5">
              {namespace && (
                <span className="text-[11px] font-mono text-kuis-muted px-1.5 py-0.5 bg-kuis-hover rounded">
                  {namespace}
                </span>
              )}
              {status && <StatusBadge status={status} />}
              <span className="text-[11px] font-mono text-kuis-muted">
                {timeAgo(data.metadata.creationTimestamp)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-kuis-border bg-kuis-surface">
        {tabs.filter(t => t.show).map(t => {
          const Icon = t.icon
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-1.5 px-5 py-2.5 text-xs font-mono transition-colors
                border-b-2 -mb-px
                ${tab === t.id
                  ? 'text-kuis-accent border-kuis-accent'
                  : 'text-kuis-muted border-transparent hover:text-kuis-text-dim'
                }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {t.label}
            </button>
          )
        })}
      </div>

      {/* Tab Content */}
      <div className="flex-1 min-h-0 overflow-auto">
        {tab === 'overview' && <OverviewTab data={data} resource={resource} />}

        {tab === 'overview' && (
          <div className="px-6 pb-6 space-y-4">
            {isDeployment && (
              <Section title="Actions">
                <div className="flex items-center gap-2">
                  <Scale className="w-4 h-4 text-kuis-muted" />
                  <input
                    type="number"
                    min="0"
                    value={scaleInput}
                    onChange={e => setScaleInput(e.target.value)}
                    placeholder={`Replicas (current: ${data.spec?.replicas || 0})`}
                    className="bg-kuis-surface border border-kuis-border rounded px-2 py-1 text-xs font-mono
                      text-kuis-text outline-none focus:border-kuis-accent/50 w-52"
                  />
                  <button
                    onClick={handleScale}
                    disabled={!scaleInput}
                    className="px-3 py-1 text-xs font-mono bg-kuis-accent/10 text-kuis-accent
                      rounded hover:bg-kuis-accent/20 transition-colors disabled:opacity-50"
                  >
                    Scale
                  </button>
                </div>
                <div className="flex items-center gap-2 mt-2">
                  <button
                    onClick={handleRestart}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono
                      bg-kuis-warning/10 text-kuis-warning rounded hover:bg-kuis-warning/20 transition-colors"
                  >
                    <RotateCcw className="w-3.5 h-3.5" /> Restart
                  </button>
                </div>
              </Section>
            )}

            <Section title="Danger Zone">
              {!showDeleteConfirm ? (
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono
                    bg-kuis-danger/10 text-kuis-danger rounded hover:bg-kuis-danger/20 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Delete Resource
                </button>
              ) : (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-kuis-danger font-mono">Confirm delete?</span>
                  <button
                    onClick={handleDelete}
                    className="px-3 py-1 text-xs font-mono bg-kuis-danger text-white rounded
                      hover:bg-kuis-danger/80 transition-colors"
                  >
                    Yes, delete
                  </button>
                  <button
                    onClick={() => setShowDeleteConfirm(false)}
                    className="px-3 py-1 text-xs font-mono bg-kuis-surface text-kuis-text-dim
                      border border-kuis-border rounded hover:bg-kuis-hover transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              )}
            </Section>
          </div>
        )}

        {tab === 'yaml' && (
          <div className="flex flex-col h-full">
            <div className="flex items-center justify-end px-4 py-2 border-b border-kuis-border">
              <button
                onClick={handleSaveYaml}
                disabled={saving || yamlLoading}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono
                  bg-kuis-accent/10 text-kuis-accent rounded hover:bg-kuis-accent/20
                  transition-colors disabled:opacity-50"
              >
                {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                Apply
              </button>
            </div>
            <div className="flex-1 min-h-0">
              {yamlLoading ? (
                <div className="flex items-center justify-center h-48">
                  <Loader2 className="w-5 h-5 text-kuis-accent animate-spin" />
                </div>
              ) : (
                <YamlEditor value={yamlContent} onChange={setYamlContent} />
              )}
            </div>
          </div>
        )}

        {tab === 'logs' && isPod && (
          <div className="flex flex-col h-full">
            {containers.length > 1 && (
              <ContainerSelector
                containers={containers}
                selected={selectedContainer}
                onSelect={setSelectedContainer}
              />
            )}
            <div className="flex-1 min-h-0">
              <TerminalPanel mode="logs" namespace={namespace} pod={name} container={selectedContainer} />
            </div>
          </div>
        )}

        {tab === 'exec' && isPod && (
          <div className="flex flex-col h-full">
            {containers.length > 1 && (
              <ContainerSelector
                containers={containers}
                selected={selectedContainer}
                onSelect={setSelectedContainer}
              />
            )}
            <div className="flex-1 min-h-0">
              <TerminalPanel mode="exec" namespace={namespace} pod={name} container={selectedContainer} />
            </div>
          </div>
        )}

        {tab === 'events' && (
          <EventsTab events={events} loading={eventsLoading} />
        )}
      </div>
    </div>
  )
}

// --- Sub-components ---

function ContainerSelector({
  containers, selected, onSelect,
}: {
  containers: string[]
  selected: string
  onSelect: (c: string) => void
}) {
  return (
    <div className="flex items-center gap-2 px-4 py-2 border-b border-kuis-border">
      <span className="text-xs font-mono text-kuis-muted">Container:</span>
      {containers.map(c => (
        <button
          key={c}
          onClick={() => onSelect(c)}
          className={`px-2 py-0.5 text-xs font-mono rounded transition-colors
            ${c === selected
              ? 'bg-kuis-accent/10 text-kuis-accent'
              : 'text-kuis-text-dim hover:text-kuis-text hover:bg-kuis-hover'
            }`}
        >
          {c}
        </button>
      ))}
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border border-kuis-border rounded-lg overflow-hidden">
      <div className="px-4 py-2 bg-kuis-surface border-b border-kuis-border">
        <h3 className="text-xs font-mono uppercase tracking-wider text-kuis-muted">{title}</h3>
      </div>
      <div className="p-4 space-y-2">{children}</div>
    </div>
  )
}

function KVRow({ label, value, mono = true }: { label: string; value: React.ReactNode; mono?: boolean }) {
  return (
    <div className="flex items-start gap-4">
      <span className="text-xs font-mono text-kuis-muted w-32 shrink-0">{label}</span>
      <span className={`text-xs text-kuis-text-dim break-all ${mono ? 'font-mono' : ''}`}>{value}</span>
    </div>
  )
}

function OverviewTab({ data, resource }: { data: KubeResource; resource: string }) {
  const labels = data.metadata.labels || {}
  const annotations = data.metadata.annotations || {}
  const conditions: any[] = data.status?.conditions || []
  const ownerRefs: any[] = (data.metadata as any).ownerReferences || []
  const finalizers: string[] = (data.metadata as any).finalizers || []

  const isPod = resource === 'pods'
  const isDeployment = resource === 'deployments'
  const isService = resource === 'services'

  return (
    <div className="p-6 space-y-4">
      {/* Metadata */}
      <Section title="Metadata">
        <KVRow label="Name" value={data.metadata.name} />
        {data.metadata.namespace && <KVRow label="Namespace" value={data.metadata.namespace} />}
        <KVRow label="UID" value={data.metadata.uid} />
        <KVRow label="Created" value={timeAgo(data.metadata.creationTimestamp)} />
        {data.metadata.resourceVersion && (
          <KVRow label="Resource Ver." value={data.metadata.resourceVersion} />
        )}
      </Section>

      {/* Labels */}
      {Object.keys(labels).length > 0 && (
        <Section title="Labels">
          <div className="space-y-1">
            {Object.entries(labels).map(([k, v]) => (
              <div key={k} className="flex items-center gap-2">
                <span className="text-[11px] font-mono text-kuis-accent bg-kuis-accent/5 px-1.5 py-0.5 rounded">{k}</span>
                <span className="text-[11px] font-mono text-kuis-text-dim">{v}</span>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* Annotations */}
      {Object.keys(annotations).length > 0 && (
        <Section title="Annotations">
          <div className="space-y-1">
            {Object.entries(annotations).map(([k, v]) => (
              <div key={k} className="flex items-start gap-2">
                <span className="text-[11px] font-mono text-kuis-cyan bg-kuis-cyan/5 px-1.5 py-0.5 rounded shrink-0">{k}</span>
                <span className="text-[11px] font-mono text-kuis-text-dim break-all">{String(v)}</span>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* Owner References */}
      {ownerRefs.length > 0 && (
        <Section title="Owner References">
          {ownerRefs.map((ref: any, i: number) => (
            <div key={i} className="flex items-center gap-3 text-xs font-mono">
              <span className="text-kuis-muted">{ref.kind}</span>
              <span className="text-kuis-text-dim">{ref.name}</span>
              {ref.controller && (
                <span className="text-[10px] text-kuis-accent bg-kuis-accent/10 px-1.5 py-0.5 rounded">controller</span>
              )}
            </div>
          ))}
        </Section>
      )}

      {/* Finalizers */}
      {finalizers.length > 0 && (
        <Section title="Finalizers">
          {finalizers.map((f, i) => (
            <span key={i} className="inline-block text-[11px] font-mono text-kuis-warning bg-kuis-warning/5 px-1.5 py-0.5 rounded mr-2 mb-1">
              {f}
            </span>
          ))}
        </Section>
      )}

      {/* Pod Spec */}
      {isPod && data.spec?.containers && (
        <Section title="Containers (Spec)">
          {(data.spec.containers as any[]).map((c: any) => (
            <div key={c.name} className="border border-kuis-border/50 rounded p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-semibold text-kuis-text">{c.name}</span>
                <span className="text-[11px] font-mono text-kuis-muted">{c.image}</span>
              </div>
              {c.ports?.length > 0 && (
                <div className="flex items-center gap-1 flex-wrap">
                  <span className="text-[11px] font-mono text-kuis-muted">Ports:</span>
                  {c.ports.map((p: any, i: number) => (
                    <span key={i} className="text-[11px] font-mono text-kuis-cyan bg-kuis-cyan/5 px-1.5 py-0.5 rounded">
                      {p.containerPort}/{p.protocol || 'TCP'}
                    </span>
                  ))}
                </div>
              )}
              {c.resources && (
                <div className="text-[11px] font-mono text-kuis-text-dim space-y-0.5">
                  {c.resources.requests && (
                    <div>Requests: {Object.entries(c.resources.requests).map(([k, v]) => `${k}=${v}`).join(', ')}</div>
                  )}
                  {c.resources.limits && (
                    <div>Limits: {Object.entries(c.resources.limits).map(([k, v]) => `${k}=${v}`).join(', ')}</div>
                  )}
                </div>
              )}
              {c.volumeMounts?.length > 0 && (
                <div className="text-[11px] font-mono text-kuis-text-dim">
                  Mounts: {c.volumeMounts.map((m: any) => `${m.name}:${m.mountPath}`).join(', ')}
                </div>
              )}
            </div>
          ))}
        </Section>
      )}

      {/* Pod Container Statuses */}
      {isPod && data.status?.containerStatuses && (
        <Section title="Container Statuses">
          {(data.status.containerStatuses as any[]).map((cs: any) => {
            const stateKey = Object.keys(cs.state || {})[0] || 'unknown'
            return (
              <div key={cs.name} className="flex items-center justify-between py-1.5 border-b border-kuis-border/30 last:border-0">
                <div className="flex items-center gap-2">
                  <StatusBadge status={cs.ready ? 'Running' : 'NotReady'} />
                  <span className="font-mono text-xs text-kuis-text">{cs.name}</span>
                </div>
                <div className="flex items-center gap-3 text-[11px] font-mono text-kuis-muted">
                  <span>{cs.image}</span>
                  <span>state: {stateKey}</span>
                  <span className={cs.restartCount > 0 ? 'text-kuis-warning' : ''}>
                    restarts: {cs.restartCount}
                  </span>
                </div>
              </div>
            )
          })}
        </Section>
      )}

      {/* Deployment Spec */}
      {isDeployment && (
        <Section title="Deployment Spec">
          <KVRow label="Replicas" value={`${data.status?.readyReplicas || 0} / ${data.spec?.replicas || 0}`} />
          {data.spec?.strategy && (
            <KVRow label="Strategy" value={data.spec.strategy.type || '-'} />
          )}
          {data.spec?.selector?.matchLabels && (
            <KVRow label="Selector" value={formatLabels(data.spec.selector.matchLabels)} />
          )}
        </Section>
      )}

      {/* Service Spec */}
      {isService && (
        <Section title="Service Spec">
          <KVRow label="Type" value={data.spec?.type || '-'} />
          <KVRow label="Cluster IP" value={data.spec?.clusterIP || '-'} />
          {data.spec?.selector && (
            <KVRow label="Selector" value={formatLabels(data.spec.selector)} />
          )}
          {data.spec?.ports?.length > 0 && (
            <div className="mt-2">
              <table className="w-full text-xs font-mono">
                <thead>
                  <tr className="text-kuis-muted text-left">
                    <th className="pb-1 pr-4">Name</th>
                    <th className="pb-1 pr-4">Port</th>
                    <th className="pb-1 pr-4">Target</th>
                    <th className="pb-1">Protocol</th>
                  </tr>
                </thead>
                <tbody className="text-kuis-text-dim">
                  {(data.spec!.ports as any[]).map((p: any, i: number) => (
                    <tr key={i}>
                      <td className="py-0.5 pr-4">{p.name || '-'}</td>
                      <td className="py-0.5 pr-4">{p.port}</td>
                      <td className="py-0.5 pr-4">{p.targetPort}</td>
                      <td className="py-0.5">{p.protocol || 'TCP'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Section>
      )}

      {/* Conditions */}
      {conditions.length > 0 && (
        <Section title="Conditions">
          <table className="w-full text-xs font-mono">
            <thead>
              <tr className="text-kuis-muted text-left">
                <th className="pb-1.5 pr-4">Type</th>
                <th className="pb-1.5 pr-4">Status</th>
                <th className="pb-1.5 pr-4">Reason</th>
                <th className="pb-1.5 pr-4">Last Transition</th>
                <th className="pb-1.5">Message</th>
              </tr>
            </thead>
            <tbody className="text-kuis-text-dim">
              {conditions.map((c: any, i: number) => (
                <tr key={i} className="border-t border-kuis-border/30">
                  <td className="py-1.5 pr-4 text-kuis-text">{c.type}</td>
                  <td className="py-1.5 pr-4">
                    <span className={c.status === 'True' ? 'text-kuis-accent' : c.status === 'False' ? 'text-kuis-danger' : 'text-kuis-warning'}>
                      {c.status}
                    </span>
                  </td>
                  <td className="py-1.5 pr-4">{c.reason || '-'}</td>
                  <td className="py-1.5 pr-4">{timeAgo(c.lastTransitionTime)}</td>
                  <td className="py-1.5 text-kuis-muted max-w-xs truncate">{c.message || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Section>
      )}
    </div>
  )
}

function EventsTab({ events, loading }: { events: ResourceEvent[]; loading: boolean }) {
  if (loading) {
    return (
      <div className="flex items-center justify-center h-48">
        <Loader2 className="w-5 h-5 text-kuis-accent animate-spin" />
      </div>
    )
  }

  if (events.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-48 text-kuis-muted">
        <Info className="w-5 h-5 mb-2" />
        <span className="text-sm font-mono">No events found</span>
      </div>
    )
  }

  return (
    <div className="p-4">
      <table className="w-full text-xs font-mono">
        <thead>
          <tr className="text-kuis-muted text-left border-b border-kuis-border">
            <th className="pb-2 pr-4 w-16">Type</th>
            <th className="pb-2 pr-4 w-32">Reason</th>
            <th className="pb-2 pr-4 w-20">Age</th>
            <th className="pb-2 pr-4 w-40">Source</th>
            <th className="pb-2">Message</th>
            <th className="pb-2 w-12 text-right">Count</th>
          </tr>
        </thead>
        <tbody>
          {events.map((e, i) => (
            <tr key={i} className="border-b border-kuis-border/30 hover:bg-kuis-hover/50 transition-colors">
              <td className="py-2 pr-4">
                {e.type === 'Warning' ? (
                  <span className="flex items-center gap-1 text-kuis-warning">
                    <AlertTriangle className="w-3 h-3" /> {e.type}
                  </span>
                ) : (
                  <span className="text-kuis-accent">{e.type}</span>
                )}
              </td>
              <td className="py-2 pr-4 text-kuis-text">{e.reason}</td>
              <td className="py-2 pr-4 text-kuis-muted">{timeAgo(e.lastSeen)}</td>
              <td className="py-2 pr-4 text-kuis-text-dim truncate max-w-[10rem]">{e.source}</td>
              <td className="py-2 text-kuis-text-dim">{e.message}</td>
              <td className="py-2 text-right text-kuis-muted">{e.count > 1 ? e.count : ''}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
