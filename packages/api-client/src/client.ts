import { hc } from 'hono/client'
import type { AppType } from '@alizzah/api'

// We use http://localhost:3001/api/v1 as default for the RPC client
// 1. Runtime window config (highest priority)
const getBaseUrl = () => {
    let url = '';

    // 1. Runtime window config (highest priority)
    if (typeof window !== 'undefined' && (window as any).API_URL) {
        url = (window as any).API_URL;
    }
    // 2. Build-time environment variable (Vite)
    else {
        try {
            if ((import.meta as any).env?.VITE_API_URL) {
                url = (import.meta as any).env.VITE_API_URL;
            }
        } catch (e) {
            // ignore
        }
    }

    // 3. Fallback
    if (!url) {
        url = 'http://localhost:3001';
    }

    // Clean up url (remove trailing slash)
    url = url.replace(/\/+$/, '');

    // Ensure it ends with /api/v1 if not already there
    if (!url.endsWith('/api/v1')) {
        url = url + '/api/v1';
    }

    return url;
}

const baseUrl = getBaseUrl();

export const client = hc<AppType>(baseUrl)
