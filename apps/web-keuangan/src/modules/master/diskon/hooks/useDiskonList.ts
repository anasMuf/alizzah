
import { useQuery } from '@tanstack/react-query';
import { client } from '@alizzah/api-client';
import { APIResponse } from '@alizzah/shared';

export function useDiskonList(token: string | null) {
    return useQuery({
        queryKey: ['diskon', 'list'],
        queryFn: async () => {
            if (!token) throw new Error('Unauthorized');

            const res = await (client.keuangan.master as any).diskon.$get(
                {},
                { headers: { Authorization: `Bearer ${token}` } }
            );

            const result = (await res.json()) as unknown as APIResponse<any[]>;

            if (!res.ok || !result.success || !result.data) {
                throw new Error(result.error?.message || 'Gagal mengambil data diskon');
            }

            return result.data;
        },
        enabled: !!token,
    });
}

export function useDiskonDetail(token: string | null, id: string | null) {
    return useQuery({
        queryKey: ['diskon', 'detail', id],
        queryFn: async () => {
            if (!token || !id) throw new Error('Unauthorized or No ID');

            const res = await (client.keuangan.master as any).diskon[':id'].$get(
                { param: { id } },
                { headers: { Authorization: `Bearer ${token}` } }
            );

            const result = (await res.json()) as unknown as APIResponse<any>;

            if (!res.ok || !result.success || !result.data) {
                throw new Error(result.error?.message || 'Gagal mengambil detail diskon');
            }

            return result.data;
        },
        enabled: !!token && !!id,
    });
}
