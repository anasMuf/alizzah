import { useMutation, useQueryClient } from '@tanstack/react-query';
import { client } from '@alizzah/api-client';
import { APIResponse } from '@alizzah/shared';
import { toast } from 'sonner';

export function useKasMutations(token: string | null) {
    const queryClient = useQueryClient();

    const kasirMasuk = useMutation({
        mutationFn: async (data: any) => {
            if (!token) throw new Error('Unauthorized');
            const res = await (client.keuangan as any).kas.masuk.$post(
                { json: data },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            const result = (await res.json()) as unknown as APIResponse<any>;
            if (!res.ok || !result.success) {
                throw new Error(result.error?.message || 'Gagal mencatat uang masuk');
            }
            return result.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['kas'] });
            toast.success('Uang masuk berhasil dicatat');
        },
        onError: (error: any) => {
            toast.error(error.message);
        }
    });

    const kasirKeluar = useMutation({
        mutationFn: async (data: any) => {
            if (!token) throw new Error('Unauthorized');
            const res = await (client.keuangan as any).kas.keluar.$post(
                { json: data },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            const result = (await res.json()) as unknown as APIResponse<any>;
            if (!res.ok || !result.success) {
                throw new Error(result.error?.message || 'Gagal mencatat uang keluar');
            }
            return result.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['kas'] });
            toast.success('Uang keluar berhasil dicatat');
        },
        onError: (error: any) => {
            toast.error(error.message);
        }
    });

    const transferKas = useMutation({
        mutationFn: async (data: any) => {
            if (!token) throw new Error('Unauthorized');
            const res = await (client.keuangan as any).kas.transfer.$post(
                { json: data },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            const result = (await res.json()) as unknown as APIResponse<any>;
            if (!res.ok || !result.success) {
                throw new Error(result.error?.message || 'Gagal melakukan transfer');
            }
            return result.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['kas'] });
            toast.success('Transfer berhasil dilakukan');
        },
        onError: (error: any) => {
            toast.error(error.message);
        }
    });

    const submitRekonsiliasi = useMutation({
        mutationFn: async (data: any) => {
            if (!token) throw new Error('Unauthorized');
            const res = await (client.keuangan as any).kas.rekonsiliasi.$post(
                { json: data },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            const result = (await res.json()) as unknown as APIResponse<any>;
            if (!res.ok || !result.success) {
                throw new Error(result.error?.message || 'Gagal mengirim rekonsiliasi');
            }
            return result.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['kas'] });
            toast.success('Rekonsiliasi berhasil disimpan');
        },
        onError: (error: any) => {
            toast.error(error.message);
        }
    });

    return {
        kasirMasuk,
        kasirKeluar,
        transferKas,
        submitRekonsiliasi
    };
}
