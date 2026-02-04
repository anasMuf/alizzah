import { useQuery } from '@tanstack/react-query';
import { client } from '@alizzah/api-client';
import { APIResponse } from '@alizzah/shared';

export function useTabunganList(token: string | null, params?: {
    search?: string;
    jenis?: 'WAJIB_BERLIAN' | 'UMUM';
    page?: number;
    limit?: number;
}) {
    const { search, jenis, page = 1, limit = 20 } = params || {};

    return useQuery({
        queryKey: ['tabungan', 'list', { search, jenis, page, limit }],
        queryFn: async () => {
            if (!token) return null;
            const res = await (client.keuangan as any).tabungan.$get(
                { query: { search, jenis, page: page.toString(), limit: limit.toString() } },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            const result = (await res.json()) as unknown as APIResponse<any>;
            if (!res.ok || !result.success) {
                throw new Error(result.error?.message || 'Gagal mengambil daftar tabungan');
            }
            return result.data;
        },
        enabled: !!token,
    });
}

export function useTabunganSummary(token: string | null) {
    return useQuery({
        queryKey: ['tabungan', 'summary'],
        queryFn: async () => {
            if (!token) return null;
            const res = await (client.keuangan as any).tabungan.summary.$get(
                {},
                { headers: { Authorization: `Bearer ${token}` } }
            );
            const result = (await res.json()) as unknown as APIResponse<any>;
            if (!res.ok || !result.success) {
                throw new Error(result.error?.message || 'Gagal mengambil ringkasan tabungan');
            }
            return result.data;
        },
        enabled: !!token,
    });
}

export function useTabunganBySiswa(token: string | null, siswaId: string | null) {
    return useQuery({
        queryKey: ['tabungan', 'siswa', siswaId],
        queryFn: async () => {
            if (!token || !siswaId) return null;
            const res = await (client.keuangan as any).tabungan.siswa[':siswaId'].$get(
                { param: { siswaId } },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            const result = (await res.json()) as unknown as APIResponse<any>;
            if (!res.ok || !result.success) {
                throw new Error(result.error?.message || 'Gagal mengambil tabungan siswa');
            }
            return result.data;
        },
        enabled: !!token && !!siswaId,
    });
}

export function useTabunganDetail(token: string | null, tabunganId: string | null) {
    return useQuery({
        queryKey: ['tabungan', 'detail', tabunganId],
        queryFn: async () => {
            if (!token || !tabunganId) return null;
            const res = await (client.keuangan as any).tabungan[':id'].$get(
                { param: { id: tabunganId } },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            const result = (await res.json()) as unknown as APIResponse<any>;
            if (!res.ok || !result.success) {
                throw new Error(result.error?.message || 'Gagal mengambil detail tabungan');
            }
            return result.data;
        },
        enabled: !!token && !!tabunganId,
    });
}

export function useTabunganTransaksi(token: string | null, tabunganId: string | null, params?: {
    page?: number;
    limit?: number;
}) {
    const { page = 1, limit = 20 } = params || {};

    return useQuery({
        queryKey: ['tabungan', 'transaksi', tabunganId, { page, limit }],
        queryFn: async () => {
            if (!token || !tabunganId) return null;
            const res = await (client.keuangan as any).tabungan[':id'].transaksi.$get(
                { param: { id: tabunganId }, query: { page: page.toString(), limit: limit.toString() } },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            const result = (await res.json()) as unknown as APIResponse<any>;
            if (!res.ok || !result.success) {
                throw new Error(result.error?.message || 'Gagal mengambil transaksi tabungan');
            }
            return result.data;
        },
        enabled: !!token && !!tabunganId,
    });
}
