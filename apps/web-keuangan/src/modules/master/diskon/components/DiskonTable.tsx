
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
            <div className="space-y-3">
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden overflow-x-auto custom-scrollbar">
                    <table className="min-w-full divide-y divide-slate-200">
                        <thead className="bg-slate-50/50 text-[10px]">
                            <tr>
                                <th className="px-3 py-2 text-left text-[8px] font-black uppercase tracking-[0.2em] text-slate-400 italic">INFO DISKON</th>
                                <th className="px-3 py-2 text-left text-[8px] font-black uppercase tracking-[0.2em] text-slate-400 italic">POTONGAN</th>
                                <th className="px-3 py-2 text-left text-[8px] font-black uppercase tracking-[0.2em] text-slate-400 italic">BERLAKU UNTUK</th>
                                <th className="px-3 py-2 text-center text-[8px] font-black uppercase tracking-[0.2em] text-slate-400 italic">STATUS</th>
                                <th className="px-3 py-2 text-right text-[8px] font-black uppercase tracking-[0.2em] text-slate-400 italic">AKSI</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 bg-white">
                            {data?.map((item) => (
                                <tr key={item.id} className="hover:bg-slate-50/50 transition-colors group">
                                    <td className="px-3 py-2">
                                        <div className="flex items-center gap-2">
                                            <div className="p-1 bg-indigo-50 text-indigo-600 rounded">
                                                <Ticket size={12} />
                                            </div>
                                            <div>
                                                <div className="font-black text-slate-900 text-[10px] uppercase tracking-tight italic leading-none">{item.nama}</div>
                                                <div className="text-[8px] text-slate-400 font-black tracking-widest leading-none mt-1 lowercase italic">{item.kode}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-3 py-2">
                                        <div className="flex items-center gap-2">
                                            {item.tipePotongan === 'PERSENTASE' ? (
                                                <div className="flex items-center gap-1 px-1.5 py-0.5 rounded text-orange-700 bg-orange-50 border border-orange-100 font-black text-[9px] italic">
                                                    <Percent size={10} />
                                                    <span>{item.nilaiPotongan}%</span>
                                                </div>
                                            ) : (
                                                <div className="flex items-center gap-1 px-1.5 py-0.5 rounded text-emerald-700 bg-emerald-50 border border-emerald-100 font-black text-[9px] italic font-mono">
                                                    <Banknote size={10} />
                                                    <span>{formatCurrency(item.nilaiPotongan)}</span>
                                                </div>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-3 py-2">
                                        <div className="text-[9px] font-black text-slate-700 uppercase tracking-tight italic leading-none">
                                            {item.jenisPembayaran?.nama}
                                        </div>
                                        <div className="text-[8px] text-slate-400 font-black uppercase tracking-widest italic leading-none mt-1">
                                            {item.jenisPembayaran?.kode}
                                        </div>
                                    </td>
                                    <td className="px-3 py-2 whitespace-nowrap text-center">
                                        <span
                                            className={`inline-flex items-center px-1.5 py-0.5 rounded-sm text-[7px] font-black uppercase tracking-widest ${item.isAktif
                                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                                                : 'bg-slate-50 text-slate-400 border border-slate-200'
                                                }`}
                                        >
                                            {item.isAktif ? (
                                                <CheckCircle2 size={10} className="mr-1" />
                                            ) : (
                                                <XCircle size={10} className="mr-1" />
                                            )}
                                            {item.isAktif ? 'AKTIF' : 'NON-AKTIF'}
                                        </span>
                                    </td>
                                    <td className="px-3 py-2 whitespace-nowrap text-right">
                                        <div className="flex justify-end gap-1 text-slate-300">
                                            <button
                                                onClick={() => onViewSiswa?.(item)}
                                                className="p-1 hover:text-blue-600 hover:bg-blue-50 rounded transition-all active:scale-95"
                                                title="Lihat Siswa Penerima"
                                            >
                                                <Eye size={12} />
                                            </button>
                                            <button
                                                onClick={() => onEdit?.(item)}
                                                className="p-1 hover:text-slate-600 hover:bg-slate-50 rounded transition-all active:scale-95"
                                                title="Edit Master Diskon"
                                            >
                                                <Edit2 size={12} />
                                            </button>
                                            <button
                                                onClick={() => onAssign?.(item)}
                                                className="p-1 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-all active:scale-95"
                                                title="Berikan ke Siswa"
                                            >
                                                <Users size={12} />
                                            </button>
                                            <button
                                                onClick={() => setDeleteId(item.id)}
                                                className="p-1 hover:text-rose-600 hover:bg-rose-50 rounded transition-all active:scale-95"
                                                title="Hapus"
                                            >
                                                <Trash2 size={12} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {(!data || data.length === 0) && (
                                <tr>
                                    <td colSpan={5} className="px-6 py-12 text-center">
                                        <div className="max-w-xs mx-auto space-y-2">
                                            <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center text-slate-300 mx-auto">
                                                <Ticket size={20} />
                                            </div>
                                            <div>
                                                <p className="text-slate-900 font-black text-[10px] uppercase tracking-widest italic">Belum ada data dispensasi</p>
                                                <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest italic leading-none mt-1">Mulai dengan menambahkan jenis dispensasi baru.</p>
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
