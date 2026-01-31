
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { client } from '@alizzah/api-client';
import { CreateSiswaInput, UpdateSiswaInput, PromoteSiswaInput } from '@alizzah/validators';
import { APIResponse } from '@alizzah/shared';
import { toast } from 'sonner';

export function useSiswaMutations(token: string | null) {
    const queryClient = useQueryClient();

    const createMutation = useMutation({
        mutationFn: async (data: CreateSiswaInput) => {
            if (!token) throw new Error('Unauthorized');
            const res = await client.siswa.$post(
                { json: data },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            const result = (await res.json()) as unknown as APIResponse<any>;

            if (!result.success) {
                throw new Error(result.error?.message || 'Gagal menambahkan siswa');
            }
            return result.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['siswas'] });
            toast.success('Data siswa berhasil ditambahkan');
        },
        onError: (error) => {
            toast.error(error.message);
        }
    });

    const updateMutation = useMutation({
        mutationFn: async ({ id, data }: { id: string; data: UpdateSiswaInput }) => {
            if (!token) throw new Error('Unauthorized');
            const res = await client.siswa[':id'].$put(
                { param: { id }, json: data },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            const result = (await res.json()) as unknown as APIResponse<any>;

            if (!result.success) {
                throw new Error(result.error?.message || 'Gagal memperbarui data siswa');
            }
            return result.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['siswas'] });
            toast.success('Data siswa berhasil diperbarui');
        },
        onError: (error) => {
            toast.error(error.message);
        }
    });

    const deleteMutation = useMutation({
        mutationFn: async (id: string) => {
            if (!token) throw new Error('Unauthorized');
            const res = await client.siswa[':id'].$delete(
                { param: { id } },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            const result = (await res.json()) as unknown as APIResponse<any>;

            if (!result.success) {
                throw new Error(result.error?.message || 'Gagal menghapus siswa');
            }
            return result.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['siswas'] });
            toast.success('Data siswa berhasil dihapus');
        },
        onError: (error) => {
            toast.error(error.message);
        }
    });

    const promoteMutation = useMutation({
        mutationFn: async (data: PromoteSiswaInput) => {
            if (!token) throw new Error('Unauthorized');
            const res = await client.siswa.promote.batch.$post(
                { json: data as any },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            const result = (await res.json()) as unknown as APIResponse<any>;

            if (!result.success) {
                throw new Error(result.error?.message || 'Gagal melakukan kenaikan kelas');
            }
            return result.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['siswas'] });
            toast.success('Proses kenaikan kelas berhasil diselesaikan');
        },
        onError: (error) => {
            toast.error(error.message);
        }
    });

    return {
        createMutation,
        updateMutation,
        deleteMutation,
        promoteMutation
    };
}
