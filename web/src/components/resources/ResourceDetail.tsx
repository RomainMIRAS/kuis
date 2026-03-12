import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  X,
  Maximize2,
  FileText,
  Terminal,
  ScrollText,
  Scale,
  RotateCcw,
  Trash2,
  Save,
  Loader2,
} from 'lucide-react'
import { api } from '@/services/api'
import type { KubeResource } from '@/types/kubernetes'
import { StatusBadge, getResourceStatus } from './StatusBadge'
import { timeAgo, formatLabels } from '@/services/utils'
import { YamlEditor } from '../editor/YamlEditor'
import { TerminalPanel } from '../terminal/TerminalPanel'

interface ResourceDetailProps {
  resource: KubeResource
  resourceType: string
  resourceGroup: string
  onClose: () => void
  onRefresh: () => void
}

type Tab = 'overview' | 'yaml' | 'logs' | 'exec'

export function ResourceDetail({
  resource,
  resourceType,
  resourceGroup,
  onClose,
  onRefresh,
}: ResourceDetailProps) {
  const navigate = useNavigate()
  const [tab, setTab] = useState<Tab>('overview')
  const [yamlContent, setYamlContent] = useState('')
  const [yamlLoading, setYamlLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [scaleInput, setScaleInput] = useState('')
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [containers, setContainers] = useState<string[]>([])
  const [selectedContainer, setSelectedContainer] = useState('')

  const ns = resource.metadata.namespace || ''
  const name = resource.metadata.name
  const isPod = resourceType === 'pods'
  const isDeployment = resourceType === 'deployments'

  useEffect(() => {
    if (isPod && ns) {
      api.listContainers(resourceGroup, ns, name)
        .then(data => {
          setContainers(data.containers || [])
          if (data.containers?.length) setSelectedContainer(data.containers[0])
        })
        .catch(() => {})
    }
  }, [isPod, ns, name, resourceGroup])

  useEffect(() => {
    if (tab === 'yaml') {
      setYamlLoading(true)
      api.getResourceYAML(resourceGroup, resourceType, ns, name)
        .then(setYamlContent)
        .catch(() => setYamlContent('# Error loading YAML'))
        .finally(() => setYamlLoading(false))
    }
  }, [tab, resourceGroup, resourceType, ns, name])

  const handleSaveYaml = async () => {
    setSaving(true)
    try {
      await api.updateResource(resourceGroup, resourceType, ns, name, yamlContent)
      onRefresh()
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
      await api.scaleDeployment(ns, name, replicas)
      onRefresh()
      setScaleInput('')
    } catch (err: any) {
      alert(`Error: ${err.message}`)
    }
  }

  const handleRestart = async () => {
    try {
      await api.restartDeployment(ns, name)
      onRefresh()
    } catch (err: any) {
      alert(`Error: ${err.message}`)
    }
  }

  const handleDelete = async () => {
    try {
      await api.deleteResource(resourceGroup, resourceType, ns, name)
      onRefresh()
      onClose()
    } catch (err: any) {
      alert(`Error: ${err.message}`)
    }
  }

  const tabs: Array<{ id: Tab; label: string; icon: React.ComponentType<any>; show: boolean }> = [
    { id: 'overview', label: 'Overview', icon: FileText, show: true },
    { id: 'yaml', label: 'YAML', icon: ScrollText, show: true },
    { id: 'logs', label: 'Logs', icon: Terminal, show: isPod },
    { id: 'exec', label: 'Exec', icon: Terminal, show: isPod },
  ]

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative ml-auto w-full max-w-3xl bg-kuis-bg border-l border-kuis-border
        flex flex-col animate-fade-in shadow-2xl">

        <div className="flex items-center justify-between px-4 py-3 border-b border-kuis-border bg-kuis-surface">
          <div className="flex items-center gap-3">
            <div>
              <h2 className="font-mono font-semibold text-kuis-text text-sm">{name}</h2>
              <div className="flex items-center gap-2 mt-0.5">
                {ns && <span className="text-[11px] font-mono text-kuis-muted">{ns}</span>}
                <StatusBadge status={getResourceStatus(resource)} />
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => {
                const detailNs = ns || '_'
                navigate(`/resources/${resourceGroup}/${resourceType}/${detailNs}/${name}`)
                onClose()
              }}
              title="Open full page"
              className="p-1.5 rounded hover:bg-kuis-hover text-kuis-muted hover:text-kuis-text transition-colors"
            >
              <Maximize2 className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded hover:bg-kuis-hover text-kuis-muted hover:text-kuis-text transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="flex border-b border-kuis-border bg-kuis-surface">
          {tabs.filter(t => t.show).map(t => {
            const Icon = t.icon
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`flex items-center gap-1.5 px-4 py-2 text-xs font-mono transition-colors
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

        <div className="flex-1 overflow-auto">
          {tab === 'overview' && (
            <div className="p-4 space-y-4">
              <DetailSection title="Metadata">
                <DetailRow label="Name" value={name} />
                {ns && <DetailRow label="Namespace" value={ns} />}
                <DetailRow label="UID" value={resource.metadata.uid} />
                <DetailRow label="Created" value={timeAgo(resource.metadata.creationTimestamp)} />
                <DetailRow label="Labels" value={formatLabels(resource.metadata.labels)} />
              </DetailSection>

              {isPod && resource.status?.containerStatuses && (
                <DetailSection title="Containers">
                  {(resource.status.containerStatuses as any[]).map((cs: any) => (
                    <div key={cs.name} className="flex items-center justify-between py-1">
                      <span className="font-mono text-xs text-kuis-text">{cs.name}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-mono text-kuis-muted">{cs.image}</span>
                        <StatusBadge status={cs.ready ? 'Running' : 'NotReady'} />
                      </div>
                    </div>
                  ))}
                </DetailSection>
              )}

              {isDeployment && (
                <DetailSection title="Actions">
                  <div className="flex items-center gap-2">
                    <Scale className="w-4 h-4 text-kuis-muted" />
                    <input
                      type="number"
                      min="0"
                      value={scaleInput}
                      onChange={e => setScaleInput(e.target.value)}
                      placeholder={`Replicas (current: ${resource.spec?.replicas || 0})`}
                      className="bg-kuis-surface border border-kuis-border rounded px-2 py-1 text-xs font-mono
                        text-kuis-text outline-none focus:border-kuis-accent/50 w-48"
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
                      <RotateCcw className="w-3.5 h-3.5" />
                      Restart
                    </button>
                  </div>
                </DetailSection>
              )}

              <DetailSection title="Danger Zone">
                {!showDeleteConfirm ? (
                  <button
                    onClick={() => setShowDeleteConfirm(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono
                      bg-kuis-danger/10 text-kuis-danger rounded hover:bg-kuis-danger/20 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Delete Resource
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
              </DetailSection>
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
                <div className="flex items-center gap-2 px-4 py-2 border-b border-kuis-border">
                  <span className="text-xs font-mono text-kuis-muted">Container:</span>
                  {containers.map(c => (
                    <button
                      key={c}
                      onClick={() => setSelectedContainer(c)}
                      className={`px-2 py-0.5 text-xs font-mono rounded transition-colors
                        ${c === selectedContainer
                          ? 'bg-kuis-accent/10 text-kuis-accent'
                          : 'text-kuis-text-dim hover:text-kuis-text hover:bg-kuis-hover'
                        }`}
                    >
                      {c}
                    </button>
                  ))}
                </div>
              )}
              <div className="flex-1 min-h-0">
                <TerminalPanel
                  mode="logs"
                  namespace={ns}
                  pod={name}
                  container={selectedContainer}
                />
              </div>
            </div>
          )}

          {tab === 'exec' && isPod && (
            <div className="flex flex-col h-full">
              {containers.length > 1 && (
                <div className="flex items-center gap-2 px-4 py-2 border-b border-kuis-border">
                  <span className="text-xs font-mono text-kuis-muted">Container:</span>
                  {containers.map(c => (
                    <button
                      key={c}
                      onClick={() => setSelectedContainer(c)}
                      className={`px-2 py-0.5 text-xs font-mono rounded transition-colors
                        ${c === selectedContainer
                          ? 'bg-kuis-accent/10 text-kuis-accent'
                          : 'text-kuis-text-dim hover:text-kuis-text hover:bg-kuis-hover'
                        }`}
                    >
                      {c}
                    </button>
                  ))}
                </div>
              )}
              <div className="flex-1 min-h-0">
                <TerminalPanel
                  mode="exec"
                  namespace={ns}
                  pod={name}
                  container={selectedContainer}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function DetailSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border border-kuis-border rounded-lg overflow-hidden">
      <div className="px-4 py-2 bg-kuis-surface border-b border-kuis-border">
        <h3 className="text-xs font-mono uppercase tracking-wider text-kuis-muted">{title}</h3>
      </div>
      <div className="p-4 space-y-2">{children}</div>
    </div>
  )
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start gap-4">
      <span className="text-xs font-mono text-kuis-muted w-24 shrink-0">{label}</span>
      <span className="text-xs font-mono text-kuis-text-dim break-all">{value}</span>
    </div>
  )
}
