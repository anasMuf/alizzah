import { useMutation, useQueryClient } from '@tanstack/react-query';
import { client } from '@alizzah/api-client';
import { APIResponse } from '@alizzah/shared';
import { toast } from 'sonner';

interface SetorInput {
    siswaId: string;
    jenis?: 'WAJIB_BERLIAN' | 'UMUM';
    nominal: number;
    keterangan?: string;
}

interface TarikInput {
    siswaId: string;
    nominal: number;
    keterangan?: string;
}

export function useTabunganMutations(token: string | null) {
    const queryClient = useQueryClient();

    const setor = useMutation({
        mutationFn: async (input: SetorInput) => {
            if (!token) throw new Error('Unauthorized');
            const res = await (client.keuangan as any).tabungan.setor.$post(
                { json: { ...input, jenis: input.jenis || 'UMUM' } },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            const result = (await res.json()) as unknown as APIResponse<any>;
            if (!res.ok || !result.success) {
                throw new Error(result.error?.message || 'Gagal menyetor tabungan');
            }
            return result.data;
        },
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ['tabungan'] });
            toast.success('Setoran berhasil', {
                description: `Saldo tabungan sekarang: Rp ${data.saldo?.toLocaleString('id-ID') || 0}`
            });
        },
        onError: (error: Error) => {
            toast.error('Gagal menyetor', { description: error.message });
        }
    });

    const tarik = useMutation({
        mutationFn: async (input: TarikInput) => {
            if (!token) throw new Error('Unauthorized');
            const res = await (client.keuangan as any).tabungan.tarik.$post(
                { json: input },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            const result = (await res.json()) as unknown as APIResponse<any>;
            if (!res.ok || !result.success) {
                throw new Error(result.error?.message || 'Gagal menarik tabungan');
            }
            return result.data;
        },
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ['tabungan'] });
            toast.success('Penarikan berhasil', {
                description: `Diterima: Rp ${data.penarikan?.diterima?.toLocaleString('id-ID') || 0} (setelah potongan admin 2.5%)`
            });
        },
        onError: (error: Error) => {
            toast.error('Gagal menarik', { description: error.message });
        }
    });

    return { setor, tarik };
}
