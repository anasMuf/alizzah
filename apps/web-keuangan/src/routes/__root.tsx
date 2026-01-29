/// <reference types="vite/client" />
import * as React from 'react'
import {
  HeadContent,
  Link,
  Scripts,
  createRootRouteWithContext,
  Outlet,
} from '@tanstack/react-router'
import { TanStackRouterDevtools } from '@tanstack/react-router-devtools'
import { QueryClientProvider, QueryClient } from '@tanstack/react-query'
import { Provider as JotaiProvider, useAtom, useAtomValue } from 'jotai'
import { userAtom, isAuthenticatedAtom, logoutAtom } from '~/stores/auth'
import appCss from '~/styles/app.css?url'

export const Route = createRootRouteWithContext<{
  queryClient: QueryClient
}>()({
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      { title: 'Sistem Keuangan Alizzah' },
    ],
    links: [
      { rel: 'stylesheet', href: appCss },
    ],
  }),
  component: RootDocument,
})

function RootDocument() {
  const { queryClient } = Route.useRouteContext()
  const user = useAtomValue(userAtom)
  const isAuthenticated = useAtomValue(isAuthenticatedAtom)
  const [, logout] = useAtom(logoutAtom)
  const [isMounted, setIsMounted] = React.useState(false)

  React.useEffect(() => {
    setIsMounted(true)
  }, [])

  return (
    <JotaiProvider>
      <QueryClientProvider client={queryClient}>
        <html lang="id">
          <head>
            <HeadContent />
          </head>
          <body className="bg-slate-50 text-slate-900 font-sans min-h-screen">
            <header className="bg-white border-b shadow-sm sticky top-0 z-10 px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-6">
                <Link to="/" className="text-xl font-bold text-blue-700">
                  ALIZZAH FINANCE
                </Link>
                <nav className="flex gap-4">
                  <Link
                    to="/"
                    activeProps={{ className: 'text-blue-600 font-semibold' }}
                    activeOptions={{ exact: true }}
                    className="text-slate-600 hover:text-blue-500 transition-colors"
                  >
                    Dashboard
                  </Link>
                  <Link
                    to="/master/tahun-ajaran"
                    activeProps={{ className: 'text-blue-600 font-semibold' }}
                    className="text-slate-600 hover:text-blue-500 transition-colors"
                  >
                    Tahun Ajaran
                  </Link>
                  <Link
                    to="/master/jenjang"
                    activeProps={{ className: 'text-blue-600 font-semibold' }}
                    className="text-slate-600 hover:text-blue-500 transition-colors"
                  >
                    Jenjang
                  </Link>
                </nav>
              </div>
              <div className="flex items-center gap-4">
                {isMounted && isAuthenticated ? (
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium text-slate-600">
                      Hi, {user?.namaLengkap || user?.username}
                    </span>
                    <button
                      onClick={() => logout()}
                      className="text-sm font-medium text-red-600 hover:text-red-700 transition-colors"
                    >
                      Logout
                    </button>
                  </div>
                ) : (
                  <Link
                    to="/login"
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                  >
                    Login
                  </Link>
                )}
              </div>
            </header>
            <main className="max-w-7xl mx-auto py-8 px-6">
              <Outlet />
            </main>
            <TanStackRouterDevtools position="bottom-right" />
            <Scripts />
          </body>
        </html>
      </QueryClientProvider>
    </JotaiProvider>
  )
}
