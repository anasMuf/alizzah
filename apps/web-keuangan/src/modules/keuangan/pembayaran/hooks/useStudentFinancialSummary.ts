
import { useQuery } from '@tanstack/react-query';
import { client } from '@alizzah/api-client';
import { APIResponse } from '@alizzah/shared';

export function useStudentFinancialSummary(token: string | null, siswaId: string | null) {
    return useQuery({
        queryKey: ['pembayaran', 'summary', siswaId],
        queryFn: async () => {
            if (!token || !siswaId) return null;
            const res = await (client.keuangan as any).pembayaran.siswa[':id'].summary.$get(
                { param: { id: siswaId } },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            const result = (await res.json()) as unknown as APIResponse<any>;
            if (!res.ok || !result.success) {
                throw new Error(result.error?.message || 'Gagal mengambil ringkasan keuangan');
            }
            return result.data;
        },
        enabled: !!token && !!siswaId,
    });
}
