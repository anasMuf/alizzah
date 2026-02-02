
import { useQuery } from '@tanstack/react-query';
import { client } from '@alizzah/api-client';
import { APIResponse } from '@alizzah/shared';

export function usePembayaranList(token: string | null, params: {
    page?: number;
    limit?: number;
    search?: string;
    siswaId?: string;
} = {}) {
    return useQuery({
        queryKey: ['pembayaran', 'list', params],
        queryFn: async () => {
            if (!token) throw new Error('Unauthorized');
            const query: any = {
                page: params.page?.toString() || '1',
                limit: params.limit?.toString() || '10',
            };
            if (params.search) query.search = params.search;
            if (params.siswaId) query.siswaId = params.siswaId;

            const res = await (client.keuangan as any).pembayaran.$get(
                { query },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            const result = (await res.json()) as unknown as APIResponse<any>;
            if (!res.ok || !result.success) {
                throw new Error(result.error?.message || 'Gagal mengambil riwayat pembayaran');
            }
            return result.data;
        },
        enabled: !!token,
    });
}
