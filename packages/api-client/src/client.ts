import { hc } from 'hono/client'
import type { AppType } from '@alizzah/api'

// We use http://localhost:3001/api/v1 as default for the RPC client
// 1. Runtime window config (highest priority)
const getBaseUrl = () => {
    if (typeof window !== 'undefined' && (window as any).API_URL) {
        return (window as any).API_URL + '/api/v1';
    }

    // 2. Build-time environment variable (Vite)
    try {
        if ((import.meta as any).env?.VITE_API_URL) {
            return (import.meta as any).env.VITE_API_URL;
        }
    } catch (e) {
        // ignore
    }

    // 3. Fallback
    return 'http://localhost:3001/api/v1';
}

const baseUrl = getBaseUrl();

export const client = hc<AppType>(baseUrl)
