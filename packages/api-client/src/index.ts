import { hc } from 'hono/client'
import type { AppType } from '@alizzah/api'

export const client = hc<AppType>('http://localhost:3001')

export type { AppType }
