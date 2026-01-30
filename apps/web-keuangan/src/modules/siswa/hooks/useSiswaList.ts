
import { useQuery } from '@tanstack/react-query';
import { client } from '@alizzah/api-client';
import { APIResponse } from '@alizzah/shared';
import { Siswa } from '@alizzah/db';
import { useAtomValue } from 'jotai';
import { tokenAtom } from '~/stores/auth';

export type SiswaWithRelations = Siswa & {
    rombel: {
        nama: string;
        jenjang: { kode: string; nama: string };
        tahunAjaran: { nama: string };
    }
}

interface UseSiswaListParams {
    page?: number;
    limit?: number;
    search?: string;
    rombelId?: string;
    status?: string;
}

export function useSiswaList(params: UseSiswaListParams = {}) {
    const token = useAtomValue(tokenAtom);
    const { page = 1, limit = 10, search, rombelId, status } = params;

    return useQuery({
        queryKey: ['siswas', page, limit, search, rombelId, status],
        queryFn: async () => {
            if (!token) throw new Error('Unauthorized');
            const query: any = {
                page: page.toString(),
                limit: limit.toString()
            };
            if (search) query.search = search;
            if (rombelId) query.rombelId = rombelId;
            if (status) query.status = status;

            const res = await client.siswa.$get(
                { query },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            if (!res.ok) throw new Error('Failed to fetch siswas');
            const result = (await res.json()) as unknown as APIResponse<SiswaWithRelations[]> & { meta: any };
            return result;
        },
        enabled: !!token,
        placeholderData: (prev) => prev, // Keep previous data while fetching new to prevent flicker
    });
}
