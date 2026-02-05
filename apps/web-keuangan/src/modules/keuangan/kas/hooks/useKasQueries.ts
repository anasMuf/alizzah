import { useQuery } from '@tanstack/react-query';
import { client } from '@alizzah/api-client';
import { APIResponse } from '@alizzah/shared';

export function useKasList(token: string | null) {
    return useQuery({
        queryKey: ['kas', 'list'],
        queryFn: async () => {
            if (!token) return null;
            const res = await (client.keuangan as any).kas.$get(
                {},
                { headers: { Authorization: `Bearer ${token}` } }
            );
            const result = (await res.json()) as unknown as APIResponse<any>;
            if (!res.ok || !result.success) {
                throw new Error(result.error?.message || 'Gagal mengambil daftar kas');
            }
            return result.data;
        },
        enabled: !!token,
    });
}

export function useKasSummary(token: string | null) {
    return useQuery({
        queryKey: ['kas', 'summary'],
        queryFn: async () => {
            if (!token) return null;
            const res = await (client.keuangan as any).kas.summary.$get(
                {},
                { headers: { Authorization: `Bearer ${token}` } }
            );
            const result = (await res.json()) as unknown as APIResponse<any>;
            if (!res.ok || !result.success) {
                throw new Error(result.error?.message || 'Gagal mengambil ringkasan kas');
            }
            return result.data;
        },
        enabled: !!token,
    });
}

export function useKasDetail(token: string | null, kasId: string | null) {
    return useQuery({
        queryKey: ['kas', 'detail', kasId],
        queryFn: async () => {
            if (!token || !kasId) return null;
            const res = await (client.keuangan as any).kas[':id'].$get(
                { param: { id: kasId } },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            const result = (await res.json()) as unknown as APIResponse<any>;
            if (!res.ok || !result.success) {
                throw new Error(result.error?.message || 'Gagal mengambil detail kas');
            }
            return result.data;
        },
        enabled: !!token && !!kasId,
    });
}

export function useKasTransaksi(
    token: string | null,
    params?: {
        kasId?: string;
        tipeTransaksi?: 'MASUK' | 'KELUAR' | 'TRANSFER';
        tanggalMulai?: Date | string;
        tanggalSelesai?: Date | string;
        search?: string;
        page?: number;
        limit?: number;
    }
) {
    const { kasId, tipeTransaksi, tanggalMulai, tanggalSelesai, search, page = 1, limit = 20 } = params || {};

    return useQuery({
        queryKey: ['kas', 'transaksi', { kasId, tipeTransaksi, tanggalMulai, tanggalSelesai, search, page, limit }],
        queryFn: async () => {
            if (!token) return null;
            const queryParams: any = {
                page: page.toString(),
                limit: limit.toString(),
            };
            if (kasId) queryParams.kasId = kasId;
            if (tipeTransaksi) queryParams.tipeTransaksi = tipeTransaksi;
            if (tanggalMulai) queryParams.tanggalMulai = typeof tanggalMulai === 'string' ? tanggalMulai : (tanggalMulai as Date).toISOString();
            if (tanggalSelesai) queryParams.tanggalSelesai = typeof tanggalSelesai === 'string' ? tanggalSelesai : (tanggalSelesai as Date).toISOString();
            if (search) queryParams.search = search;

            const res = await (client.keuangan as any).kas.transaksi.$get(
                { query: queryParams },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            const result = (await res.json()) as unknown as APIResponse<any>;
            if (!res.ok || !result.success) {
                throw new Error(result.error?.message || 'Gagal mengambil daftar transaksi kas');
            }
            return result.data;
        },
        enabled: !!token,
    });
}

export function useRekonsiliasiData(token: string | null, kasId: string | null, tanggal?: Date | string) {
    return useQuery({
        queryKey: ['kas', 'rekonsiliasi', kasId, { tanggal }],
        queryFn: async () => {
            if (!token || !kasId) return null;
            const queryParams: any = {};
            if (tanggal) queryParams.tanggal = typeof tanggal === 'string' ? tanggal : (tanggal as Date).toISOString();

            const res = await (client.keuangan as any).kas.rekonsiliasi[':kasId'].$get(
                { param: { kasId }, query: queryParams },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            const result = (await res.json()) as unknown as APIResponse<any>;
            if (!res.ok || !result.success) {
                throw new Error(result.error?.message || 'Gagal mengambil data rekonsiliasi');
            }
            return result.data;
        },
        enabled: !!token && !!kasId,
    });
}

export function usePosPengeluaranList(token: string | null) {
    return useQuery({
        queryKey: ['pos-pengeluaran', 'list'],
        queryFn: async () => {
            if (!token) return null;
            const res = await (client.keuangan as any).master['pos-pengeluaran'].$get(
                {},
                { headers: { Authorization: `Bearer ${token}` } }
            );
            const result = (await res.json()) as unknown as APIResponse<any>;
            if (!res.ok || !result.success) {
                throw new Error(result.error?.message || 'Gagal mengambil pos pengeluaran');
            }
            return result.data.data;
        },
        enabled: !!token,
    });
}
