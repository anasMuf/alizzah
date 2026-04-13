
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
                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 10 }}
                className="relative w-full max-w-xl bg-white rounded-xl shadow-2xl overflow-hidden border border-slate-200 flex flex-col max-h-[90vh]"
            >
                {/* Header */}
                <div className="px-4 py-3 border-b border-slate-100 flex justify-between items-center bg-indigo-50/30 shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="p-1.5 bg-indigo-600 text-white rounded-lg">
                            <User size={16} />
                        </div>
                        <div>
                            <h2 className="text-base font-black text-slate-900 leading-tight uppercase tracking-tight italic">Siswa Penerima Diskon</h2>
                            <p className="text-[9px] text-slate-400 font-bold italic underline decoration-indigo-200 underline-offset-2 uppercase tracking-widest">{diskon.nama}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-1 hover:bg-white rounded-full transition-all text-slate-400">
                        <X size={16} />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                    {siswaDiskons.length === 0 ? (
                        <div className="text-center py-10 space-y-2">
                            <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center text-slate-300 mx-auto border border-slate-100">
                                <User size={20} />
                            </div>
                            <div>
                                <p className="text-[11px] font-black text-slate-900 uppercase tracking-widest italic">Belum ada siswa</p>
                                <p className="text-[9px] text-slate-400 font-bold italic uppercase tracking-widest leading-none mt-1">Diskon ini belum diberikan ke siswa manapun.</p>
                            </div>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 gap-1.5">
                            {siswaDiskons.map((sd: any) => (
                                <div
                                    key={sd.id}
                                    className="p-2 bg-slate-50/50 rounded-lg border border-slate-100 flex items-center justify-between group hover:bg-white hover:border-indigo-200 transition-all hover:shadow-lg hover:shadow-indigo-500/5 hover:-translate-y-0.5"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center text-indigo-600 font-black border border-slate-200 group-hover:border-indigo-100 text-xs shadow-sm">
                                            {sd.siswa.namaLengkap.charAt(0)}
                                        </div>
                                        <div>
                                            <div className="font-black text-slate-900 leading-none mb-1 text-xs uppercase tracking-tight italic">{sd.siswa.namaLengkap}</div>
                                            <div className="text-[9px] text-slate-400 font-black tracking-widest uppercase mb-1.5">{sd.siswa.nis} • {sd.siswa.rombel?.nama}</div>

                                            <div className="flex items-center gap-2">
                                                <div className="flex items-center gap-1.5 text-[8px] font-black text-slate-500 bg-white px-1.5 py-0.5 rounded border border-slate-100 uppercase tracking-widest italic">
                                                    <Calendar size={10} className="text-indigo-400" />
                                                    {new Date(sd.tanggalMulai).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                                                    {sd.tanggalBerakhir ? ` - ${new Date(sd.tanggalBerakhir).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}` : ' (SELAMANYA)'}
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-1 opacity-10 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button
                                            onClick={() => setDeleteId(sd.id)}
                                            className="p-1 px-2 text-rose-500 hover:bg-rose-50 rounded border border-transparent hover:border-rose-100 transition-all"
                                            title="Batalkan Pemberian"
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Info Footer */}
                <div className="px-4 py-2 bg-slate-50 border-t border-slate-100 flex items-center gap-2 text-slate-400 shrink-0">
                    <Info size={12} className="text-indigo-500 shrink-0" />
                    <p className="text-[9px] font-black uppercase tracking-widest italic leading-none">TOTAL: {siswaDiskons.length} SISWA TERDAFTAR</p>
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
