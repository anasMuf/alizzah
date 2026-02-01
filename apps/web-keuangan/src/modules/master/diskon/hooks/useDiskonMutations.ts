
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { client } from '@alizzah/api-client';
import { APIResponse } from '@alizzah/shared';
import { CreateDiskonInput, UpdateDiskonInput, AssignDiskonInput } from '@alizzah/validators';
import { toast } from 'sonner';

export function useDiskonMutations(token: string | null) {
    const queryClient = useQueryClient();

    const createMutation = useMutation({
        mutationFn: async (data: CreateDiskonInput) => {
            if (!token) throw new Error('Unauthorized');
            const res = await (client.keuangan.master as any).diskon.$post(
                { json: data },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            const result = (await res.json()) as unknown as APIResponse<any>;
            if (!res.ok || !result.success) {
                throw new Error(result.error?.message || 'Gagal menambahkan diskon');
            }
            return result.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['diskon'] });
            toast.success('Diskon berhasil ditambahkan');
        },
        onError: (error) => {
            toast.error(error.message);
        }
    });

    const updateMutation = useMutation({
        mutationFn: async ({ id, data }: { id: string; data: UpdateDiskonInput }) => {
            if (!token) throw new Error('Unauthorized');
            const res = await (client.keuangan.master as any).diskon[':id'].$put(
                { param: { id }, json: data },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            const result = (await res.json()) as unknown as APIResponse<any>;
            if (!res.ok || !result.success) {
                throw new Error(result.error?.message || 'Gagal memperbarui diskon');
            }
            return result.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['diskon'] });
            toast.success('Diskon berhasil diperbarui');
        },
        onError: (error) => {
            toast.error(error.message);
        }
    });

    const deleteMutation = useMutation({
        mutationFn: async (id: string) => {
            if (!token) throw new Error('Unauthorized');
            const res = await (client.keuangan.master as any).diskon[':id'].$delete(
                { param: { id } },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            const result = (await res.json()) as unknown as APIResponse<any>;
            if (!res.ok || !result.success) {
                throw new Error(result.error?.message || 'Gagal menghapus diskon');
            }
            return result.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['diskon'] });
            toast.success('Diskon berhasil dihapus');
        },
        onError: (error) => {
            toast.error(error.message);
        }
    });

    const assignMutation = useMutation({
        mutationFn: async (data: AssignDiskonInput) => {
            if (!token) throw new Error('Unauthorized');
            const res = await (client.keuangan.master as any).diskon.assign.$post(
                { json: data },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            const result = (await res.json()) as unknown as APIResponse<any>;
            if (!res.ok || !result.success) {
                throw new Error(result.error?.message || 'Gagal memberikan diskon ke siswa');
            }
            return result.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['diskon'] });
            queryClient.invalidateQueries({ queryKey: ['siswa'] }); // Invalidate siswa because their discounts changed
            toast.success('Diskon berhasil diberikan ke siswa');
        },
        onError: (error) => {
            toast.error(error.message);
        }
    });

    const removeAssignmentMutation = useMutation({
        mutationFn: async (id: string) => {
            if (!token) throw new Error('Unauthorized');
            const res = await (client.keuangan.master as any).diskon.assign[':id'].$delete(
                { param: { id } },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            const result = (await res.json()) as unknown as APIResponse<any>;
            if (!res.ok || !result.success) {
                throw new Error(result.error?.message || 'Gagal menghapus pemberian diskon');
            }
            return result.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['diskon'] });
            queryClient.invalidateQueries({ queryKey: ['siswa'] });
            toast.success('Pemberian diskon berhasil dihapus');
        },
        onError: (error) => {
            toast.error(error.message);
        }
    });

    return {
        createMutation,
        updateMutation,
        deleteMutation,
        assignMutation,
        removeAssignmentMutation
    };
}
