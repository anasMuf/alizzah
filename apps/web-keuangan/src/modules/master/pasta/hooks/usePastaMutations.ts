
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { client } from '@alizzah/api-client';
import { CreatePastaInput, UpdatePastaInput } from '@alizzah/validators';
import { toast } from 'sonner';

export function usePastaMutations(token: string | null) {
    const queryClient = useQueryClient();

    const createMutation = useMutation({
        mutationFn: async (data: CreatePastaInput) => {
            if (!token) throw new Error('Unauthorized');
            const res = await client.keuangan.master.pasta.$post(
                { json: data as any }, // casting because of date/string mismatch in RPC
                { headers: { Authorization: `Bearer ${token}` } }
            );
            if (!res.ok) {
                const errorData = await res.json() as any;
                throw new Error(errorData.error?.message || 'Gagal menambah program PASTA');
            }
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['pastas'] });
            toast.success('Program PASTA berhasil ditambahkan');
        },
        onError: (error: Error) => {
            toast.error(error.message);
        }
    });

    const updateMutation = useMutation({
        mutationFn: async ({ id, data }: { id: string, data: UpdatePastaInput }) => {
            if (!token) throw new Error('Unauthorized');
            const res = await client.keuangan.master.pasta[':id'].$put(
                {
                    param: { id },
                    json: data as any
                },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            if (!res.ok) {
                const errorData = await res.json() as any;
                throw new Error(errorData.error?.message || 'Gagal memperbarui program PASTA');
            }
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['pastas'] });
            toast.success('Program PASTA berhasil diperbarui');
        },
        onError: (error: Error) => {
            toast.error(error.message);
        }
    });

    const deleteMutation = useMutation({
        mutationFn: async (id: string) => {
            if (!token) throw new Error('Unauthorized');
            const res = await client.keuangan.master.pasta[':id'].$delete(
                { param: { id } },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            if (!res.ok) {
                const errorData = await res.json() as any;
                throw new Error(errorData.error?.message || 'Gagal menghapus program PASTA');
            }
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['pastas'] });
            toast.success('Program PASTA berhasil dihapus (Non-aktif)');
        },
        onError: (error: Error) => {
            toast.error(error.message);
        }
    });

    return { createMutation, updateMutation, deleteMutation };
}
