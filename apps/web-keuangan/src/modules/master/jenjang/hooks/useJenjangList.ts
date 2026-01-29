import { useQuery } from '@tanstack/react-query';
import { client } from '@alizzah/api-client';
import { APIResponse } from '@alizzah/shared';
import { Jenjang } from '@alizzah/db';

export function useJenjangList(token: string | null) {
    return useQuery({
        queryKey: ['jenjang'],
        queryFn: async () => {
            const res = await client.master.jenjang.$get(
                {},
                { headers: { Authorization: `Bearer ${token}` } }
            );
            const result = (await res.json()) as unknown as APIResponse<Jenjang[]>;
            if (!res.ok || !result.success || !result.data) {
                throw new Error(result.error?.message || 'Failed to fetch levels');
            }
            return result.data;
        },
        enabled: !!token,
    });
}
