
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { client } from '@alizzah/api-client';
import { APIResponse } from '@alizzah/shared';
import { GenerateTagihanInput } from '@alizzah/validators';
import { toast } from 'sonner';

export function useBillingMutations(token: string | null) {
    const queryClient = useQueryClient();

    const generateMutation = useMutation({
        mutationFn: async (data: GenerateTagihanInput) => {
            if (!token) throw new Error('Unauthorized');
            const res = await (client.keuangan as any).tagihan.generate.$post(
                { json: data },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            const result = (await res.json()) as unknown as APIResponse<any>;
            if (!res.ok || !result.success) {
                throw new Error(result.error?.message || 'Gagal generate tagihan');
            }
            return result.data;
        },
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ['tagihan'] });
            const { summary } = data as any || {};
            toast.success(`Generate tagihan selesai! Berhasil: ${summary?.created || 0}, Gagal: ${summary?.failed || 0}, Lewati: ${summary?.skipped || 0}`);
        },
        onError: (error) => {
            toast.error(error.message);
        }
    });

    return {
        generateMutation
    };
}
