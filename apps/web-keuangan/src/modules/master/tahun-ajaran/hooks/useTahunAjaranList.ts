import { useQuery } from '@tanstack/react-query';
import { client } from '@alizzah/api-client';
import { APIResponse } from '@alizzah/shared';
import { TahunAjaran } from '@alizzah/db';

export function useTahunAjaranList(token: string | null) {
    return useQuery({
        queryKey: ['tahun-ajaran'],
        queryFn: async () => {
            const res = await client.master['tahun-ajaran'].$get(
                {},
                { headers: { Authorization: `Bearer ${token}` } }
            );
            const result = (await res.json()) as unknown as APIResponse<TahunAjaran[]>;
            if (!res.ok || !result.success || !result.data) {
                throw new Error(result.error?.message || 'Failed to fetch academic years');
            }
            return result.data;
        },
        enabled: !!token,
    });
}
