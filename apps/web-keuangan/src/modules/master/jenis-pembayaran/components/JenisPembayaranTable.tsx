import { useState } from 'react';
import { useJenisPembayaranList } from '../hooks/useJenisPembayaranList';
import { useJenisPembayaranMutations } from '../hooks/useJenisPembayaranMutations';
import { useAtomValue } from 'jotai';
import { tokenAtom } from '~/stores/auth';
import { Plus, Edit2, Trash2, CheckCircle2, XCircle } from 'lucide-react';
import { ConfirmDialog } from '~/components/ui/ConfirmDialog';
import { formatCurrency } from '@alizzah/shared';

export function JenisPembayaranTable({ onEdit }: { onEdit?: (item: any) => void }) {
    const token = useAtomValue(tokenAtom);
    const { data, isLoading, error, refetch } = useJenisPembayaranList(token);
    const { deleteMutation } = useJenisPembayaranMutations(token);

    const [deleteId, setDeleteId] = useState<string | null>(null);

    const handleDelete = async () => {
        if (deleteId) {
            await deleteMutation.mutateAsync(deleteId);
            setDeleteId(null);
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="bg-red-50 border border-red-200 text-red-700 px-6 py-4 rounded-xl shadow-sm">
                <p className="font-semibold">Error</p>
                <p className="text-sm">{(error as Error).message}</p>
                <button
                    onClick={() => refetch()}
                    className="mt-3 bg-red-600 text-white px-4 py-1.5 rounded-lg text-sm hover:bg-red-700 transition-colors"
                >
                    Coba Lagi
                </button>
            </div>
        );
    }

    return (
        <>
            <div className="space-y-4">
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden overflow-x-auto custom-scrollbar">
                    <table className="min-w-full divide-y divide-slate-200">
                        <thead className="bg-slate-50/50">
                            <tr>
                                <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Info Pembayaran</th>
                                <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Kategori & Tipe</th>
                                <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Nominal Default</th>
                                <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Status</th>
                                <th className="px-6 py-4 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">Aksi</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 bg-white">
                            {data?.map((item) => (
                                <tr key={item.id} className="hover:bg-slate-50/50 transition-colors group">
                                    <td className="px-6 py-4">
                                        <div className="font-bold text-slate-900">{item.nama}</div>
                                        <div className="text-xs text-slate-400 font-mono mt-0.5">{item.kode}</div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex flex-col gap-1">
                                            <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-50 text-blue-600 border border-blue-100 w-fit">
                                                {item.kategori.replace('_', ' ')}
                                            </span>
                                            <span className="text-xs text-slate-500 font-medium italic">
                                                {item.tipe.toLowerCase()}
                                            </span>
                                            {item.pemicu && item.pemicu !== 'MANUAL' && (
                                                <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold border mt-0.5 ${item.pemicu === 'OTOMATIS_SISWA_BARU'
                                                    ? 'bg-blue-50 text-blue-700 border-blue-200'
                                                    : 'bg-orange-50 text-orange-700 border-orange-200'
                                                    }`}>
                                                    Trigger: {item.pemicu === 'OTOMATIS_SISWA_BARU' ? 'Siswa Baru' : 'Awal Tahun'}
                                                </span>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="font-bold text-slate-900">
                                            {formatCurrency(item.nominalDefault)}
                                        </div>
                                        <div className="text-[10px] text-slate-400 font-medium">
                                            {item.sifat === 'WAJIB' ? 'Wajib Dibayar' : 'Opsional'}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span
                                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${item.isAktif
                                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                                                : 'bg-slate-50 text-slate-500 border border-slate-200'
                                                }`}
                                        >
                                            {item.isAktif ? (
                                                <CheckCircle2 size={12} className="mr-1.5" />
                                            ) : (
                                                <XCircle size={12} className="mr-1.5" />
                                            )}
                                            {item.isAktif ? 'Aktif' : 'Non-Aktif'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                                        <div className="flex justify-end gap-2">
                                            <button
                                                onClick={() => onEdit?.(item)}
                                                className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                                                title="Edit"
                                            >
                                                <Edit2 size={18} />
                                            </button>
                                            <button
                                                onClick={() => setDeleteId(item.id)}
                                                className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                                                title="Hapus"
                                            >
                                                <Trash2 size={18} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {(!data || data.length === 0) && (
                                <tr>
                                    <td colSpan={5} className="px-6 py-20 text-center">
                                        <div className="flex flex-col items-center gap-2">
                                            <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center text-slate-300">
                                                <Plus size={24} />
                                            </div>
                                            <p className="text-slate-500 font-medium">Belum ada data jenis pembayaran.</p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            <ConfirmDialog
                isOpen={!!deleteId}
                onClose={() => setDeleteId(null)}
                onConfirm={handleDelete}
                title="Hapus Jenis Pembayaran"
                description="Apakah Anda yakin ingin menghapus jenis pembayaran ini? Data yang sudah dihapus tidak dapat dikembalikan."
                variant="danger"
                confirmText="Hapus"
                isLoading={deleteMutation.isPending}
            />
        </>
    );
}
