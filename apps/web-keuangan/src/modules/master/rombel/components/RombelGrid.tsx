
import { useState } from 'react';
import { useRombelList, RombelWithRelations } from '../hooks/useRombelList';
import { useRombelMutations } from '../hooks/useRombelMutations';
import { useAtomValue } from 'jotai';
import { tokenAtom } from '~/stores/auth';
import { Edit2, Trash2, Users, School } from 'lucide-react';
import { ConfirmDialog } from '~/components/ui/ConfirmDialog';

interface RombelGridProps {
    onEdit?: (item: RombelWithRelations) => void;
    tahunAjaranId?: string;
}

export function RombelGrid({ onEdit, tahunAjaranId }: RombelGridProps) {
    const token = useAtomValue(tokenAtom);
    const { data, isLoading, error, refetch } = useRombelList(tahunAjaranId);
    const { deleteMutation } = useRombelMutations(token);

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

    if (!data || data.length === 0) {
        return (
            <div className="text-center py-20 bg-white rounded-2xl border border-dashed border-slate-300">
                <p className="text-slate-500">Belum ada data rombel untuk tahun ajaran ini.</p>
            </div>
        );
    }

    return (
        <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {data.map((item) => (
                    <div key={item.id} className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm hover:shadow-md transition-all group relative overflow-hidden flex flex-col justify-between">

                        {/* Header */}
                        <div>
                            <div className="flex items-start justify-between mb-3">
                                <div className="bg-blue-600 text-white w-fit min-w-8 px-2 h-7 rounded-lg flex items-center justify-center font-black shadow-lg shadow-blue-100 text-[10px]">
                                    {item.jenjang.kode}
                                </div>
                                <div className="flex flex-col items-end gap-1 text-right">
                                    <div className="flex items-center gap-1 bg-slate-50 px-2 py-0.5 rounded border border-slate-100">
                                        <Users size={12} className="text-slate-400" />
                                        <span className="text-[10px] font-black text-slate-700">{item.jumlahSiswa}/{item.kapasitas}</span>
                                    </div>
                                    {item.isMutasi && (
                                        <span className="bg-orange-50 text-orange-600 text-[8px] px-1.5 py-0.5 rounded font-black uppercase tracking-widest border border-orange-100">
                                            Mutasi
                                        </span>
                                    )}
                                </div>
                            </div>

                            <h3 className="text-sm font-black text-slate-900 mb-0.5 line-clamp-1 uppercase tracking-tight italic" title={item.nama}>{item.nama}</h3>
                            <div className="flex items-center gap-1.5 text-slate-400 text-[10px] mb-3 uppercase font-bold">
                                <School size={12} />
                                <span className="line-clamp-1 italic">{item.waliKelas || 'No Wali Kelas'}</span>
                            </div>

                            {/* Progress Bar for Capacity */}
                            <div className="relative h-1.5 w-full bg-slate-50 rounded-full overflow-hidden mb-1">
                                <div
                                    className={`absolute top-0 left-0 h-full rounded-full transition-all duration-500 ${item.kapasitasTerpakai >= 100 ? 'bg-red-500' :
                                        item.kapasitasTerpakai >= 80 ? 'bg-amber-500' : 'bg-blue-500'
                                        }`}
                                    style={{ width: `${Math.min(item.kapasitasTerpakai, 100)}%` }}
                                ></div>
                            </div>
                            <div className="flex justify-between text-[8px] uppercase font-black text-slate-300 tracking-widest">
                                <span>Kapasitas</span>
                                <span>{item.kapasitasTerpakai}%</span>
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center justify-end gap-1 mt-4 border-t pt-3 border-slate-50">
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
                    </div>
                ))}
            </div>

            <ConfirmDialog
                isOpen={!!deleteId}
                onClose={() => setDeleteId(null)}
                onConfirm={handleDelete}
                title="Hapus Rombel"
                description="Apakah Anda yakin ingin menghapus rombel ini? Pastikan tidak ada siswa yang terdaftar di dalamnya."
                variant="danger"
                confirmText="Hapus"
                isLoading={deleteMutation.isPending}
            />
        </>
    );
}
