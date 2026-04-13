import { useMutation, useQueryClient } from '@tanstack/react-query';
import { client } from '@alizzah/api-client';
import { toast } from 'sonner';

export function useDaycareMutations(token: string | null) {
    const queryClient = useQueryClient();

    const createMutation = useMutation({
        mutationFn: async (data: any) => {
            if (!token) throw new Error('Unauthorized');
            // @ts-ignore
            const res = await client.keuangan.daycare.peserta.$post(
                { json: data },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            if (!res.ok) {
                const err = await res.json() as any;
                throw new Error(err.message || 'Failed to create peserta daycare');
            }
            return res.json();
        },
        onSuccess: (res: any) => {
            toast.success(res.message || 'Peserta daycare berhasil didaftarkan');
            queryClient.invalidateQueries({ queryKey: ['daycare', 'peserta'] });
        },
        onError: (err: any) => {
            toast.error(err.message);
        }
    });

    const updateMutation = useMutation({
        mutationFn: async ({ id, data }: { id: string, data: any }) => {
            if (!token) throw new Error('Unauthorized');
            // @ts-ignore
            const res = await client.keuangan.daycare.peserta[':id'].$put(
                { param: { id }, json: data },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            if (!res.ok) {
                const err = await res.json() as any;
                throw new Error(err.message || 'Failed to update peserta daycare');
            }
            return res.json();
        },
        onSuccess: (res: any) => {
            toast.success(res.message || 'Data peserta daycare berhasil diperbarui');
            queryClient.invalidateQueries({ queryKey: ['daycare', 'peserta'] });
        },
        onError: (err: any) => {
            toast.error(err.message);
        }
    });

    const deactivateMutation = useMutation({
        mutationFn: async (id: string) => {
            if (!token) throw new Error('Unauthorized');
            // @ts-ignore
            const res = await client.keuangan.daycare.peserta[':id'].$delete(
                { param: { id } },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            if (!res.ok) {
                const err = await res.json() as any;
                throw new Error(err.message || 'Failed to deactivate peserta daycare');
            }
            return res.json();
        },
        onSuccess: (res: any) => {
            toast.success(res.message || 'Peserta daycare berhasil dinonaktifkan');
            queryClient.invalidateQueries({ queryKey: ['daycare', 'peserta'] });
        },
        onError: (err: any) => {
            toast.error(err.message);
        }
    });

    const createTagihanHarianMutation = useMutation({
        mutationFn: async (data: any) => {
            if (!token) throw new Error('Unauthorized');
            // @ts-ignore
            const res = await client.keuangan.daycare['tagihan-harian'].$post(
                { json: data },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            if (!res.ok) {
                const err = await res.json() as any;
                throw new Error(err.message || 'Failed to create tagihan harian');
            }
            return res.json();
        },
        onSuccess: (res: any) => {
            toast.success(res.message || 'Tagihan harian daycare berhasil dibuat');
            queryClient.invalidateQueries({ queryKey: ['tagihans'] });
        },
        onError: (err: any) => {
            toast.error(err.message);
        }
    });

    const batchTagihanHarianMutation = useMutation({
        mutationFn: async (data: any) => {
            if (!token) throw new Error('Unauthorized');
            // @ts-ignore
            const res = await client.keuangan.daycare['tagihan-harian'].batch.$post(
                { json: data },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            if (!res.ok) {
                const err = await res.json() as any;
                throw new Error(err.message || 'Failed to create batch tagihan harian');
            }
            return res.json();
        },
        onSuccess: (res: any) => {
            toast.success(res.message || 'Proses pembuatan tagihan harian massal selesai');
            queryClient.invalidateQueries({ queryKey: ['tagihans'] });
        },
        onError: (err: any) => {
            toast.error(err.message);
        }
    });

    return {
        createMutation,
        updateMutation,
        deactivateMutation,
        createTagihanHarianMutation,
        batchTagihanHarianMutation
    };
}
