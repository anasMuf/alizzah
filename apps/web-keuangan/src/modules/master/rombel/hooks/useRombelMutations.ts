
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { client } from '@alizzah/api-client';
import { CreateRombelInput, UpdateRombelInput } from '@alizzah/validators';
import { APIResponse } from '@alizzah/shared';
import { toast } from 'sonner';

export function useRombelMutations(token: string | null) {
    const queryClient = useQueryClient();

    const createMutation = useMutation({
        mutationFn: async (data: CreateRombelInput) => {
            if (!token) throw new Error('Unauthorized');
            const res = await client.master.rombel.$post(
                { json: data },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            const result = (await res.json()) as unknown as APIResponse<any>;

            if (!result.success) {
                throw new Error(result.error?.message || 'Gagal menambahkan rombel');
            }
            return result.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['rombels'] });
            toast.success('Rombel berhasil ditambahkan');
        },
        onError: (error) => {
            toast.error(error.message);
        }
    });

    const updateMutation = useMutation({
        mutationFn: async ({ id, data }: { id: string; data: UpdateRombelInput }) => {
            if (!token) throw new Error('Unauthorized');
            const res = await client.master.rombel[':id'].$put(
                { param: { id }, json: data },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            const result = (await res.json()) as unknown as APIResponse<any>;

            if (!result.success) {
                throw new Error(result.error?.message || 'Gagal memperbarui rombel');
            }
            return result.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['rombels'] });
            toast.success('Rombel berhasil diperbarui');
        },
        onError: (error) => {
            toast.error(error.message);
        }
    });

    const deleteMutation = useMutation({
        mutationFn: async (id: string) => {
            if (!token) throw new Error('Unauthorized');
            const res = await client.master.rombel[':id'].$delete(
                { param: { id } },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            const result = (await res.json()) as unknown as APIResponse<any>;

            if (!result.success) {
                throw new Error(result.error?.message || 'Gagal menghapus rombel');
            }
            return result.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['rombels'] });
            toast.success('Rombel berhasil dihapus');
        },
        onError: (error) => {
            toast.error(error.message);
        }
    });

    return {
        createMutation,
        updateMutation,
        deleteMutation
    };
}
