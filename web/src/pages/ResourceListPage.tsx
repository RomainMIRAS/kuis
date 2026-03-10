import { useState, useCallback } from 'react'
import { useParams } from 'react-router-dom'
import { useResources } from '@/hooks/useResources'
import { useResourceList } from '@/hooks/useWebSocket'
import { ResourceTable } from '@/components/resources/ResourceTable'
import { ResourceDetail } from '@/components/resources/ResourceDetail'
import type { KubeResource } from '@/types/kubernetes'

interface ResourceListPageProps {
  namespace: string
  onConnectionChange: (connected: boolean) => void
}

export function ResourceListPage({ namespace, onConnectionChange }: ResourceListPageProps) {
  const { group = 'core', resource = 'pods' } = useParams()
  const [selected, setSelected] = useState<KubeResource | null>(null)

  const { items: fetchedItems, loading, error, refetch } = useResources(group, resource, namespace)
  const { items, connected } = useResourceList(group, resource, namespace, fetchedItems)

  const handleConnectionChange = useCallback((c: boolean) => {
    onConnectionChange(c)
  }, [onConnectionChange])

  // Propagate connection state
  if (connected !== undefined) {
    setTimeout(() => handleConnectionChange(connected), 0)
  }

  return (
    <>
      <ResourceTable
        items={items}
        resourceType={resource}
        loading={loading}
        error={error}
        onSelect={setSelected}
      />

      {selected && (
        <ResourceDetail
          resource={selected}
          resourceType={resource}
          resourceGroup={group}
          onClose={() => setSelected(null)}
          onRefresh={() => {
            refetch()
            setSelected(null)
          }}
        />
      )}
    </>
  )
}
