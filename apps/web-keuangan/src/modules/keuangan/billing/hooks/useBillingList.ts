
import { useQuery } from '@tanstack/react-query';
import { client } from '@alizzah/api-client';
import { APIResponse } from '@alizzah/shared';

export interface BillingSummary {
    periode: string;
    totalStudents: number;
    totalBilled: number;
    totalPaid: number;
    totalOutstanding: number;
    unpaidCount: number;
    isCompleted: boolean;
}

export function useBillingSummary(token: string | null) {
    return useQuery({
        queryKey: ['tagihan', 'summary'],
        queryFn: async () => {
            if (!token) throw new Error('Unauthorized');
            const res = await (client.keuangan as any).tagihan.summary.$get(
                {},
                { headers: { Authorization: `Bearer ${token}` } }
            );
            const result = (await res.json()) as unknown as APIResponse<BillingSummary[]>;
            if (!res.ok || !result.success) {
                throw new Error(result.error?.message || 'Gagal mengambil riwayat tagihan');
            }
            return result.data;
        },
        enabled: !!token,
    });
}

export function useBillingList(token: string | null, params: {
    page?: number;
    limit?: number;
    search?: string;
    rombelId?: string;
    periode?: string;
    status?: string;
}) {
    return useQuery({
        queryKey: ['tagihan', 'list', params],
        queryFn: async () => {
            if (!token) throw new Error('Unauthorized');
            const query: any = {
                page: params.page?.toString() || '1',
                limit: params.limit?.toString() || '10',
            };
            if (params.search) query.search = params.search;
            if (params.rombelId) query.rombelId = params.rombelId;
            if (params.periode) query.periode = params.periode;
            if (params.status) query.status = params.status;

            const res = await (client.keuangan as any).tagihan.$get(
                { query },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            const result = (await res.json()) as unknown as APIResponse<{ data: any[], meta: any }>;
            if (!res.ok || !result.success) {
                throw new Error(result.error?.message || 'Gagal mengambil daftar tagihan');
            }
            return result.data;
        },
        enabled: !!token,
    });
}
