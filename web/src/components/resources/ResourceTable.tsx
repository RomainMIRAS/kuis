import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  flexRender,
  type ColumnDef,
  type SortingState,
} from '@tanstack/react-table'
import { useState, useMemo } from 'react'
import { ArrowUpDown, ArrowUp, ArrowDown, Search, Loader2 } from 'lucide-react'
import type { KubeResource } from '@/types/kubernetes'
import { StatusBadge, getResourceStatus } from './StatusBadge'
import { timeAgo } from '@/services/utils'

interface ResourceTableProps {
  items: KubeResource[]
  resourceType: string
  loading: boolean
  error: string | null
  onSelect: (item: KubeResource) => void
}

function getColumns(resourceType: string): ColumnDef<KubeResource, any>[] {
  const base: ColumnDef<KubeResource, any>[] = [
    {
      accessorKey: 'metadata.name',
      header: 'Name',
      cell: ({ row }) => (
        <span className="font-mono text-kuis-text font-medium">
          {row.original.metadata.name}
        </span>
      ),
      accessorFn: (row) => row.metadata.name,
    },
  ]

  if (!['nodes', 'namespaces'].includes(resourceType)) {
    base.push({
      accessorKey: 'metadata.namespace',
      header: 'Namespace',
      cell: ({ row }) => (
        <span className="text-kuis-text-dim font-mono text-xs">
          {row.original.metadata?.namespace || '-'}
        </span>
      ),
      accessorFn: (row) => row.metadata?.namespace || '',
    })
  }

  base.push({
    id: 'status',
    header: 'Status',
    cell: ({ row }) => {
      const status = getResourceStatus(row.original)
      return status ? <StatusBadge status={status} /> : <span className="text-kuis-muted">-</span>
    },
    accessorFn: (row) => getResourceStatus(row),
  })

  if (resourceType === 'pods') {
    base.push(
      {
        id: 'ready',
        header: 'Ready',
        cell: ({ row }) => {
          const containers = row.original.status?.containerStatuses || []
          const ready = containers.filter((c: any) => c.ready).length
          return (
            <span className="font-mono text-xs text-kuis-text-dim">
              {ready}/{containers.length}
            </span>
          )
        },
      },
      {
        id: 'restarts',
        header: 'Restarts',
        cell: ({ row }) => {
          const containers = row.original.status?.containerStatuses || []
          const restarts = containers.reduce((sum: number, c: any) => sum + (c.restartCount || 0), 0)
          return (
            <span className={`font-mono text-xs ${restarts > 0 ? 'text-kuis-warning' : 'text-kuis-text-dim'}`}>
              {restarts}
            </span>
          )
        },
      }
    )
  }

  if (resourceType === 'deployments') {
    base.push({
      id: 'replicas',
      header: 'Replicas',
      cell: ({ row }) => {
        const ready = row.original.status?.readyReplicas || 0
        const desired = row.original.spec?.replicas || 0
        return (
          <span className={`font-mono text-xs ${ready < desired ? 'text-kuis-warning' : 'text-kuis-text-dim'}`}>
            {ready}/{desired}
          </span>
        )
      },
    })
  }

  if (resourceType === 'services') {
    base.push(
      {
        id: 'type',
        header: 'Type',
        cell: ({ row }) => (
          <span className="font-mono text-xs text-kuis-text-dim">
            {row.original.spec?.type || '-'}
          </span>
        ),
      },
      {
        id: 'clusterIP',
        header: 'Cluster IP',
        cell: ({ row }) => (
          <span className="font-mono text-xs text-kuis-text-dim">
            {row.original.spec?.clusterIP || '-'}
          </span>
        ),
      }
    )
  }

  if (resourceType === 'nodes') {
    base.push({
      id: 'roles',
      header: 'Roles',
      cell: ({ row }) => {
        const labels = row.original.metadata?.labels || {}
        const roles = Object.keys(labels)
          .filter(l => l.startsWith('node-role.kubernetes.io/'))
          .map(l => l.replace('node-role.kubernetes.io/', ''))
        return (
          <span className="font-mono text-xs text-kuis-text-dim">
            {roles.join(', ') || '-'}
          </span>
        )
      },
    })
  }

  base.push({
    id: 'age',
    header: 'Age',
    cell: ({ row }) => (
      <span className="font-mono text-xs text-kuis-muted">
        {timeAgo(row.original.metadata.creationTimestamp)}
      </span>
    ),
    accessorFn: (row) => row.metadata.creationTimestamp,
  })

  return base
}

export function ResourceTable({ items, resourceType, loading, error, onSelect }: ResourceTableProps) {
  const [sorting, setSorting] = useState<SortingState>([])
  const [globalFilter, setGlobalFilter] = useState('')

  const columns = useMemo(() => getColumns(resourceType), [resourceType])

  const table = useReactTable({
    data: items,
    columns,
    state: { sorting, globalFilter },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    globalFilterFn: (row, _columnId, filterValue) => {
      const name = row.original.metadata.name.toLowerCase()
      const ns = (row.original.metadata?.namespace || '').toLowerCase()
      const search = filterValue.toLowerCase()
      return name.includes(search) || ns.includes(search)
    },
  })

  if (error) {
    return (
      <div className="flex items-center justify-center h-64 text-kuis-danger">
        <div className="text-center">
          <p className="font-mono text-sm">{error}</p>
          <p className="text-xs text-kuis-muted mt-1">Check your cluster connection</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 py-2 border-b border-kuis-border">
        <div className="flex items-center gap-2 px-2.5 py-1.5 bg-kuis-bg rounded border border-kuis-border max-w-sm">
          <Search className="w-3.5 h-3.5 text-kuis-muted" />
          <input
            value={globalFilter}
            onChange={e => setGlobalFilter(e.target.value)}
            placeholder={`Filter ${resourceType}...`}
            className="bg-transparent text-sm text-kuis-text outline-none w-full font-mono placeholder:text-kuis-muted"
          />
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        {loading ? (
          <div className="flex items-center justify-center h-48">
            <Loader2 className="w-5 h-5 text-kuis-accent animate-spin" />
          </div>
        ) : (
          <table className="w-full">
            <thead className="sticky top-0 bg-kuis-surface z-10">
              {table.getHeaderGroups().map(hg => (
                <tr key={hg.id}>
                  {hg.headers.map(header => (
                    <th
                      key={header.id}
                      onClick={header.column.getToggleSortingHandler()}
                      className="text-left px-4 py-2 text-[11px] font-mono uppercase tracking-wider
                        text-kuis-muted border-b border-kuis-border cursor-pointer hover:text-kuis-text-dim
                        select-none transition-colors"
                    >
                      <div className="flex items-center gap-1">
                        {flexRender(header.column.columnDef.header, header.getContext())}
                        {header.column.getIsSorted() === 'asc' ? (
                          <ArrowUp className="w-3 h-3" />
                        ) : header.column.getIsSorted() === 'desc' ? (
                          <ArrowDown className="w-3 h-3" />
                        ) : (
                          <ArrowUpDown className="w-3 h-3 opacity-30" />
                        )}
                      </div>
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody>
              {table.getRowModel().rows.map((row, idx) => (
                <tr
                  key={row.id}
                  onClick={() => onSelect(row.original)}
                  className="border-b border-kuis-border/50 hover:bg-kuis-hover cursor-pointer
                    transition-colors animate-fade-in"
                  style={{ animationDelay: `${Math.min(idx * 15, 300)}ms` }}
                >
                  {row.getVisibleCells().map(cell => (
                    <td key={cell.id} className="px-4 py-2 text-sm">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))}
              {table.getRowModel().rows.length === 0 && !loading && (
                <tr>
                  <td
                    colSpan={columns.length}
                    className="text-center py-12 text-kuis-muted font-mono text-sm"
                  >
                    No {resourceType} found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
