
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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {data.map((item) => (
                    <div key={item.id} className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm hover:shadow-md transition-all group relative overflow-hidden flex flex-col justify-between">

                        {/* Header */}
                        <div>
                            <div className="flex items-start justify-between mb-4">
                                <div className="bg-blue-600 text-white w-fit min-w-10 px-3 h-10 rounded-xl flex items-center justify-center font-bold shadow-lg shadow-blue-100 text-sm">
                                    {item.jenjang.kode}
                                </div>
                                <div className="flex flex-col items-end gap-1 text-right">
                                    <div className="flex items-center gap-1.5 bg-slate-100 px-2.5 py-1 rounded-lg">
                                        <Users size={14} className="text-slate-500" />
                                        <span className="text-xs font-bold text-slate-700">{item.jumlahSiswa}/{item.kapasitas}</span>
                                    </div>
                                    {item.isMutasi && (
                                        <span className="bg-orange-100 text-orange-700 text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
                                            Mutasi
                                        </span>
                                    )}
                                </div>
                            </div>

                            <h3 className="text-lg font-bold text-slate-900 mb-1 line-clamp-1" title={item.nama}>{item.nama}</h3>
                            <div className="flex items-center gap-2 text-slate-500 text-sm mb-4">
                                <School size={16} />
                                <span className="font-medium">{item.waliKelas || 'Belum ada Wali Kelas'}</span>
                            </div>

                            {/* Progress Bar for Capacity */}
                            <div className="relative h-2 w-full bg-slate-100 rounded-full overflow-hidden mb-1">
                                <div
                                    className={`absolute top-0 left-0 h-full rounded-full transition-all duration-500 ${item.kapasitasTerpakai >= 100 ? 'bg-red-500' :
                                        item.kapasitasTerpakai >= 80 ? 'bg-amber-500' : 'bg-blue-500'
                                        }`}
                                    style={{ width: `${Math.min(item.kapasitasTerpakai, 100)}%` }}
                                ></div>
                            </div>
                            <div className="flex justify-between text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                                <span>Kapasitas</span>
                                <span>{item.kapasitasTerpakai}%</span>
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center justify-end gap-2 mt-4 border-t pt-4 border-slate-50">
                            <button
                                onClick={() => onEdit?.(item)}
                                className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                                title="Edit"
                            >
                                <Edit2 size={18} />
                            </button>
                            <button
                                onClick={() => setDeleteId(item.id)}
                                className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                                title="Hapus"
                            >
                                <Trash2 size={18} />
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
