import { Circle } from 'lucide-react'

interface StatusBadgeProps {
  status: string
  size?: 'sm' | 'md'
}

const STATUS_MAP: Record<string, { color: string; bg: string; label: string }> = {
  Running:    { color: 'text-kuis-accent', bg: 'bg-kuis-accent/10', label: 'Running' },
  Succeeded:  { color: 'text-kuis-cyan', bg: 'bg-kuis-cyan/10', label: 'Succeeded' },
  Completed:  { color: 'text-kuis-cyan', bg: 'bg-kuis-cyan/10', label: 'Completed' },
  Pending:    { color: 'text-kuis-warning', bg: 'bg-kuis-warning/10', label: 'Pending' },
  Failed:     { color: 'text-kuis-danger', bg: 'bg-kuis-danger/10', label: 'Failed' },
  CrashLoopBackOff: { color: 'text-kuis-danger', bg: 'bg-kuis-danger/10', label: 'CrashLoop' },
  Error:      { color: 'text-kuis-danger', bg: 'bg-kuis-danger/10', label: 'Error' },
  Terminating: { color: 'text-kuis-warning', bg: 'bg-kuis-warning/10', label: 'Terminating' },
  Active:     { color: 'text-kuis-accent', bg: 'bg-kuis-accent/10', label: 'Active' },
  Ready:      { color: 'text-kuis-accent', bg: 'bg-kuis-accent/10', label: 'Ready' },
  NotReady:   { color: 'text-kuis-danger', bg: 'bg-kuis-danger/10', label: 'NotReady' },
  Bound:      { color: 'text-kuis-accent', bg: 'bg-kuis-accent/10', label: 'Bound' },
  Available:  { color: 'text-kuis-accent', bg: 'bg-kuis-accent/10', label: 'Available' },
}

export function StatusBadge({ status, size = 'sm' }: StatusBadgeProps) {
  const config = STATUS_MAP[status] || {
    color: 'text-kuis-muted',
    bg: 'bg-kuis-muted/10',
    label: status || 'Unknown',
  }

  return (
    <span
      className={`inline-flex items-center gap-1 font-mono rounded-full
        ${config.color} ${config.bg}
        ${size === 'sm' ? 'text-[11px] px-2 py-0.5' : 'text-xs px-2.5 py-1'}`}
    >
      <Circle className="w-1.5 h-1.5 fill-current" />
      {config.label}
    </span>
  )
}

export function getResourceStatus(resource: any): string {
  const kind = resource?.kind
  const status = resource?.status
  const phase = status?.phase

  if (phase) return phase

  if (kind === 'Deployment') {
    const available = status?.availableReplicas || 0
    const desired = resource?.spec?.replicas || 0
    if (available >= desired && desired > 0) return 'Available'
    if (available > 0) return 'Pending'
    return 'NotReady'
  }

  if (kind === 'Service') return 'Active'

  if (kind === 'Node') {
    const conditions = status?.conditions || []
    const ready = conditions.find((c: any) => c.type === 'Ready')
    return ready?.status === 'True' ? 'Ready' : 'NotReady'
  }

  if (kind === 'Namespace') return status?.phase || 'Active'

  return ''
}
