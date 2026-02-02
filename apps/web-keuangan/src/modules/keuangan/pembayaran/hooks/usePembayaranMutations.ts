
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { client } from '@alizzah/api-client';
import { CreatePembayaranInput } from '@alizzah/validators';
import { APIResponse } from '@alizzah/shared';
import { toast } from 'sonner';

export function usePembayaranMutations(token: string | null) {
    const queryClient = useQueryClient();

    const createMutation = useMutation({
        mutationFn: async (data: CreatePembayaranInput) => {
            if (!token) throw new Error('Unauthorized');
            const res = await (client.keuangan as any).pembayaran.$post(
                { json: data },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            const result = (await res.json()) as unknown as APIResponse<any>;
            if (!res.ok || !result.success) {
                throw new Error(result.error?.message || 'Gagal memproses pembayaran');
            }
            return result.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['tagihan'] });
            queryClient.invalidateQueries({ queryKey: ['pembayaran'] });
            toast.success('Pembayaran berhasil diproses');
        },
        onError: (error: any) => {
            toast.error(error.message);
        }
    });

    return { createMutation };
}
