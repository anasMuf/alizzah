'use client';

import { useState } from 'react';
import { useJenjangList } from '../hooks/useJenjangList';
import { useJenjangMutations } from '../hooks/useJenjangMutations';
import { useAtomValue } from 'jotai';
import { tokenAtom } from '~/stores/auth';
import { Edit2, Trash2 } from 'lucide-react';
import { ConfirmDialog } from '~/components/ui/ConfirmDialog';
import { Jenjang } from '@alizzah/api-client';

interface JenjangGridProps {
    onEdit?: (item: Jenjang) => void;
}

export function JenjangGrid({ onEdit }: JenjangGridProps) {
    const token = useAtomValue(tokenAtom);
    const { data, isLoading, error, refetch } = useJenjangList(token);
    const { deleteMutation } = useJenjangMutations(token);

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
                <p className="text-slate-500">Belum ada data jenjang.</p>
            </div>
        );
    }

    return (
        <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {data.map((item) => (
                    <div key={item.id} className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm hover:shadow-md transition-all group relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-20 h-20 bg-blue-50 rounded-bl-full -mr-10 -mt-10 group-hover:bg-blue-100 transition-colors z-0"></div>

                        <div className="relative z-10">
                            <div className="flex items-start justify-between mb-3">
                                <div className="bg-blue-600 text-white w-fit min-w-8 px-2.5 h-8 rounded-lg flex items-center justify-center font-black text-xs shadow-lg shadow-blue-100">
                                    {item.kode}
                                </div>
                                <div className="flex flex-col items-end gap-1 text-right">
                                    <span className="text-slate-300 text-[10px] font-mono font-bold">#{item.urutan}</span>
                                    {(item as any).isLevelAwal && (
                                        <span className="bg-blue-50 text-blue-600 text-[8px] px-1.5 py-0.5 rounded font-black uppercase tracking-widest border border-blue-100">
                                            Gatekeeper
                                        </span>
                                    )}
                                </div>
                            </div>

                            <h3 className="text-sm font-black text-slate-900 mb-1 uppercase tracking-tight italic leading-none">{item.nama}</h3>
                            <p className="text-slate-400 text-[10px] uppercase font-bold tracking-widest mb-4">Kelompok: <span className="text-slate-700">{item.kelompok}</span></p>

                            <div className="flex items-center justify-end gap-1 mt-2 border-t pt-3 border-slate-50">
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
                    </div>
                ))}
            </div>

            <ConfirmDialog
                isOpen={!!deleteId}
                onClose={() => setDeleteId(null)}
                onConfirm={handleDelete}
                title="Hapus Jenjang"
                description="Apakah Anda yakin ingin menghapus jenjang ini? Data yang sudah dihapus tidak dapat dikembalikan."
                variant="danger"
                confirmText="Hapus"
                isLoading={deleteMutation.isPending}
            />
        </>
    );
}
