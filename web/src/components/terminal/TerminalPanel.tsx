import { useEffect, useRef } from 'react'
import { Terminal } from '@xterm/xterm'
import { FitAddon } from '@xterm/addon-fit'
import { WebLinksAddon } from '@xterm/addon-web-links'
import { wsUrl } from '@/services/api'
import '@xterm/xterm/css/xterm.css'

interface TerminalPanelProps {
  mode: 'logs' | 'exec'
  namespace: string
  pod: string
  container: string
}

export function TerminalPanel({ mode, namespace, pod, container }: TerminalPanelProps) {
  const termRef = useRef<HTMLDivElement>(null)
  const terminalRef = useRef<Terminal | null>(null)
  const wsRef = useRef<WebSocket | null>(null)

  useEffect(() => {
    if (!termRef.current || !namespace || !pod) return

    const terminal = new Terminal({
      theme: {
        background: '#0a0e14',
        foreground: '#e2e8f0',
        cursor: '#00e5a0',
        cursorAccent: '#0a0e14',
        selectionBackground: '#00e5a030',
        black: '#0a0e14',
        red: '#ef4444',
        green: '#00e5a0',
        yellow: '#f59e0b',
        blue: '#3b82f6',
        magenta: '#c084fc',
        cyan: '#22d3ee',
        white: '#e2e8f0',
        brightBlack: '#475569',
        brightRed: '#f87171',
        brightGreen: '#34d399',
        brightYellow: '#fbbf24',
        brightBlue: '#60a5fa',
        brightMagenta: '#d8b4fe',
        brightCyan: '#67e8f9',
        brightWhite: '#f8fafc',
      },
      fontFamily: '"JetBrains Mono", "Fira Code", monospace',
      fontSize: 13,
      lineHeight: 1.4,
      cursorBlink: mode === 'exec',
      disableStdin: mode === 'logs',
      scrollback: 5000,
    })

    const fitAddon = new FitAddon()
    terminal.loadAddon(fitAddon)
    terminal.loadAddon(new WebLinksAddon())
    terminal.open(termRef.current)

    setTimeout(() => fitAddon.fit(), 50)

    terminalRef.current = terminal

    if (mode === 'logs') {
      connectLogs(terminal, namespace, pod, container)
    } else {
      connectExec(terminal, namespace, pod, container, fitAddon)
    }

    const resizeObserver = new ResizeObserver(() => {
      try { fitAddon.fit() } catch {}
    })
    resizeObserver.observe(termRef.current)

    return () => {
      resizeObserver.disconnect()
      wsRef.current?.close()
      terminal.dispose()
      terminalRef.current = null
    }
  }, [mode, namespace, pod, container])

  function connectLogs(terminal: Terminal, ns: string, pod: string, container: string) {
    const params = new URLSearchParams({
      follow: 'true',
      tailLines: '500',
    })
    if (container) params.set('container', container)

    const ws = new WebSocket(
      wsUrl(`/ws/logs/${encodeURIComponent(ns)}/${encodeURIComponent(pod)}?${params}`)
    )
    wsRef.current = ws

    ws.onopen = () => {
      terminal.writeln('\x1b[38;2;0;229;160m● Connected to log stream\x1b[0m')
      terminal.writeln('')
    }

    ws.onmessage = (e) => {
      terminal.writeln(e.data)
    }

    ws.onclose = () => {
      terminal.writeln('')
      terminal.writeln('\x1b[38;2;100;116;139m● Stream closed\x1b[0m')
    }
  }

  function connectExec(
    terminal: Terminal,
    ns: string,
    pod: string,
    container: string,
    fitAddon: FitAddon
  ) {
    const params = new URLSearchParams({ shell: '/bin/sh' })
    if (container) params.set('container', container)

    const ws = new WebSocket(
      wsUrl(`/ws/exec/${encodeURIComponent(ns)}/${encodeURIComponent(pod)}?${params}`)
    )
    wsRef.current = ws

    ws.onopen = () => {
      const dims = fitAddon.proposeDimensions()
      if (dims) {
        ws.send(JSON.stringify({ type: 'resize', cols: dims.cols, rows: dims.rows }))
      }
    }

    ws.onmessage = (e) => {
      try {
        const msg = JSON.parse(e.data)
        if (msg.type === 'output') {
          terminal.write(msg.data)
        } else if (msg.type === 'error') {
          terminal.writeln(`\x1b[31m${msg.data}\x1b[0m`)
        }
      } catch {}
    }

    ws.onclose = () => {
      terminal.writeln('')
      terminal.writeln('\x1b[38;2;100;116;139m● Session closed\x1b[0m')
    }

    terminal.onData((data) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'input', data }))
      }
    })

    terminal.onResize(({ cols, rows }) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'resize', cols, rows }))
      }
    })
  }

  return (
    <div ref={termRef} className="h-full w-full p-1" />
  )
}
