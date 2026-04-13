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
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden overflow-x-auto custom-scrollbar">
                    <table className="min-w-full divide-y divide-slate-200">
                        <thead className="bg-slate-50/50">
                            <tr>
                                <th className="px-4 py-2.5 text-left text-[10px] font-black uppercase tracking-widest text-slate-400">Info Pembayaran</th>
                                <th className="px-4 py-2.5 text-left text-[10px] font-black uppercase tracking-widest text-slate-400">Kategori & Tipe</th>
                                <th className="px-4 py-2.5 text-left text-[10px] font-black uppercase tracking-widest text-slate-400">Nominal Default</th>
                                <th className="px-4 py-2.5 text-left text-[10px] font-black uppercase tracking-widest text-slate-400">Status</th>
                                <th className="px-4 py-2.5 text-right text-[10px] font-black uppercase tracking-widest text-slate-400">Aksi</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 bg-white">
                            {data?.map((item) => (
                                <tr key={item.id} className="hover:bg-slate-50/10 transition-colors group">
                                    <td className="px-4 py-2.5">
                                        <div className="font-black text-slate-900 text-xs uppercase tracking-tight">{item.nama}</div>
                                        <div className="text-[9px] text-slate-400 font-mono mt-0.5 italic">{item.kode}</div>
                                    </td>
                                    <td className="px-4 py-2.5">
                                        <div className="flex flex-col gap-1">
                                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[8px] font-black bg-blue-50 text-blue-600 border border-blue-100 w-fit uppercase tracking-tighter">
                                                {item.kategori.replace('_', ' ')}
                                            </span>
                                            <span className="text-[9px] text-slate-400 font-black uppercase tracking-widest italic">
                                                {item.tipe}
                                            </span>
                                            {item.pemicu && item.pemicu !== 'MANUAL' && (
                                                <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[8px] font-black border mt-0.5 uppercase tracking-tighter ${item.pemicu === 'OTOMATIS_SISWA_BARU'
                                                    ? 'bg-blue-50 text-blue-700 border-blue-200'
                                                    : 'bg-orange-50 text-orange-700 border-orange-200'
                                                    }`}>
                                                    Trigger: {item.pemicu === 'OTOMATIS_SISWA_BARU' ? 'Siswa Baru' : 'Awal Tahun'}
                                                </span>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-4 py-2.5 whitespace-nowrap">
                                        <div className="font-black text-slate-800 text-xs font-mono">
                                            {formatCurrency(item.nominalDefault)}
                                        </div>
                                        <div className="text-[9px] text-slate-400 font-black uppercase tracking-tighter italic">
                                            {item.sifat === 'WAJIB' ? 'Wajib Dibayar' : 'Opsional'}
                                        </div>
                                    </td>
                                    <td className="px-4 py-2.5 whitespace-nowrap">
                                        <span
                                            className={`inline-flex items-center px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-tighter ${item.isAktif
                                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                                                : 'bg-slate-50 text-slate-400 border border-slate-100'
                                                }`}
                                        >
                                            {item.isAktif ? (
                                                <CheckCircle2 size={10} className="mr-1" />
                                            ) : (
                                                <XCircle size={10} className="mr-1" />
                                            )}
                                            {item.isAktif ? 'Aktif' : 'Non-Aktif'}
                                        </span>
                                    </td>
                                    <td className="px-4 py-2.5 whitespace-nowrap text-right text-xs">
                                        <div className="flex justify-end gap-1">
                                            <button
                                                onClick={() => onEdit?.(item)}
                                                className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                                                title="Edit"
                                            >
                                                <Edit2 size={14} />
                                            </button>
                                            <button
                                                onClick={() => setDeleteId(item.id)}
                                                className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                                                title="Hapus"
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {(!data || data.length === 0) && (
                                <tr>
                                    <td colSpan={5} className="px-4 py-20 text-center">
                                        <div className="flex flex-col items-center gap-2">
                                            <div className="w-10 h-10 bg-slate-50 rounded-full flex items-center justify-center text-slate-300">
                                                <Plus size={20} />
                                            </div>
                                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest italic">Belum ada data jenis pembayaran.</p>
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
