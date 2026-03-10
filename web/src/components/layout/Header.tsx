import { useState, useRef, useEffect } from 'react'
import { ChevronDown, Search, Wifi, WifiOff, FolderOpen, RefreshCw } from 'lucide-react'

interface HeaderProps {
  kubeconfigs: string[]
  activeKubeconfig: string
  onKubeconfigChange: (name: string) => void
  onKubeconfigRescan: () => void
  namespaces: string[]
  currentNamespace: string
  onNamespaceChange: (ns: string) => void
  contexts: string[]
  currentContext: string
  onContextChange: (ctx: string) => void
  connected: boolean
}

export function Header({
  kubeconfigs,
  activeKubeconfig,
  onKubeconfigChange,
  onKubeconfigRescan,
  namespaces,
  currentNamespace,
  onNamespaceChange,
  contexts,
  currentContext,
  onContextChange,
  connected,
}: HeaderProps) {
  return (
    <header className="h-12 bg-kuis-surface border-b border-kuis-border flex items-center justify-between px-4 gap-4 shrink-0">
      <div className="flex items-center gap-3">
        {kubeconfigs.length > 0 && (
          <>
            <Dropdown
              label="Config"
              icon={<FolderOpen className="w-3 h-3 text-kuis-cyan" />}
              value={activeKubeconfig || 'none'}
              options={kubeconfigs}
              onChange={onKubeconfigChange}
              accentColor="cyan"
              trailing={
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    onKubeconfigRescan()
                  }}
                  title="Rescan kubeconfig directory"
                  className="p-1 rounded hover:bg-kuis-hover text-kuis-muted hover:text-kuis-text transition-colors"
                >
                  <RefreshCw className="w-3 h-3" />
                </button>
              }
            />
            <div className="w-px h-6 bg-kuis-border" />
          </>
        )}
        <Dropdown
          label="Context"
          value={currentContext || 'No context'}
          options={contexts}
          onChange={onContextChange}
        />
        <div className="w-px h-6 bg-kuis-border" />
        <Dropdown
          label="Namespace"
          value={currentNamespace || 'All namespaces'}
          options={['', ...namespaces]}
          displayValue={(v) => v || 'All namespaces'}
          onChange={onNamespaceChange}
        />
      </div>

      <div className="flex items-center gap-3">
        <div
          className={`flex items-center gap-1.5 text-xs font-mono px-2 py-1 rounded
            ${connected ? 'text-kuis-accent bg-kuis-accent/5' : 'text-kuis-danger bg-kuis-danger/5'}`}
        >
          {connected ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
          <span>{connected ? 'Connected' : 'Disconnected'}</span>
        </div>
      </div>
    </header>
  )
}

interface DropdownProps {
  label: string
  value: string
  options: string[]
  onChange: (v: string) => void
  displayValue?: (v: string) => string
  icon?: React.ReactNode
  accentColor?: 'accent' | 'cyan'
  trailing?: React.ReactNode
}

function Dropdown({ label, value, options, onChange, displayValue, icon, accentColor = 'accent', trailing }: DropdownProps) {
  const [open, setOpen] = useState(false)
  const [filter, setFilter] = useState('')
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const filtered = options.filter(o =>
    (displayValue?.(o) || o).toLowerCase().includes(filter.toLowerCase())
  )

  const activeClasses = accentColor === 'cyan'
    ? 'text-kuis-cyan bg-kuis-cyan/5'
    : 'text-kuis-accent bg-kuis-accent/5'

  return (
    <div ref={ref} className="relative flex items-center gap-1">
      <button
        onClick={() => {
          setOpen(!open)
          setFilter('')
        }}
        className="flex items-center gap-2 px-2.5 py-1 rounded bg-kuis-bg border border-kuis-border
          hover:border-kuis-accent/30 transition-colors text-sm"
      >
        {icon}
        <span className="text-kuis-muted text-xs font-mono uppercase">{label}:</span>
        <span className="text-kuis-text font-mono text-xs max-w-[180px] truncate">
          {displayValue ? displayValue(value) : value}
        </span>
        <ChevronDown className="w-3 h-3 text-kuis-muted" />
      </button>
      {trailing}

      {open && (
        <div className="absolute top-full left-0 mt-1 w-64 bg-kuis-surface border border-kuis-border
          rounded-lg shadow-xl z-50 animate-fade-in overflow-hidden">
          <div className="p-2 border-b border-kuis-border">
            <div className="flex items-center gap-2 px-2 py-1 bg-kuis-bg rounded border border-kuis-border">
              <Search className="w-3.5 h-3.5 text-kuis-muted" />
              <input
                autoFocus
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                placeholder="Filter..."
                className="bg-transparent text-sm text-kuis-text outline-none w-full font-mono"
              />
            </div>
          </div>
          <div className="max-h-60 overflow-y-auto py-1">
            {filtered.map((opt, i) => (
              <button
                key={`${opt}-${i}`}
                onClick={() => {
                  onChange(opt)
                  setOpen(false)
                }}
                className={`w-full text-left px-3 py-1.5 text-sm font-mono transition-colors
                  ${opt === value
                    ? activeClasses
                    : 'text-kuis-text-dim hover:text-kuis-text hover:bg-kuis-hover'
                  }`}
              >
                {displayValue ? displayValue(opt) : opt}
              </button>
            ))}
            {filtered.length === 0 && (
              <div className="px-3 py-2 text-sm text-kuis-muted text-center">
                No results
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
