import { useLocation, useNavigate } from 'react-router-dom'
import {
  Box,
  Network,
  Settings,
  Server,
  ChevronDown,
  ChevronRight,
  Container,
  Globe,
  Key,
  FileText,
  Layers,
  Activity,
  Clock,
  CalendarClock,
  Copy,
  LayoutGrid,
} from 'lucide-react'
import { useState } from 'react'
import { RESOURCE_GROUPS, type ResourceType } from '@/types/kubernetes'

const RESOURCE_ICONS: Record<string, React.ComponentType<any>> = {
  pods: Container,
  deployments: Layers,
  statefulsets: LayoutGrid,
  daemonsets: Copy,
  replicasets: Copy,
  jobs: Activity,
  cronjobs: CalendarClock,
  services: Globe,
  ingresses: Network,
  configmaps: FileText,
  secrets: Key,
  nodes: Server,
  namespaces: Box,
  events: Clock,
}

const GROUP_ICONS: Record<string, React.ComponentType<any>> = {
  box: Box,
  network: Network,
  settings: Settings,
  server: Server,
}

interface SidebarProps {
  collapsed: boolean
  onToggle: () => void
}

export function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const location = useLocation()
  const navigate = useNavigate()
  const [expanded, setExpanded] = useState<Record<string, boolean>>({
    Workloads: true,
    Network: true,
    Config: true,
    Cluster: true,
  })

  const isActive = (type: ResourceType, group: string) => {
    return location.pathname === `/resources/${group}/${type}`
  }

  return (
    <aside
      className={`fixed left-0 top-0 h-screen bg-kuis-surface border-r border-kuis-border
        flex flex-col z-40 transition-all duration-200
        ${collapsed ? 'w-14' : 'w-56'}`}
    >
      <div
        className="h-14 flex items-center gap-2 px-3 border-b border-kuis-border cursor-pointer shrink-0"
        onClick={onToggle}
      >
        <div className="w-8 h-8 rounded-lg bg-kuis-accent/10 flex items-center justify-center shrink-0">
          <svg viewBox="0 0 32 32" className="w-5 h-5">
            <path d="M8 16L16 8L24 16L16 24Z" fill="none" stroke="currentColor" className="text-kuis-accent" strokeWidth="3" strokeLinejoin="round" />
            <circle cx="16" cy="16" r="3" className="fill-kuis-accent" />
          </svg>
        </div>
        {!collapsed && (
          <span className="font-display font-bold text-lg tracking-tight text-kuis-text">
            KUIS
          </span>
        )}
      </div>

      <nav className="flex-1 overflow-y-auto py-2">
        {RESOURCE_GROUPS.map(grp => {
          const GroupIcon = GROUP_ICONS[grp.icon] || Box
          const isExpanded = expanded[grp.label] ?? true

          return (
            <div key={grp.label} className="mb-1">
              {!collapsed && (
                <button
                  onClick={() =>
                    setExpanded(p => ({ ...p, [grp.label]: !p[grp.label] }))
                  }
                  className="w-full flex items-center gap-2 px-3 py-1.5 text-xs font-mono
                    uppercase tracking-wider text-kuis-muted hover:text-kuis-text-dim transition-colors"
                >
                  {isExpanded ? (
                    <ChevronDown className="w-3 h-3" />
                  ) : (
                    <ChevronRight className="w-3 h-3" />
                  )}
                  <GroupIcon className="w-3.5 h-3.5" />
                  <span>{grp.label}</span>
                </button>
              )}

              {(collapsed || isExpanded) &&
                grp.items.map(item => {
                  const Icon = RESOURCE_ICONS[item.type] || Box
                  const active = isActive(item.type, item.group)

                  return (
                    <button
                      key={item.type}
                      onClick={() =>
                        navigate(`/resources/${item.group}/${item.type}`)
                      }
                      title={collapsed ? item.label : undefined}
                      className={`w-full flex items-center gap-2.5 px-3 py-1.5 text-sm transition-all
                        ${collapsed ? 'justify-center' : 'pl-8'}
                        ${
                          active
                            ? 'text-kuis-accent bg-kuis-accent/5 border-r-2 border-kuis-accent'
                            : 'text-kuis-text-dim hover:text-kuis-text hover:bg-kuis-hover'
                        }`}
                    >
                      <Icon className="w-4 h-4 shrink-0" />
                      {!collapsed && <span className="truncate">{item.label}</span>}
                    </button>
                  )
                })}
            </div>
          )
        })}
      </nav>

      <div className="border-t border-kuis-border p-2 shrink-0">
        {!collapsed && (
          <div className="text-[10px] font-mono text-kuis-muted text-center">
            KUIS v1.0
          </div>
        )}
      </div>
    </aside>
  )
}
