import { useEffect, useRef, useCallback, useState } from 'react'
import { wsUrl } from '@/services/api'
import type { WatchEvent, KubeResource } from '@/types/kubernetes'

export function useResourceWatch(
  resource: string,
  namespace: string,
  onEvent: (event: WatchEvent) => void
) {
  const wsRef = useRef<WebSocket | null>(null)
  const [connected, setConnected] = useState(false)

  useEffect(() => {
    const params = new URLSearchParams({ resource })
    if (namespace) params.set('namespace', namespace)

    const ws = new WebSocket(wsUrl(`/ws/watch?${params}`))
    wsRef.current = ws

    ws.onopen = () => setConnected(true)
    ws.onclose = () => setConnected(false)
    ws.onerror = () => setConnected(false)

    ws.onmessage = (e) => {
      try {
        const event: WatchEvent = JSON.parse(e.data)
        onEvent(event)
      } catch {}
    }

    return () => {
      ws.close()
      wsRef.current = null
    }
  }, [resource, namespace, onEvent])

  return { connected }
}

export function useResourceList(
  group: string,
  resource: string,
  namespace: string,
  initialItems: KubeResource[]
) {
  const [items, setItems] = useState<KubeResource[]>(initialItems)

  useEffect(() => {
    setItems(initialItems)
  }, [initialItems])

  const handleEvent = useCallback((event: WatchEvent) => {
    setItems(prev => {
      switch (event.type) {
        case 'ADDED': {
          const exists = prev.some(
            i => i.metadata.uid === event.object.metadata.uid
          )
          if (exists) {
            return prev.map(i =>
              i.metadata.uid === event.object.metadata.uid ? event.object : i
            )
          }
          return [...prev, event.object]
        }
        case 'MODIFIED':
          return prev.map(i =>
            i.metadata.uid === event.object.metadata.uid ? event.object : i
          )
        case 'DELETED':
          return prev.filter(
            i => i.metadata.uid !== event.object.metadata.uid
          )
        default:
          return prev
      }
    })
  }, [])

  const { connected } = useResourceWatch(resource, namespace, handleEvent)

  return { items, connected }
}
