import { useQuery } from '@tanstack/react-query';
import { client } from '@alizzah/api-client';
import { APIResponse } from '@alizzah/shared';

export interface SearchResult {
    id: string;
    title: string;
    subtitle: string;
    type: 'SISWA' | 'TAGIHAN' | 'PEMBAYARAN';
    link?: string;
}

export interface SearchResults {
    siswa: SearchResult[];
    tagihan: SearchResult[];
    pembayaran: SearchResult[];
}

export function useGlobalSearch(token: string | null, query: string) {
    return useQuery({
        queryKey: ['global-search', query],
        queryFn: async () => {
            if (!token || query.length < 2) return { siswa: [], tagihan: [], pembayaran: [] };
            const res = await (client.keuangan as any).search.global.$get(
                { query: { q: query } },
                { headers: { Authorization: `Bearer ${token}` } }
            );

            if (!res.ok) {
                throw new Error('Gagal melakukan pencarian');
            }

            const result = (await res.json()) as APIResponse<SearchResults>;
            return result.data;
        },
        enabled: !!token && query.length >= 2,
        staleTime: 1000 * 60, // 1 minute
    });
}
