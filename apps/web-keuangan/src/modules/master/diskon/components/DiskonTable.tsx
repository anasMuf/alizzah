
import { useState } from 'react';
import { useDiskonList } from '../hooks/useDiskonList';
import { useDiskonMutations } from '../hooks/useDiskonMutations';
import { useAtomValue } from 'jotai';
import { tokenAtom } from '~/stores/auth';
import {
    Edit2,
    Trash2,
    CheckCircle2,
    XCircle,
    Ticket,
    Percent,
    Banknote,
    Users,
    Eye
} from 'lucide-react';
import { ConfirmDialog } from '~/components/ui/ConfirmDialog';
import { formatCurrency } from '@alizzah/shared';

export function DiskonTable({
    onEdit,
    onAssign,
    onViewSiswa
}: {
    onEdit?: (item: any) => void,
    onAssign?: (item: any) => void,
    onViewSiswa?: (item: any) => void
}) {
    const token = useAtomValue(tokenAtom);
    const { data, isLoading, error, refetch } = useDiskonList(token);
    const { deleteMutation } = useDiskonMutations(token);

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
                <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden overflow-x-auto custom-scrollbar">
                    <table className="min-w-full divide-y divide-slate-200">
                        <thead className="bg-slate-50/50">
                            <tr>
                                <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-slate-500">Info Diskon</th>
                                <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-slate-500">Jenis Potongan</th>
                                <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-slate-500">Berlaku Untuk</th>
                                <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-slate-500">Status</th>
                                <th className="px-6 py-4 text-right text-xs font-bold uppercase tracking-wider text-slate-500">Aksi</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 bg-white">
                            {data?.map((item) => (
                                <tr key={item.id} className="hover:bg-slate-50/50 transition-colors group">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl group-hover:scale-110 transition-transform">
                                                <Ticket size={20} />
                                            </div>
                                            <div>
                                                <div className="font-bold text-slate-900">{item.nama}</div>
                                                <div className="text-[10px] text-slate-400 font-mono tracking-wider mt-0.5">{item.kode}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-2">
                                            {item.tipePotongan === 'PERSENTASE' ? (
                                                <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-orange-50 text-orange-700 border border-orange-100">
                                                    <Percent size={14} />
                                                    <span className="font-bold text-sm">{item.nilaiPotongan}%</span>
                                                </div>
                                            ) : (
                                                <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-100">
                                                    <Banknote size={14} />
                                                    <span className="font-bold text-sm">{formatCurrency(item.nilaiPotongan)}</span>
                                                </div>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="text-sm font-semibold text-slate-700">
                                            {item.jenisPembayaran?.nama}
                                        </div>
                                        <div className="text-[10px] text-slate-400 italic">
                                            ID: {item.jenisPembayaran?.kode}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span
                                            className={`inline-flex items-center px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${item.isAktif
                                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                                                : 'bg-slate-50 text-slate-400 border border-slate-200'
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
                                        <div className="flex justify-end gap-1.5 text-slate-400">
                                            <button
                                                onClick={() => onViewSiswa?.(item)}
                                                className="p-2 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all"
                                                title="Lihat Siswa Penerima"
                                            >
                                                <Eye size={18} />
                                            </button>
                                            <button
                                                onClick={() => onEdit?.(item)}
                                                className="p-2 hover:text-slate-600 hover:bg-slate-50 rounded-xl transition-all"
                                                title="Edit Master Diskon"
                                            >
                                                <Edit2 size={18} />
                                            </button>
                                            <button
                                                onClick={() => onAssign?.(item)}
                                                className="p-2 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all"
                                                title="Berikan ke Siswa"
                                            >
                                                <Users size={18} />
                                            </button>
                                            <button
                                                onClick={() => setDeleteId(item.id)}
                                                className="p-2 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all"
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
                                    <td colSpan={5} className="px-6 py-24 text-center">
                                        <div className="max-w-xs mx-auto space-y-3">
                                            <div className="w-16 h-16 bg-slate-50 rounded-3xl flex items-center justify-center text-slate-300 mx-auto">
                                                <Ticket size={32} />
                                            </div>
                                            <div>
                                                <p className="text-slate-900 font-bold">Belum ada data diskon</p>
                                                <p className="text-xs text-slate-400">Mulai dengan menambahkan jenis diskon/beasiswa baru.</p>
                                            </div>
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
                title="Hapus Master Diskon"
                description="Hapus jenis diskon ini? Data riwayat diskon yang sudah terpasang pada siswa mungkin tidak dapat dihapus jika sudah digunakan dalam tagihan."
                variant="danger"
                confirmText="Hapus Diskon"
                isLoading={deleteMutation.isPending}
            />
        </>
    );
}
