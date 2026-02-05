import { useQuery, useInfiniteQuery } from '@tanstack/react-query';
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

export function useBillingSummary(token: string | null, params?: { search?: string, tahunAjaranId?: string }) {
    return useQuery({
        queryKey: ['tagihan', 'summary', params],
        queryFn: async () => {
            if (!token) throw new Error('Unauthorized');
            const query: any = {};
            if (params?.search) query.search = params.search;
            if (params?.tahunAjaranId) query.tahunAjaranId = params.tahunAjaranId;

            const res = await (client.keuangan as any).tagihan.summary.$get(
                { query },
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

export function useInfiniteBillingList(token: string | null, params: {
    limit?: number;
    search?: string;
    rombelId?: string;
    periode?: string;
    status?: string;
}) {
    return useInfiniteQuery({
        queryKey: ['tagihan', 'list', 'infinite', params],
        queryFn: async ({ pageParam = 1 }) => {
            if (!token) throw new Error('Unauthorized');
            const query: any = {
                page: pageParam.toString(),
                limit: params.limit?.toString() || '20',
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
        initialPageParam: 1,
        getNextPageParam: (lastPage) => {
            const { page, totalPages } = lastPage?.meta;
            return page < totalPages ? page + 1 : undefined;
        },
        enabled: !!token,
    });
}
