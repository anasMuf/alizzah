import { useState } from 'react';
import { useTahunAjaranList } from '../hooks/useTahunAjaranList';
import { useTahunAjaranMutations } from '../hooks/useTahunAjaranMutations';
import { useAtomValue } from 'jotai';
import { tokenAtom } from '~/stores/auth';
import { Edit2, Trash2 } from 'lucide-react';
import { ConfirmDialog } from '~/components/ui/ConfirmDialog';
import { TahunAjaran } from '@alizzah/api-client';

interface TahunAjaranTableProps {
    onEdit?: (item: TahunAjaran) => void;
}

export function TahunAjaranTable({ onEdit }: TahunAjaranTableProps) {
    const token = useAtomValue(tokenAtom);
    const { data, isLoading, error, refetch } = useTahunAjaranList(token);
    const { deleteMutation } = useTahunAjaranMutations(token);

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

    if (!token) {
        return (
            <div className="text-center py-20 bg-white rounded-2xl border border-dashed border-slate-300">
                <p className="text-slate-500">Silakan login terlebih dahulu untuk melihat data.</p>
            </div>
        );
    }

    return (
        <>
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden overflow-x-auto custom-scrollbar">
                <table className="min-w-full divide-y divide-slate-200">
                    <thead className="bg-slate-50/50">
                        <tr>
                            <th className="px-4 py-2.5 text-left text-[10px] font-black uppercase tracking-widest text-slate-400">Nama Periode</th>
                            <th className="hidden md:table-cell px-4 py-2.5 text-left text-[10px] font-black uppercase tracking-widest text-slate-400">Mulai</th>
                            <th className="hidden lg:table-cell px-4 py-2.5 text-left text-[10px] font-black uppercase tracking-widest text-slate-400">Selesai</th>
                            <th className="px-4 py-2.5 text-left text-[10px] font-black uppercase tracking-widest text-slate-400">Status</th>
                            <th className="px-4 py-2.5 text-right text-[10px] font-black uppercase tracking-widest text-slate-400">Aksi</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                        {data?.map((item) => (
                            <tr key={item.id} className="hover:bg-slate-50/10 transition-colors group">
                                <td className="px-4 py-2.5 whitespace-nowrap">
                                    <div className="font-black text-slate-900 text-xs uppercase tracking-tight">{item.nama}</div>
                                    <div className="md:hidden text-[9px] text-slate-500 mt-1 italic font-medium">
                                        {new Date(item.tanggalMulai).toLocaleDateString('id-ID')} - {new Date(item.tanggalSelesai).toLocaleDateString('id-ID')}
                                    </div>
                                </td>
                                <td className="hidden md:table-cell px-4 py-2.5 whitespace-nowrap text-slate-600 text-xs font-mono">
                                    {new Date(item.tanggalMulai).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                                </td>
                                <td className="hidden lg:table-cell px-4 py-2.5 whitespace-nowrap text-slate-600 text-xs font-mono">
                                    {new Date(item.tanggalSelesai).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                                </td>
                                <td className="px-4 py-2.5 whitespace-nowrap">
                                    <span
                                        className={`inline-flex items-center px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-tighter ${item.isAktif
                                            ? 'bg-blue-50 text-blue-700 border border-blue-100'
                                            : 'bg-slate-50 text-slate-400 border border-slate-100'
                                            }`}
                                    >
                                        <span className={`w-1 h-1 rounded-full mr-1.5 ${item.isAktif ? 'bg-blue-500' : 'bg-slate-300'}`}></span>
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
                                <td colSpan={5} className="px-6 py-20 text-center text-slate-500">
                                    Belum ada data tahun ajaran.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            <ConfirmDialog
                isOpen={!!deleteId}
                onClose={() => setDeleteId(null)}
                onConfirm={handleDelete}
                title="Hapus Tahun Ajaran"
                description="Apakah Anda yakin ingin menghapus tahun ajaran ini? Data yang sudah dihapus tidak dapat dikembalikan."
                variant="danger"
                confirmText="Hapus"
                isLoading={deleteMutation.isPending}
            />
        </>
    );
}
