import Editor from '@monaco-editor/react'

interface YamlEditorProps {
  value: string
  onChange: (value: string) => void
  readOnly?: boolean
}

export function YamlEditor({ value, onChange, readOnly = false }: YamlEditorProps) {
  return (
    <Editor
      height="100%"
      language="yaml"
      theme="kuis-dark"
      value={value}
      onChange={(v) => onChange(v || '')}
      options={{
        readOnly,
        minimap: { enabled: false },
        fontSize: 13,
        fontFamily: '"JetBrains Mono", "Fira Code", monospace',
        lineNumbers: 'on',
        scrollBeyondLastLine: false,
        wordWrap: 'on',
        tabSize: 2,
        renderLineHighlight: 'line',
        cursorStyle: 'line',
        automaticLayout: true,
        padding: { top: 8, bottom: 8 },
        scrollbar: {
          verticalScrollbarSize: 6,
          horizontalScrollbarSize: 6,
        },
      }}
      beforeMount={(monaco) => {
        monaco.editor.defineTheme('kuis-dark', {
          base: 'vs-dark',
          inherit: true,
          rules: [
            { token: 'type', foreground: '00e5a0' },
            { token: 'string', foreground: '22d3ee' },
            { token: 'number', foreground: 'f59e0b' },
            { token: 'keyword', foreground: 'c084fc' },
            { token: 'comment', foreground: '475569' },
          ],
          colors: {
            'editor.background': '#0a0e14',
            'editor.foreground': '#e2e8f0',
            'editor.lineHighlightBackground': '#111720',
            'editor.selectionBackground': '#00e5a020',
            'editorCursor.foreground': '#00e5a0',
            'editorLineNumber.foreground': '#334155',
            'editorLineNumber.activeForeground': '#64748b',
            'editor.selectionHighlightBorder': '#00e5a030',
          },
        })
      }}
    />
  )
}
