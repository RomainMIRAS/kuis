import { useState, useCallback } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Sidebar } from '@/components/layout/Sidebar'
import { Header } from '@/components/layout/Header'
import { StatusBar } from '@/components/layout/StatusBar'
import { ResourceListPage } from '@/pages/ResourceListPage'
import { ClusterOverview } from '@/pages/ClusterOverview'
import { useNamespaces, useContexts, useKubeconfigs } from '@/hooks/useResources'

export default function App() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [namespace, setNamespace] = useState('')
  const [connected, setConnected] = useState(false)
  const [currentResourceType, setCurrentResourceType] = useState('pods')
  const [resourceCount, setResourceCount] = useState(0)

  // refreshKey increments whenever the cluster connection changes,
  // cascading a reload of contexts, namespaces, and resources.
  const [refreshKey, setRefreshKey] = useState(0)

  const {
    configs: kubeconfigs,
    active: activeKubeconfig,
    switchConfig: switchKubeconfig,
    rescan: rescanKubeconfigs,
  } = useKubeconfigs()

  const { namespaces } = useNamespaces(refreshKey)
  const { contexts, current: currentContext, switchContext } = useContexts(refreshKey)

  const handleKubeconfigChange = useCallback(async (name: string) => {
    await switchKubeconfig(name)
    setNamespace('')
    setRefreshKey(k => k + 1)
  }, [switchKubeconfig])

  const handleContextChange = useCallback(async (name: string) => {
    await switchContext(name)
    setNamespace('')
    setRefreshKey(k => k + 1)
  }, [switchContext])

  const handleConnectionChange = useCallback((c: boolean) => {
    setConnected(c)
  }, [])

  return (
    <BrowserRouter>
      <div className="h-screen flex flex-col overflow-hidden">
        <div className="flex flex-1 min-h-0">
          <Sidebar
            collapsed={sidebarCollapsed}
            onToggle={() => setSidebarCollapsed(p => !p)}
          />

          <div
            className={`flex-1 flex flex-col min-h-0 transition-all duration-200
              ${sidebarCollapsed ? 'ml-14' : 'ml-56'}`}
          >
            <Header
              kubeconfigs={kubeconfigs}
              activeKubeconfig={activeKubeconfig}
              onKubeconfigChange={handleKubeconfigChange}
              onKubeconfigRescan={rescanKubeconfigs}
              namespaces={namespaces}
              currentNamespace={namespace}
              onNamespaceChange={setNamespace}
              contexts={contexts}
              currentContext={currentContext}
              onContextChange={handleContextChange}
              connected={connected}
            />

            <main className="flex-1 min-h-0 overflow-hidden">
              <Routes>
                <Route
                  path="/"
                  element={
                    <ClusterOverview
                      namespace={namespace}
                      key={`overview-${refreshKey}`}
                    />
                  }
                />
                <Route
                  path="/resources/:group/:resource"
                  element={
                    <ResourceListPage
                      namespace={namespace}
                      onConnectionChange={handleConnectionChange}
                      key={`resources-${refreshKey}`}
                    />
                  }
                />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </main>

            <StatusBar
              resourceCount={resourceCount}
              resourceType={currentResourceType}
              namespace={namespace}
            />
          </div>
        </div>
      </div>
    </BrowserRouter>
  )
}
