
import { useQuery } from '@tanstack/react-query';
import { client } from '@alizzah/api-client';
import { APIResponse } from '@alizzah/shared';
import { Rombel } from '@alizzah/db';
import { useAtomValue } from 'jotai';
import { tokenAtom } from '~/stores/auth';

export type RombelWithRelations = Rombel & {
    jumlahSiswa: number;
    kapasitasTerpakai: number;
    jenjang: { nama: string; kode: string };
    tahunAjaran: { nama: string };
}

export function useRombelList(tahunAjaranId?: string) {
    const token = useAtomValue(tokenAtom);

    return useQuery({
        queryKey: ['rombels', tahunAjaranId],
        queryFn: async () => {
            if (!token) throw new Error('Unauthorized');
            const query = tahunAjaranId ? { tahunAjaranId } : undefined;
            const res = await client.master.rombel.$get(
                { query },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            if (!res.ok) throw new Error('Failed to fetch rombels');
            const result = (await res.json()) as unknown as APIResponse<RombelWithRelations[]>;
            return result.data;
        },
        enabled: !!token,
    });
}
