
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

    const inputClass = "w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium text-slate-900";
    const labelClass = "text-sm font-bold text-slate-700 flex items-center gap-2";

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
                className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden border border-slate-200 flex flex-col max-h-[90vh]"
            >
                {/* Header */}
                <div className="px-5 py-4 border-b border-slate-100 flex justify-between items-center bg-indigo-50/30 shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-indigo-600 text-white rounded-xl shadow-lg shadow-indigo-100">
                            <UserCheck size={20} />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-slate-900 leading-tight">Berikan Diskon</h2>
                            <p className="text-[10px] text-indigo-600 font-bold tracking-wide uppercase">{diskon?.nama}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-1.5 hover:bg-white hover:shadow-md rounded-full transition-all text-slate-400">
                        <X size={18} />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar p-5">
                    <form id="assign-diskon-form" onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                        {/* Hidden Inputs */}
                        <input type="hidden" {...register('diskonId')} />
                        <input type="hidden" {...register('siswaId')} />

                        {/* Student Search */}
                        <div className="space-y-2.5">
                            <label className={labelClass}><Search size={14} /> Cari Siswa</label>

                            {!selectedSiswaId ? (
                                <div className="space-y-3">
                                    <div className="relative">
                                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                        <input
                                            type="text"
                                            value={search}
                                            onChange={(e) => setSearch(e.target.value)}
                                            placeholder="Masukkan nama atau NIS siswa..."
                                            className={`${inputClass} text-sm py-2.5 pl-10`}
                                        />
                                    </div>

                                    <div className="bg-slate-50 rounded-xl border border-slate-100 overflow-hidden">
                                        {loadingSiswa ? (
                                            <div className="p-6 text-center"><Loader2 className="animate-spin inline-block text-indigo-500" size={18} /></div>
                                        ) : search.length < 2 ? (
                                            <div className="p-6 text-center text-[10px] text-slate-400 font-bold italic uppercase tracking-wider">Ketik minimal 2 karakter untuk mencari...</div>
                                        ) : (siswaData?.data?.length || 0) === 0 ? (
                                            <div className="p-6 text-center text-[10px] text-slate-400 font-bold italic uppercase tracking-wider">Siswa tidak ditemukan.</div>
                                        ) : (
                                            <div className="divide-y divide-slate-100 max-h-40 overflow-y-auto custom-scrollbar">
                                                {siswaData?.data?.map((siswa: any) => (
                                                    <button
                                                        key={siswa.id}
                                                        type="button"
                                                        onClick={() => setValue('siswaId', siswa.id)}
                                                        className="w-full px-4 py-2.5 flex items-center justify-between hover:bg-white transition-colors group"
                                                    >
                                                        <div className="text-left">
                                                            <div className="text-xs font-bold text-slate-900 group-hover:text-indigo-600 transition-colors uppercase tracking-tight">{siswa.namaLengkap}</div>
                                                            <div className="text-[9px] text-slate-400 font-black tracking-tighter uppercase">{siswa.nis} • {siswa.rombel?.nama}</div>
                                                        </div>
                                                        <ChevronRight size={14} className="text-slate-300 group-hover:text-indigo-600 group-hover:translate-x-1 transition-all" />
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ) : (
                                <div className="p-3 bg-indigo-50 border border-indigo-100 rounded-xl flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="w-9 h-9 bg-white rounded-lg flex items-center justify-center text-indigo-600 font-black border border-indigo-100 text-sm shadow-sm">
                                            {selectedSiswa?.namaLengkap.charAt(0)}
                                        </div>
                                        <div>
                                            <div className="text-xs font-bold text-slate-900 leading-none uppercase tracking-tight mb-1">{selectedSiswa?.namaLengkap}</div>
                                            <div className="text-[10px] text-slate-500 font-medium uppercase tracking-tighter">{selectedSiswa?.rombel?.nama}</div>
                                        </div>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => { setValue('siswaId', ''); setSearch(''); }}
                                        className="text-[9px] font-black text-rose-500 hover:bg-white px-2.5 py-1 rounded-md border border-rose-100 transition-all uppercase tracking-tighter"
                                    >
                                        Ganti
                                    </button>
                                </div>
                            )}
                            {errors.siswaId && <p className="text-[10px] font-bold text-rose-500 ml-1">{errors.siswaId.message as string}</p>}
                        </div>

                        {/* Dates */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <label className={labelClass}><Calendar size={14} /> Mulai</label>
                                <input
                                    type="date"
                                    {...register('tanggalMulai')}
                                    className={`${inputClass} text-sm py-2 pr-2`}
                                />
                                {errors.tanggalMulai && <p className="text-[10px] font-bold text-rose-500 ml-1">{errors.tanggalMulai.message as string}</p>}
                            </div>

                            <div className="space-y-1.5">
                                <div className="flex items-center justify-between mb-0.5">
                                    <label className={labelClass}><Calendar size={14} /> Berakhir</label>
                                    <div className="flex items-center gap-1.5 cursor-pointer group" onClick={() => setValue('tanggalBerakhir', watch('tanggalBerakhir') ? '' : new Date().toISOString().split('T')[0])}>
                                        <div className={`w-7 h-3.5 rounded-full p-0.5 transition-colors ${watch('tanggalBerakhir') ? 'bg-indigo-600' : 'bg-slate-200'}`}>
                                            <div className={`w-2.5 h-2.5 bg-white rounded-full transition-transform ${watch('tanggalBerakhir') ? 'translate-x-3.5' : 'translate-x-0'}`} />
                                        </div>
                                        <span className="text-[9px] font-black text-slate-400 group-hover:text-indigo-600 transition-colors uppercase tracking-widest">{watch('tanggalBerakhir') ? 'Berbatas' : 'Selamanya'}</span>
                                    </div>
                                </div>
                                <div className={`transition-all duration-300 ${watch('tanggalBerakhir') ? 'opacity-100' : 'opacity-40 grayscale pointer-events-none'}`}>
                                    <input
                                        type="date"
                                        {...register('tanggalBerakhir')}
                                        className={`${inputClass} text-sm py-2 pr-2`}
                                        placeholder="Opsional"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <label className={labelClass}>Catatan Pemberian (Opsional)</label>
                            <textarea
                                {...register('catatan')}
                                rows={2}
                                className={`${inputClass} text-xs py-2 px-3 resize-none`}
                                placeholder="Alasan pemberian diskon..."
                            />
                        </div>
                    </form>
                </div>

                {/* Footer */}
                <div className="px-5 py-4 border-t border-slate-100 bg-slate-50 shrink-0">
                    <button
                        form="assign-diskon-form"
                        type="submit"
                        disabled={isSubmitting || assignMutation.isPending || !selectedSiswaId}
                        className="w-full py-2.5 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50 text-xs uppercase tracking-wider"
                    >
                        {isSubmitting || assignMutation.isPending ? (
                            <Loader2 className="animate-spin" size={16} />
                        ) : (
                            <UserCheck size={16} />
                        )}
                        <span>Berikan Diskon Sekarang</span>
                    </button>
                </div>
            </motion.div>
        </div>
    );
}
