
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
                className="relative w-full max-w-lg bg-white rounded-[2.5rem] shadow-2xl overflow-hidden border border-slate-200 flex flex-col max-h-[90vh]"
            >
                {/* Header */}
                <div className="px-5 sm:px-8 py-4 sm:py-6 border-b border-slate-100 flex justify-between items-center bg-indigo-50/30 shrink-0">
                    <div className="flex items-center gap-3 sm:gap-4">
                        <div className="p-2.5 sm:p-3 bg-indigo-600 text-white rounded-xl sm:rounded-2xl shadow-lg shadow-indigo-100">
                            <UserCheck size={24} />
                        </div>
                        <div>
                            <h2 className="text-lg sm:text-xl font-bold text-slate-900 leading-tight">Berikan Diskon</h2>
                            <p className="text-[10px] sm:text-xs text-indigo-600 font-bold tracking-wide uppercase">{diskon?.nama}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white hover:shadow-md rounded-full transition-all text-slate-400">
                        <X size={20} />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar p-5 sm:p-8">
                    <form id="assign-diskon-form" onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                        {/* Hidden Inputs */}
                        <input type="hidden" {...register('diskonId')} />
                        <input type="hidden" {...register('siswaId')} />

                        {/* Student Search */}
                        <div className="space-y-3">
                            <label className={labelClass}><Search size={16} /> Cari Siswa</label>

                            {!selectedSiswaId ? (
                                <div className="space-y-4">
                                    <div className="relative">
                                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                        <input
                                            type="text"
                                            value={search}
                                            onChange={(e) => setSearch(e.target.value)}
                                            placeholder="Masukkan nama atau NIS siswa..."
                                            className={`${inputClass} pl-12`}
                                        />
                                    </div>

                                    <div className="bg-slate-50 rounded-2xl border border-slate-100 overflow-hidden">
                                        {loadingSiswa ? (
                                            <div className="p-8 text-center"><Loader2 className="animate-spin inline-block text-indigo-500" /></div>
                                        ) : search.length < 2 ? (
                                            <div className="p-8 text-center text-xs text-slate-400 font-medium italic">Ketik minimal 2 karakter untuk mencari...</div>
                                        ) : (siswaData?.data?.length || 0) === 0 ? (
                                            <div className="p-8 text-center text-xs text-slate-400 font-medium italic">Siswa tidak ditemukan.</div>
                                        ) : (
                                            <div className="divide-y divide-slate-100 max-h-48 overflow-y-auto">
                                                {siswaData?.data?.map((siswa: any) => (
                                                    <button
                                                        key={siswa.id}
                                                        type="button"
                                                        onClick={() => setValue('siswaId', siswa.id)}
                                                        className="w-full px-6 py-4 flex items-center justify-between hover:bg-white transition-colors group"
                                                    >
                                                        <div className="text-left">
                                                            <div className="text-sm font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">{siswa.namaLengkap}</div>
                                                            <div className="text-[10px] text-slate-400 font-mono tracking-tighter">{siswa.nis} • {siswa.rombel?.nama}</div>
                                                        </div>
                                                        <ChevronRight size={16} className="text-slate-300 group-hover:text-indigo-600 group-hover:translate-x-1 transition-all" />
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ) : (
                                <div className="p-4 bg-indigo-50 border border-indigo-100 rounded-2xl flex items-center justify-between">
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center text-indigo-600 font-bold border border-indigo-100">
                                            {selectedSiswa?.namaLengkap.charAt(0)}
                                        </div>
                                        <div>
                                            <div className="text-sm font-bold text-slate-900">{selectedSiswa?.namaLengkap}</div>
                                            <div className="text-xs text-slate-500">{selectedSiswa?.rombel?.nama}</div>
                                        </div>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => { setValue('siswaId', ''); setSearch(''); }}
                                        className="text-[10px] font-bold text-rose-500 hover:bg-white px-3 py-1.5 rounded-lg border border-rose-100 transition-all uppercase tracking-tighter"
                                    >
                                        Ganti Siswa
                                    </button>
                                </div>
                            )}
                            {errors.siswaId && <p className="text-[10px] font-bold text-rose-500 ml-1">{errors.siswaId.message as string}</p>}
                        </div>

                        {/* Dates */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <label className={labelClass}><Calendar size={16} /> Mulai</label>
                                <input
                                    type="date"
                                    {...register('tanggalMulai')}
                                    className={inputClass}
                                />
                                {errors.tanggalMulai && <p className="text-[10px] font-bold text-rose-500 ml-1">{errors.tanggalMulai.message as string}</p>}
                            </div>

                            <div className="space-y-2">
                                <div className="flex items-center justify-between mb-1">
                                    <label className={labelClass}><Calendar size={16} /> Berakhir</label>
                                    <div className="flex items-center gap-1.5 cursor-pointer group" onClick={() => setValue('tanggalBerakhir', watch('tanggalBerakhir') ? '' : new Date().toISOString().split('T')[0])}>
                                        <div className={`w-8 h-4 rounded-full p-0.5 transition-colors ${watch('tanggalBerakhir') ? 'bg-indigo-600' : 'bg-slate-200'}`}>
                                            <div className={`w-3 h-3 bg-white rounded-full transition-transform ${watch('tanggalBerakhir') ? 'translate-x-4' : 'translate-x-0'}`} />
                                        </div>
                                        <span className="text-[10px] font-bold text-slate-400 group-hover:text-indigo-600 transition-colors uppercase tracking-widest">{watch('tanggalBerakhir') ? 'Berbatas' : 'Selamanya'}</span>
                                    </div>
                                </div>
                                <div className={`transition-all duration-300 ${watch('tanggalBerakhir') ? 'opacity-100' : 'opacity-40 grayscale pointer-events-none'}`}>
                                    <input
                                        type="date"
                                        {...register('tanggalBerakhir')}
                                        className={inputClass}
                                        placeholder="Opsional"
                                    />
                                </div>
                                {!watch('tanggalBerakhir') && <p className="text-[10px] text-slate-400 italic mt-1 ml-1 font-medium">* Diskon berlaku tanpa batas waktu</p>}
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className={labelClass}>Catatan Pemberian (Opsional)</label>
                            <textarea
                                {...register('catatan')}
                                rows={2}
                                className={`${inputClass} resize-none`}
                                placeholder="Alasan pemberian diskon..."
                            />
                        </div>
                    </form>
                </div>

                {/* Footer */}
                <div className="px-5 sm:px-8 py-4 sm:py-6 border-t border-slate-100 bg-slate-50 shrink-0">
                    <button
                        form="assign-diskon-form"
                        type="submit"
                        disabled={isSubmitting || assignMutation.isPending || !selectedSiswaId}
                        className="w-full py-3.5 sm:py-4 bg-indigo-600 text-white font-bold rounded-2xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50 text-sm sm:text-base"
                    >
                        {isSubmitting || assignMutation.isPending ? (
                            <Loader2 className="animate-spin" size={20} />
                        ) : (
                            <UserCheck size={20} />
                        )}
                        <span>Berikan Diskon Sekarang</span>
                    </button>
                </div>
            </motion.div>
        </div>
    );
}
