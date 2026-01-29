import { hc } from 'hono/client'
import type { AppType } from '@alizzah/api'

// We use http://localhost:3001/api/v1 as default for the RPC client
const baseUrl = typeof window !== 'undefined'
    ? ((window as any).API_URL || 'http://localhost:3001') + '/api/v1'
    : 'http://localhost:3001/api/v1'

export const client = hc<AppType>(baseUrl)
