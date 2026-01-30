import { useQuery } from '@tanstack/react-query';
import { client } from '@alizzah/api-client';
import { APIResponse } from '@alizzah/shared';

export function useJenisPembayaranList(token: string | null) {
    return useQuery({
        queryKey: ['jenis-pembayaran', 'list'],
        queryFn: async () => {
            if (!token) throw new Error('Unauthorized');

            const res = await client.keuangan.master['jenis-pembayaran'].$get(
                {},
                { headers: { Authorization: `Bearer ${token}` } }
            );

            const result = (await res.json()) as unknown as APIResponse<any[]>;

            if (!res.ok || !result.success || !result.data) {
                throw new Error(result.error?.message || 'Failed to fetch payment types');
            }

            return result.data;
        },
        enabled: !!token,
    });
}
