import { useState, useEffect, useCallback } from 'react'
import { api } from '@/services/api'
import type { KubeResource } from '@/types/kubernetes'

export function useResources(group: string, resource: string, namespace: string) {
  const [items, setItems] = useState<KubeResource[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetch = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await api.listResources(group, resource, namespace || undefined)
      setItems(data.items || [])
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [group, resource, namespace])

  useEffect(() => {
    fetch()
  }, [fetch])

  return { items, setItems, loading, error, refetch: fetch }
}

export function useKubeconfigs() {
  const [configs, setConfigs] = useState<string[]>([])
  const [active, setActive] = useState('')
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(() => {
    api.listKubeconfigs()
      .then(data => {
        setConfigs(data.configs || [])
        setActive(data.active || '')
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { refresh() }, [refresh])

  const switchConfig = useCallback(async (name: string) => {
    const data = await api.switchKubeconfig(name)
    setActive(data.active || name)
  }, [])

  const rescan = useCallback(async () => {
    const data = await api.rescanKubeconfigs()
    setConfigs(data.configs || [])
    setActive(data.active || '')
  }, [])

  return { configs, active, switchConfig, rescan, loading }
}

export function useNamespaces(refreshKey: number = 0) {
  const [namespaces, setNamespaces] = useState<string[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    api.listNamespaces()
      .then(data => setNamespaces(data.namespaces || []))
      .catch(() => setNamespaces([]))
      .finally(() => setLoading(false))
  }, [refreshKey])

  return { namespaces, loading }
}

export function useContexts(refreshKey: number = 0) {
  const [contexts, setContexts] = useState<string[]>([])
  const [current, setCurrent] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    api.listContexts()
      .then(data => {
        setContexts(data.contexts || [])
        setCurrent(data.current || '')
      })
      .catch(() => {
        setContexts([])
        setCurrent('')
      })
      .finally(() => setLoading(false))
  }, [refreshKey])

  const switchContext = useCallback(async (name: string) => {
    await api.switchContext(name)
    setCurrent(name)
  }, [])

  return { contexts, current, switchContext, loading }
}
