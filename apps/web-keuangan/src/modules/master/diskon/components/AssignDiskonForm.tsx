
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { assignDiskonSchema, AssignDiskonInput } from '@alizzah/validators';
import { useDiskonMutations } from '../hooks/useDiskonMutations';
import { useSiswaList } from '~/modules/siswa/hooks/useSiswaList';
import { useAtomValue } from 'jotai';
import { tokenAtom } from '~/stores/auth';
import { X, UserCheck, Loader2, Search, Calendar, ChevronRight } from 'lucide-react';
import { motion } from 'framer-motion';

interface AssignDiskonFormProps {
    isOpen: boolean;
    onClose: () => void;
    diskon: any; // The discount type we are assigning
}

export function AssignDiskonForm({ isOpen, onClose, diskon }: AssignDiskonFormProps) {
    const token = useAtomValue(tokenAtom);
    const { assignMutation } = useDiskonMutations(token);

    // Student Search State
    const [search, setSearch] = useState('');
    const { data: siswaData, isLoading: loadingSiswa } = useSiswaList({
        search: search.length >= 2 ? search : undefined,
        limit: 10
    });

    const {
        register,
        handleSubmit,
        reset,
        setValue,
        watch,
        formState: { errors, isSubmitting }
    } = useForm<any>({
        resolver: zodResolver(assignDiskonSchema) as any,
        defaultValues: {
            diskonId: diskon?.id,
            tanggalMulai: new Date().toISOString().split('T')[0],
        }
    });

    const selectedSiswaId = watch('siswaId');
    const selectedSiswa = siswaData?.data?.find(s => s.id === selectedSiswaId);

    useEffect(() => {
        if (isOpen) {
            reset({
                diskonId: diskon?.id,
                tanggalMulai: new Date().toISOString().split('T')[0],
                siswaId: ''
            });
            setSearch('');
        }
    }, [isOpen, diskon, reset]);

    const onSubmit = async (data: AssignDiskonInput) => {
        try {
            await assignMutation.mutateAsync(data);
            onClose();
        } catch (error) {
            // Handled by mutation
        }
    };

    if (!isOpen) return null;

    const inputClass = "w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded focus:outline-none focus:ring-4 focus:ring-blue-500/10 transition-all font-black text-xs text-slate-900 placeholder:text-slate-400 placeholder:italic";
    const labelClass = "text-[10px] font-black text-slate-400 flex items-center gap-1.5 uppercase tracking-widest italic";

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
                className="relative w-full max-w-md bg-white rounded-xl shadow-2xl overflow-hidden border border-slate-200 flex flex-col max-h-[95vh]"
            >
                {/* Header */}
                <div className="px-4 py-3 border-b border-slate-100 flex justify-between items-center bg-indigo-50/30 shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="p-1.5 bg-indigo-600 text-white rounded-lg shadow-lg shadow-indigo-100">
                            <UserCheck size={16} />
                        </div>
                        <div>
                            <h2 className="text-base font-black text-slate-900 leading-tight uppercase tracking-tight italic">Berikan Diskon</h2>
                            <p className="text-[9px] text-indigo-600 font-black tracking-widest uppercase italic">{diskon?.nama}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-1 hover:bg-white hover:shadow-md rounded-full transition-all text-slate-400">
                        <X size={16} />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar p-4">
                    <form id="assign-diskon-form" onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                        {/* Hidden Inputs */}
                        <input type="hidden" {...register('diskonId')} />
                        <input type="hidden" {...register('siswaId')} />

                        {/* Student Search */}
                        <div className="space-y-2">
                            <label className={labelClass}><Search size={12} /> CARI SISWA</label>

                            {!selectedSiswaId ? (
                                <div className="space-y-2">
                                    <div className="relative">
                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                                        <input
                                            type="text"
                                            value={search}
                                            onChange={(e) => setSearch(e.target.value)}
                                            placeholder="Nama atau NIS siswa..."
                                            className={`${inputClass} pl-9`}
                                        />
                                    </div>

                                    <div className="bg-slate-50 rounded border border-slate-100 overflow-hidden">
                                        {loadingSiswa ? (
                                            <div className="p-4 text-center"><Loader2 className="animate-spin inline-block text-indigo-500" size={16} /></div>
                                        ) : search.length < 2 ? (
                                            <div className="p-4 text-center text-[9px] text-slate-400 font-black italic uppercase tracking-wider">Ketik minimal 2 karakter...</div>
                                        ) : (siswaData?.data?.length || 0) === 0 ? (
                                            <div className="p-4 text-center text-[9px] text-slate-400 font-black italic uppercase tracking-wider">Siswa tidak ditemukan.</div>
                                        ) : (
                                            <div className="divide-y divide-slate-100 max-h-40 overflow-y-auto custom-scrollbar">
                                                {siswaData?.data?.map((siswa: any) => (
                                                    <button
                                                        key={siswa.id}
                                                        type="button"
                                                        onClick={() => setValue('siswaId', siswa.id)}
                                                        className="w-full px-3 py-1.5 flex items-center justify-between hover:bg-white transition-colors group"
                                                    >
                                                        <div className="text-left">
                                                            <div className="text-[10px] font-black text-slate-900 group-hover:text-indigo-600 transition-colors uppercase tracking-tight italic">{siswa.namaLengkap}</div>
                                                            <div className="text-[8px] text-slate-400 font-black tracking-widest uppercase">{siswa.nis} • {siswa.rombel?.nama}</div>
                                                        </div>
                                                        <ChevronRight size={12} className="text-slate-300 group-hover:text-indigo-600 group-hover:translate-x-1 transition-all" />
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ) : (
                                <div className="p-2 bg-indigo-50 border border-indigo-100 rounded flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <div className="w-7 h-7 bg-white rounded flex items-center justify-center text-indigo-600 font-black border border-indigo-100 text-xs shadow-sm">
                                            {selectedSiswa?.namaLengkap.charAt(0)}
                                        </div>
                                        <div>
                                            <div className="text-[10px] font-black text-slate-900 leading-none uppercase tracking-tight italic mb-0.5">{selectedSiswa?.namaLengkap}</div>
                                            <div className="text-[8px] text-slate-500 font-black uppercase tracking-widest italic">{selectedSiswa?.rombel?.nama}</div>
                                        </div>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => { setValue('siswaId', ''); setSearch(''); }}
                                        className="text-[8px] font-black text-rose-500 hover:bg-white px-2 py-0.5 rounded border border-rose-100 transition-all uppercase tracking-widest italic"
                                    >
                                        GANTI
                                    </button>
                                </div>
                            )}
                            {errors.siswaId && <p className="text-[9px] font-black text-rose-500 ml-1 uppercase">{errors.siswaId.message as string}</p>}
                        </div>

                        {/* Dates */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div className="space-y-1">
                                <label className={labelClass}><Calendar size={12} /> MULAI</label>
                                <input
                                    type="date"
                                    {...register('tanggalMulai')}
                                    className={`${inputClass} pr-1 overflow-visible`}
                                />
                                {errors.tanggalMulai && <p className="text-[9px] font-black text-rose-500 ml-1 uppercase">{errors.tanggalMulai.message as string}</p>}
                            </div>

                            <div className="space-y-1 text-xs">
                                <div className="flex items-center justify-between mb-0.5">
                                    <label className={labelClass}><Calendar size={12} /> BERAKHIR</label>
                                    <div className="flex items-center gap-1.5 cursor-pointer group" onClick={() => setValue('tanggalBerakhir', watch('tanggalBerakhir') ? '' : new Date().toISOString().split('T')[0])}>
                                        <div className={`w-6 h-3 rounded-full p-0.5 transition-colors ${watch('tanggalBerakhir') ? 'bg-indigo-600' : 'bg-slate-200'}`}>
                                            <div className={`w-2 h-2 bg-white rounded-full transition-transform ${watch('tanggalBerakhir') ? 'translate-x-3' : 'translate-x-0'}`} />
                                        </div>
                                        <span className="text-[8px] font-black text-slate-400 group-hover:text-indigo-600 transition-colors uppercase tracking-widest italic">{watch('tanggalBerakhir') ? 'BERBATAS' : 'SELAMANYA'}</span>
                                    </div>
                                </div>
                                <div className={`transition-all duration-300 ${watch('tanggalBerakhir') ? 'opacity-100' : 'opacity-40 grayscale pointer-events-none'}`}>
                                    <input
                                        type="date"
                                        {...register('tanggalBerakhir')}
                                        className={`${inputClass} pr-1 overflow-visible`}
                                        placeholder="Opsional"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="space-y-1 text-xs">
                            <label className={labelClass}>CATATAN PEMBERIAN (OPSIONAL)</label>
                            <textarea
                                {...register('catatan')}
                                rows={2}
                                className={`${inputClass} leading-tight resize-none`}
                                placeholder="Alasan pemberian diskon..."
                            />
                        </div>
                    </form>
                </div>

                {/* Footer */}
                <div className="px-4 py-3 border-t border-slate-100 bg-slate-50 shrink-0">
                    <button
                        form="assign-diskon-form"
                        type="submit"
                        disabled={isSubmitting || assignMutation.isPending || !selectedSiswaId}
                        className="w-full py-2 bg-indigo-600 text-white font-black rounded hover:bg-black transition-all shadow-lg shadow-indigo-100 flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50 text-[10px] uppercase tracking-widest italic"
                    >
                        {isSubmitting || assignMutation.isPending ? (
                            <Loader2 className="animate-spin" size={14} />
                        ) : (
                            <UserCheck size={14} />
                        )}
                        <span>BERIKAN DISKON SEKARANG</span>
                    </button>
                </div>
            </motion.div>
        </div>
    );
}
