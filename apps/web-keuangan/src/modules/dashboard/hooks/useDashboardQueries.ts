import { useQuery } from '@tanstack/react-query';
import { client } from '@alizzah/api-client';
import { APIResponse } from '@alizzah/shared';

export interface DashboardStats {
    totalPenerimaan: number;
    totalSiswa: number;
    totalTunggakan: number;
    totalSaldoKas: number;
}

export interface ActivityItem {
    id: string;
    name: string;
    action: string;
    time: string;
    amount: number;
    type: 'MASUK' | 'KELUAR';
    color: 'emerald' | 'rose';
}

export function useDashboardStats(token: string | null) {
    return useQuery({
        queryKey: ['dashboard', 'stats'],
        queryFn: async () => {
            if (!token) throw new Error('Unauthorized');
            const res = await (client.keuangan as any).dashboard.stats.$get(
                {},
                { headers: { Authorization: `Bearer ${token}` } }
            );

            if (!res.ok) {
                throw new Error('Gagal mengambil statistik dashboard');
            }

            const result = (await res.json()) as APIResponse<DashboardStats>;
            return result.data;
        },
        enabled: !!token
    });
}

export function useRecentActivities(token: string | null) {
    return useQuery({
        queryKey: ['dashboard', 'recent-activities'],
        queryFn: async () => {
            if (!token) throw new Error('Unauthorized');
            const res = await (client.keuangan as any).dashboard['recent-activities'].$get(
                {},
                { headers: { Authorization: `Bearer ${token}` } }
            );

            if (!res.ok) {
                throw new Error('Gagal mengambil aktivitas terbaru');
            }

            const result = (await res.json()) as APIResponse<ActivityItem[]>;
            return result.data;
        },
        enabled: !!token
    });
}
