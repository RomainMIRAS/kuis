export function timeAgo(timestamp: string): string {
  if (!timestamp) return '-'
  const now = Date.now()
  const then = new Date(timestamp).getTime()
  const diff = Math.floor((now - then) / 1000)

  if (diff < 60) return `${diff}s`
  if (diff < 3600) return `${Math.floor(diff / 60)}m`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`
  if (diff < 2592000) return `${Math.floor(diff / 86400)}d`
  return `${Math.floor(diff / 2592000)}mo`
}

export function formatLabels(labels?: Record<string, string>): string {
  if (!labels) return '-'
  return Object.entries(labels)
    .map(([k, v]) => `${k}=${v}`)
    .join(', ')
}

export function truncate(str: string, max: number): string {
  if (str.length <= max) return str
  return str.slice(0, max) + '...'
}
