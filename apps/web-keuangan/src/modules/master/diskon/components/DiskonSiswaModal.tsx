
import { useAtomValue } from 'jotai';
import { tokenAtom } from '~/stores/auth';
import { useDiskonMutations } from '../hooks/useDiskonMutations';
import {
    X,
    User,
    Calendar,
    Trash2,
    Info
} from 'lucide-react';
import { motion } from 'framer-motion';
import { ConfirmDialog } from '~/components/ui/ConfirmDialog';
import { useState } from 'react';

interface DiskonSiswaModalProps {
    isOpen: boolean;
    onClose: () => void;
    diskon: any;
}

export function DiskonSiswaModal({ isOpen, onClose, diskon }: DiskonSiswaModalProps) {
    const token = useAtomValue(tokenAtom);
    const { removeAssignmentMutation } = useDiskonMutations(token);
    const [deleteId, setDeleteId] = useState<string | null>(null);

    if (!isOpen || !diskon) return null;

    const siswaDiskons = diskon.siswaDiskons || [];

    const handleRemove = async () => {
        if (deleteId) {
            await removeAssignmentMutation.mutateAsync(deleteId);
            setDeleteId(null);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={onClose}
                className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            />

            <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="relative w-full max-w-2xl bg-white rounded-[2.5rem] shadow-2xl overflow-hidden border border-slate-200 flex flex-col max-h-[85vh]"
            >
                {/* Header */}
                <div className="px-8 py-6 border-b border-slate-100 flex justify-between items-center bg-indigo-50/30">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-indigo-600 text-white rounded-2xl">
                            <User size={24} />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-slate-900">Siswa Penerima Diskon</h2>
                            <p className="text-xs text-slate-500 font-medium italic">{diskon.nama}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white rounded-full transition-all text-slate-400">
                        <X size={20} />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-8">
                    {siswaDiskons.length === 0 ? (
                        <div className="text-center py-12 space-y-3">
                            <div className="w-16 h-16 bg-slate-50 rounded-3xl flex items-center justify-center text-slate-300 mx-auto">
                                <User size={32} />
                            </div>
                            <div>
                                <p className="text-slate-900 font-bold">Belum ada siswa</p>
                                <p className="text-xs text-slate-400 font-medium italic">Diskon ini belum diberikan ke siswa manapun.</p>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {siswaDiskons.map((sd: any) => (
                                <div
                                    key={sd.id}
                                    className="p-5 bg-slate-50 rounded-3xl border border-slate-100 flex items-center justify-between group hover:bg-white hover:border-indigo-200 transition-all hover:shadow-lg hover:shadow-indigo-500/5"
                                >
                                    <div className="flex items-center gap-5">
                                        <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-indigo-600 font-bold border border-slate-200 group-hover:border-indigo-100">
                                            {sd.siswa.namaLengkap.charAt(0)}
                                        </div>
                                        <div>
                                            <div className="font-bold text-slate-900 leading-none mb-1">{sd.siswa.namaLengkap}</div>
                                            <div className="text-[10px] text-slate-400 font-mono tracking-tighter uppercase">{sd.siswa.nis} • {sd.siswa.rombel?.nama}</div>

                                            <div className="flex items-center gap-3 mt-2">
                                                <div className="flex items-center gap-1 text-[10px] font-bold text-slate-500 bg-white px-2 py-0.5 rounded-full border border-slate-100">
                                                    <Calendar size={10} className="text-indigo-400" />
                                                    {new Date(sd.tanggalMulai).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                                                    {sd.tanggalBerakhir ? ` - ${new Date(sd.tanggalBerakhir).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}` : ' (Selamanya)'}
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button
                                            onClick={() => setDeleteId(sd.id)}
                                            className="p-2.5 text-rose-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all"
                                            title="Batalkan Pemberian"
                                        >
                                            <Trash2 size={18} />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Info Footer */}
                <div className="px-8 py-5 bg-slate-50/80 border-t border-slate-100 flex items-center gap-3 text-slate-500">
                    <Info size={16} className="text-indigo-500 shrink-0" />
                    <p className="text-[10px] font-bold uppercase tracking-widest">Total: {siswaDiskons.length} Siswa</p>
                </div>
            </motion.div>

            <ConfirmDialog
                isOpen={!!deleteId}
                onClose={() => setDeleteId(null)}
                onConfirm={handleRemove}
                title="Batalkan Diskon Siswa"
                description="Apakah Anda yakin ingin membatalkan pemberian diskon untuk siswa ini? Tindakan ini tidak akan menghapus tagihan yang sudah terbit."
                variant="danger"
                confirmText="Ya, Batalkan"
                isLoading={removeAssignmentMutation.isPending}
            />
        </div>
    );
}
