import { useQuery } from '@tanstack/react-query';
import { client } from '@alizzah/api-client';
import { APIResponse } from '@alizzah/shared';
import { PesertaDaycare, Jenjang, Siswa } from '@alizzah/api-client';
import { useAtomValue } from 'jotai';
import { tokenAtom } from '~/stores/auth';

export type PesertaWithRelations = PesertaDaycare & {
    siswa?: Siswa & {
        rombel: {
            nama: string;
            jenjang: Jenjang;
        }
    };
    jenjangSetara: Jenjang;
    tipePeserta: 'INTERNAL' | 'EKSTERNAL';
    defaultIkutKonsumsi: boolean;
}

interface UseDaycareListParams {
    page?: number;
    limit?: number;
    search?: string;
    mode?: string;
    status?: string;
    jenjangSetaraId?: string;
}

export function useDaycareList(params: UseDaycareListParams = {}) {
    const token = useAtomValue(tokenAtom);
    const { page = 1, limit = 10, search, mode, status, jenjangSetaraId } = params;

    return useQuery({
        queryKey: ['daycare', 'peserta', page, limit, search, mode, status, jenjangSetaraId],
        queryFn: async () => {
            if (!token) throw new Error('Unauthorized');
            
            const query: any = {
                page: page.toString(),
                limit: limit.toString()
            };
            if (search) query.search = search;
            if (mode) query.mode = mode;
            if (status) query.status = status;
            if (jenjangSetaraId) query.jenjangSetaraId = jenjangSetaraId;

            // @ts-ignore - The Hono RPC client might need a refresh to see the new route types in IDE, but runtime is fine
            const res = await client.keuangan.daycare.peserta.$get(
                { query },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            
            if (!res.ok) throw new Error('Failed to fetch peserta daycare');
            const result = (await res.json()) as unknown as APIResponse<{ data: PesertaWithRelations[], meta: any }>;
            return result.data;
        },
        enabled: !!token,
        placeholderData: (prev) => prev,
    });
}

export function useDaycareDetail(id: string) {
    const token = useAtomValue(tokenAtom);

    return useQuery({
        queryKey: ['daycare', 'peserta', 'detail', id],
        queryFn: async () => {
            if (!token) throw new Error('Unauthorized');
            
            // @ts-ignore
            const res = await client.keuangan.daycare.peserta[':id'].$get(
                { param: { id } },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            
            if (!res.ok) throw new Error('Failed to fetch detail peserta daycare');
            const result = (await res.json()) as unknown as APIResponse<PesertaWithRelations>;
            return result.data;
        },
        enabled: !!token && !!id,
    });
}
