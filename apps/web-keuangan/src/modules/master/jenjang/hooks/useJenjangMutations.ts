import { useMutation, useQueryClient } from '@tanstack/react-query';
import { client } from '@alizzah/api-client';
import { APIResponse } from '@alizzah/shared';
import { CreateJenjangInput, UpdateJenjangInput } from '@alizzah/validators';
import { toast } from 'sonner';

export function useJenjangMutations(token: string | null) {
    const queryClient = useQueryClient();

    const createMutation = useMutation({
        mutationFn: async (data: CreateJenjangInput) => {
            if (!token) throw new Error('Unauthorized');
            const res = await client.master.jenjang.$post(
                { json: data },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            const result = (await res.json()) as unknown as APIResponse<any>;
            if (!res.ok || !result.success) {
                throw new Error(result.error?.message || 'Gagal menambahkan jenjang');
            }
            return result.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['jenjang'] });
            toast.success('Jenjang berhasil ditambahkan');
        },
        onError: (error) => {
            toast.error(error.message);
        }
    });

    const updateMutation = useMutation({
        mutationFn: async ({ id, data }: { id: string; data: UpdateJenjangInput }) => {
            if (!token) throw new Error('Unauthorized');
            const res = await client.master.jenjang[':id'].$put(
                { param: { id }, json: data },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            const result = (await res.json()) as unknown as APIResponse<any>;
            if (!res.ok || !result.success) {
                throw new Error(result.error?.message || 'Gagal memperbarui jenjang');
            }
            return result.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['jenjang'] });
            toast.success('Jenjang berhasil diperbarui');
        },
        onError: (error) => {
            toast.error(error.message);
        }
    });

    const deleteMutation = useMutation({
        mutationFn: async (id: string) => {
            if (!token) throw new Error('Unauthorized');
            const res = await client.master.jenjang[':id'].$delete(
                { param: { id } },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            const result = (await res.json()) as unknown as APIResponse<any>;
            if (!res.ok || !result.success) {
                throw new Error(result.error?.message || 'Gagal menghapus jenjang');
            }
            return result.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['jenjang'] });
            toast.success('Jenjang berhasil dihapus');
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
