
import { useQuery } from '@tanstack/react-query';
import { client } from '@alizzah/api-client';
import { APIResponse } from '@alizzah/shared';
// import { Pasta } from '@alizzah/db'; // Can't import from db directly in frontend 
// need shared types or define locally
import { useAtomValue } from 'jotai';
import { tokenAtom } from '~/stores/auth';

export type Pasta = {
    id: string;
    nama: string;
    biaya: number; // Decimal in DB, number in JSON response usually (string sometimes?)
    hari: string;
    jamMulai: string;
    jamSelesai: string;
};

export function usePastaList() {
    const token = useAtomValue(tokenAtom);

    return useQuery({
        queryKey: ['pastas'],
        queryFn: async () => {
            if (!token) throw new Error('Unauthorized');
            const res = await client.keuangan.master.pasta.$get(
                {},
                { headers: { Authorization: `Bearer ${token}` } }
            );
            if (!res.ok) throw new Error('Failed to fetch pasta');
            const result = (await res.json()) as unknown as APIResponse<Pasta[]>;
            return result.data;
        },
        enabled: !!token,
    });
}
