import { useState } from 'react'
import { Outlet, useRouterState } from '@tanstack/react-router'
import { Sidebar } from './Sidebar'
import { Topbar } from './Topbar'

// Routes that use full-bleed layout (no padding on main)
const FULL_BLEED_ROUTES = ['/keuangan/pembayaran/baru']

export function DashboardLayout() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const routerState = useRouterState()
  const currentPath = routerState.location.pathname
  const isFullBleed = FULL_BLEED_ROUTES.some(r => currentPath.startsWith(r))

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50 print:block print:h-auto print:overflow-visible print:bg-white">
      {/* Mobile overlay */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-gray-900/50 backdrop-blur-sm lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      <Sidebar isOpen={isSidebarOpen} />

      <div className="flex flex-1 flex-col overflow-hidden print:overflow-visible">
        <Topbar onMenuClick={() => setIsSidebarOpen(true)} />

        <main className={`flex-1 overflow-x-hidden bg-gray-50 print:overflow-visible print:bg-white print:p-0 ${isFullBleed ? 'overflow-hidden' : 'overflow-y-auto p-4 sm:p-6 lg:p-8'}`}>
          <Outlet />
        </main>
      </div>
    </div>
  )
}
