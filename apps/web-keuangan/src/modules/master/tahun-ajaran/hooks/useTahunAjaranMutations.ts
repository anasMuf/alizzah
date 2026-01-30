import { useMutation, useQueryClient } from '@tanstack/react-query';
import { client } from '@alizzah/api-client';
import { APIResponse } from '@alizzah/shared';
import { CreateTahunAjaranInput, UpdateTahunAjaranInput } from '@alizzah/validators';
import { toast } from 'sonner';

export function useTahunAjaranMutations(token: string | null) {
    const queryClient = useQueryClient();

    const createMutation = useMutation({
        mutationFn: async (data: CreateTahunAjaranInput) => {
            if (!token) throw new Error('Unauthorized');
            const res = await client.master['tahun-ajaran'].$post(
                { json: data },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            const result = (await res.json()) as unknown as APIResponse<any>;
            if (!res.ok || !result.success) {
                throw new Error(result.error?.message || 'Gagal menambahkan tahun ajaran');
            }
            return result.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['tahun-ajaran'] });
            toast.success('Tahun ajaran berhasil ditambahkan');
        },
        onError: (error) => {
            toast.error(error.message);
        }
    });

    const updateMutation = useMutation({
        mutationFn: async ({ id, data }: { id: string; data: UpdateTahunAjaranInput }) => {
            if (!token) throw new Error('Unauthorized');
            const res = await client.master['tahun-ajaran'][':id'].$put(
                { param: { id }, json: data },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            const result = (await res.json()) as unknown as APIResponse<any>;
            if (!res.ok || !result.success) {
                throw new Error(result.error?.message || 'Gagal memperbarui tahun ajaran');
            }
            return result.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['tahun-ajaran'] });
            toast.success('Tahun ajaran berhasil diperbarui');
        },
        onError: (error) => {
            toast.error(error.message);
        }
    });

    const deleteMutation = useMutation({
        mutationFn: async (id: string) => {
            if (!token) throw new Error('Unauthorized');
            const res = await client.master['tahun-ajaran'][':id'].$delete(
                { param: { id } },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            const result = (await res.json()) as unknown as APIResponse<any>;
            if (!res.ok || !result.success) {
                throw new Error(result.error?.message || 'Gagal menghapus tahun ajaran');
            }
            return result.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['tahun-ajaran'] });
            toast.success('Tahun ajaran berhasil dihapus');
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
