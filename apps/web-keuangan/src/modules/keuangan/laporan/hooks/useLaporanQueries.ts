import { useQuery } from '@tanstack/react-query';
import { client } from '@alizzah/api-client';
import { APIResponse } from '@alizzah/shared';

/**
 * Hook to fetch Tunggakan (Owed) data, grouped by Rombel.
 */
export function useTunggakan(token: string | null, rombelId?: string) {
    return useQuery({
        queryKey: ['laporan', 'tunggakan', rombelId],
        queryFn: async () => {
            if (!token) throw new Error('Unauthorized');
            const res = await client.keuangan.laporan.tunggakan.$get(
                { query: { rombelId } },
                { headers: { Authorization: `Bearer ${token}` } }
            );

            if (!res.ok) {
                throw new Error('Gagal mengambil data tunggakan');
            }

            const result = (await res.json()) as APIResponse<any>;
            return result.data;
        },
        enabled: !!token
    });
}

/**
 * Hook to fetch Tunggakan data, grouped by Jenjang.
 */
export function useTunggakanJenjang(token: string | null) {
    return useQuery({
        queryKey: ['laporan', 'tunggakan-jenjang'],
        queryFn: async () => {
            if (!token) throw new Error('Unauthorized');
            const res = await (client.keuangan.laporan as any)['tunggakan-jenjang'].$get(
                {},
                { headers: { Authorization: `Bearer ${token}` } }
            );

            if (!res.ok) {
                throw new Error('Gagal mengambil data tunggakan jenjang');
            }

            const result = (await res.json()) as APIResponse<any>;
            return result.data;
        },
        enabled: !!token
    });
}

/**
 * Hook to fetch Daily Rekap for Cashier.
 */
export function useRekapKasir(token: string | null, tanggal?: Date) {
    const tanggalStr = tanggal?.toISOString();
    return useQuery({
        queryKey: ['laporan', 'rekap-kasir', tanggalStr],
        queryFn: async () => {
            if (!token) throw new Error('Unauthorized');
            const res = await client.keuangan.laporan['rekap-kasir'].$get(
                { query: { tanggal: tanggalStr } },
                { headers: { Authorization: `Bearer ${token}` } }
            );

            if (!res.ok) {
                throw new Error('Gagal mengambil rekap kasir');
            }

            const result = (await res.json()) as APIResponse<any>;
            return result.data;
        },
        enabled: !!token
    });
}

/**
 * Hook to fetch General Ledger (Buku Besar) per Post.
 */
export function useBukuBesar(token: string | null, posId: string, startDate: Date, endDate: Date) {
    return useQuery({
        queryKey: ['laporan', 'buku-besar', posId, startDate.toISOString(), endDate.toISOString()],
        queryFn: async () => {
            if (!token) throw new Error('Unauthorized');
            const res = await client.keuangan.laporan['buku-besar'].$get(
                {
                    query: {
                        posId,
                        startDate: startDate.toISOString(),
                        endDate: endDate.toISOString()
                    }
                },
                { headers: { Authorization: `Bearer ${token}` } }
            );

            if (!res.ok) {
                throw new Error('Gagal mengambil buku besar');
            }

            const result = (await res.json()) as APIResponse<any>;
            return result.data;
        },
        enabled: !!token && !!posId
    });
}
