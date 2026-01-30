import * as React from 'react'
import {
  HeadContent,
  Scripts,
  createRootRouteWithContext,
  Outlet,
  useLocation,
  useNavigate,
  redirect,
} from '@tanstack/react-router'
import { TanStackRouterDevtools } from '@tanstack/react-router-devtools'
import { QueryClientProvider, QueryClient } from '@tanstack/react-query'
import { Provider as JotaiProvider, useAtomValue, useSetAtom } from 'jotai'
import { isAuthenticatedAtom, initializeAuthAtom } from '~/stores/auth'
import { DashboardLayout } from '~/components/layout/DashboardLayout'
import { fetchAuth } from '~/modules/auth/api/auth.server'
import appCss from '~/styles/app.css?url'

export const Route = createRootRouteWithContext<{
  queryClient: QueryClient
}>()({
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      { title: 'Alizzah Finance' },
    ],
    links: [
      { rel: 'stylesheet', href: appCss },
      { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
      { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossOrigin: 'anonymous' },
      { rel: 'stylesheet', href: 'https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:ital,wght@0,200..800;1,200..800&display=swap' },
    ],
  }),
  beforeLoad: async ({ location }) => {
    const auth = await fetchAuth()
    const isLoginPage = location.pathname === '/login'

    if (!auth.token && !isLoginPage) {
      throw redirect({
        to: '/login',
      })
    }

    if (auth.token && isLoginPage) {
      throw redirect({
        to: '/',
      })
    }

    return { auth }
  },
  loader: async () => {
    const auth = await fetchAuth()
    return { auth }
  },
  component: RootDocument,
})

function RootDocument() {
  const { queryClient } = Route.useRouteContext()
  const { auth } = Route.useLoaderData()

  return (
    <JotaiProvider>
      <QueryClientProvider client={queryClient}>
        <html lang="id">
          <head>
            <HeadContent />
          </head>
          <body className="bg-[#F8FAFC] text-slate-900 font-['Plus_Jakarta_Sans',sans-serif] min-h-screen">
            <AppContent initialAuth={auth} />
            <TanStackRouterDevtools position="bottom-right" />
            <Scripts />
          </body>
        </html>
      </QueryClientProvider>
    </JotaiProvider>
  )
}

function AppContent({ initialAuth }: { initialAuth: any }) {
  const isAuthenticated = useAtomValue(isAuthenticatedAtom)
  const initializeAuth = useSetAtom(initializeAuthAtom)
  const location = useLocation()
  const navigate = useNavigate()
  const isLoginPage = location.pathname === '/login'
  const [isInitialized, setIsInitialized] = React.useState(false)

  // Sync server auth state to Jotai on mount
  React.useEffect(() => {
    if (initialAuth) {
      initializeAuth({
        token: initialAuth.token,
        user: initialAuth.user
      })
    }
    setIsInitialized(true)
  }, [initialAuth, initializeAuth])

  // Handle client-side redirect after logout
  React.useEffect(() => {
    if (isInitialized && !isAuthenticated && !isLoginPage) {
      navigate({ to: '/login', replace: true })
    }
  }, [isInitialized, isAuthenticated, isLoginPage, navigate])

  if (!isInitialized) return null

  return isAuthenticated && !isLoginPage ? (
    <DashboardLayout>
      <Outlet />
    </DashboardLayout>
  ) : (
    <main className="min-h-screen">
      <Outlet />
    </main>
  )
}
