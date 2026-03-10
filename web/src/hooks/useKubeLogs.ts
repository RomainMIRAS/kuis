import { useEffect, useRef, useState, useCallback } from 'react'
import { wsUrl } from '@/services/api'

export function useKubeLogs(
  namespace: string,
  pod: string,
  container: string,
  follow: boolean = true
) {
  const [lines, setLines] = useState<string[]>([])
  const [connected, setConnected] = useState(false)
  const wsRef = useRef<WebSocket | null>(null)

  const connect = useCallback(() => {
    if (!namespace || !pod) return

    const params = new URLSearchParams({
      follow: String(follow),
      tailLines: '500',
    })
    if (container) params.set('container', container)

    const ws = new WebSocket(
      wsUrl(`/ws/logs/${encodeURIComponent(namespace)}/${encodeURIComponent(pod)}?${params}`)
    )
    wsRef.current = ws

    ws.onopen = () => setConnected(true)
    ws.onclose = () => setConnected(false)

    ws.onmessage = (e) => {
      setLines(prev => {
        const next = [...prev, e.data]
        return next.length > 5000 ? next.slice(-5000) : next
      })
    }

    return () => {
      ws.close()
      wsRef.current = null
    }
  }, [namespace, pod, container, follow])

  useEffect(() => {
    const cleanup = connect()
    return cleanup
  }, [connect])

  const clear = useCallback(() => setLines([]), [])

  return { lines, connected, clear }
}
