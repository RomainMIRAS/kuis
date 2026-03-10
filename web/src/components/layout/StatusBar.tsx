import { Activity } from 'lucide-react'

interface StatusBarProps {
  resourceCount: number
  resourceType: string
  namespace: string
}

export function StatusBar({ resourceCount, resourceType, namespace }: StatusBarProps) {
  return (
    <footer className="h-7 bg-kuis-surface border-t border-kuis-border flex items-center px-4 text-[11px] font-mono text-kuis-muted gap-4 shrink-0">
      <div className="flex items-center gap-1.5">
        <Activity className="w-3 h-3" />
        <span>{resourceCount} {resourceType}</span>
      </div>
      {namespace && (
        <span>ns: {namespace}</span>
      )}
      <div className="flex-1" />
      <span>KUIS v1.0</span>
    </footer>
  )
}
