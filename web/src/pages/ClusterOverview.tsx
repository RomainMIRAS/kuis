import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Container,
  Layers,
  Globe,
  Server,
  Activity,
  ArrowRight,
  Loader2,
} from 'lucide-react'
import { api } from '@/services/api'
import { StatusBadge, getResourceStatus } from '@/components/resources/StatusBadge'

interface OverviewStat {
  label: string
  resource: string
  group: string
  icon: React.ComponentType<any>
  count: number
  healthy: number
  loading: boolean
}

export function ClusterOverview({ namespace }: { namespace: string }) {
  const navigate = useNavigate()
  const [stats, setStats] = useState<OverviewStat[]>([
    { label: 'Pods', resource: 'pods', group: 'core', icon: Container, count: 0, healthy: 0, loading: true },
    { label: 'Deployments', resource: 'deployments', group: 'apps', icon: Layers, count: 0, healthy: 0, loading: true },
    { label: 'Services', resource: 'services', group: 'core', icon: Globe, count: 0, healthy: 0, loading: true },
    { label: 'Nodes', resource: 'nodes', group: 'core', icon: Server, count: 0, healthy: 0, loading: true },
  ])

  const [events, setEvents] = useState<any[]>([])
  const [eventsLoading, setEventsLoading] = useState(true)

  useEffect(() => {
    stats.forEach((stat, idx) => {
      api.listResources(stat.group, stat.resource, namespace || undefined)
        .then(data => {
          const items = data.items || []
          const healthy = items.filter((i: any) => {
            const status = getResourceStatus(i)
            return ['Running', 'Active', 'Available', 'Ready', 'Succeeded', 'Bound'].includes(status)
          }).length
          setStats(prev => {
            const next = [...prev]
            next[idx] = { ...next[idx], count: items.length, healthy, loading: false }
            return next
          })
        })
        .catch(() => {
          setStats(prev => {
            const next = [...prev]
            next[idx] = { ...next[idx], loading: false }
            return next
          })
        })
    })

    api.listResources('core', 'events', namespace || undefined)
      .then(data => {
        const items = (data.items || [])
          .sort((a: any, b: any) =>
            new Date(b.metadata.creationTimestamp).getTime() -
            new Date(a.metadata.creationTimestamp).getTime()
          )
          .slice(0, 20)
        setEvents(items)
      })
      .catch(() => {})
      .finally(() => setEventsLoading(false))
  }, [namespace])

  return (
    <div className="p-6 space-y-6 overflow-auto h-full">
      <div>
        <h1 className="font-display text-2xl font-bold text-kuis-text tracking-tight">
          Cluster Overview
        </h1>
        <p className="text-sm text-kuis-muted font-body mt-1">
          {namespace ? `Namespace: ${namespace}` : 'All namespaces'}
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map(stat => {
          const Icon = stat.icon
          const unhealthy = stat.count - stat.healthy
          return (
            <button
              key={stat.resource}
              onClick={() => navigate(`/resources/${stat.group}/${stat.resource}`)}
              className="bg-kuis-surface border border-kuis-border rounded-xl p-4
                hover:border-kuis-accent/30 transition-all group text-left"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="w-9 h-9 rounded-lg bg-kuis-accent/5 flex items-center justify-center
                  group-hover:bg-kuis-accent/10 transition-colors">
                  <Icon className="w-4.5 h-4.5 text-kuis-accent" />
                </div>
                <ArrowRight className="w-4 h-4 text-kuis-muted opacity-0 group-hover:opacity-100
                  transition-opacity" />
              </div>
              {stat.loading ? (
                <Loader2 className="w-4 h-4 text-kuis-muted animate-spin" />
              ) : (
                <>
                  <div className="font-mono text-2xl font-bold text-kuis-text">{stat.count}</div>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-xs font-mono text-kuis-muted">{stat.label}</span>
                    {unhealthy > 0 && (
                      <span className="text-[11px] font-mono text-kuis-warning">
                        {unhealthy} unhealthy
                      </span>
                    )}
                  </div>
                </>
              )}
            </button>
          )
        })}
      </div>

      <div className="border border-kuis-border rounded-xl overflow-hidden">
        <div className="px-4 py-3 bg-kuis-surface border-b border-kuis-border flex items-center gap-2">
          <Activity className="w-4 h-4 text-kuis-accent" />
          <h2 className="text-sm font-mono font-semibold text-kuis-text">Recent Events</h2>
        </div>
        <div className="max-h-80 overflow-auto">
          {eventsLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-4 h-4 text-kuis-accent animate-spin" />
            </div>
          ) : events.length === 0 ? (
            <div className="py-8 text-center text-sm text-kuis-muted font-mono">
              No recent events
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="text-[11px] font-mono uppercase text-kuis-muted">
                  <th className="text-left px-4 py-2">Type</th>
                  <th className="text-left px-4 py-2">Object</th>
                  <th className="text-left px-4 py-2">Message</th>
                  <th className="text-left px-4 py-2">Count</th>
                </tr>
              </thead>
              <tbody>
                {events.map((evt, i) => (
                  <tr
                    key={evt.metadata?.uid || i}
                    className="border-t border-kuis-border/50 text-xs font-mono animate-fade-in"
                    style={{ animationDelay: `${i * 20}ms` }}
                  >
                    <td className="px-4 py-2">
                      <StatusBadge
                        status={
                          evt.type === 'Warning' ? 'Failed' :
                          evt.type === 'Normal' ? 'Running' : 'Unknown'
                        }
                      />
                    </td>
                    <td className="px-4 py-2 text-kuis-text-dim">
                      {evt.involvedObject?.kind}/{evt.involvedObject?.name}
                    </td>
                    <td className="px-4 py-2 text-kuis-text-dim max-w-md truncate">
                      {evt.message}
                    </td>
                    <td className="px-4 py-2 text-kuis-muted">
                      {evt.count || 1}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}
