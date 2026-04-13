
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { createDiskonSchema, CreateDiskonInput } from '@alizzah/validators';
import { useDiskonMutations } from '../hooks/useDiskonMutations';
import { useJenisPembayaranList } from '../../jenis-pembayaran/hooks/useJenisPembayaranList';
import { useAtomValue } from 'jotai';
import { tokenAtom } from '~/stores/auth';
import { X, Save, Loader2, Ticket, Percent, Banknote } from 'lucide-react';
import { motion } from 'framer-motion';

interface DiskonFormProps {
    isOpen: boolean;
    onClose: () => void;
    initialData?: any;
}

export function DiskonForm({ isOpen, onClose, initialData }: DiskonFormProps) {
    const token = useAtomValue(tokenAtom);
    const { createMutation, updateMutation } = useDiskonMutations(token);
    const { data: jenisPembayaranList } = useJenisPembayaranList(token);

    const {
        register,
        handleSubmit,
        reset,
        watch,
        setValue,
        formState: { errors, isSubmitting }
    } = useForm<any>({
        resolver: zodResolver(createDiskonSchema) as any,
        defaultValues: {
            isAktif: true,
            tipePotongan: 'PERSENTASE',
            nilaiPotongan: 0
        }
    });

    const tipePotongan = watch('tipePotongan');
    const nama = watch('nama');

    // Auto-generate code slug from name
    useEffect(() => {
        if (!initialData && nama) {
            const slug = nama
                .toUpperCase()
                .replace(/[^A-Z0-9]/g, '-')
                .replace(/-+/g, '-')
                .replace(/^-|-$/g, '');
            setValue('kode', slug);
        }
    }, [nama, initialData, setValue]);

    useEffect(() => {
        if (isOpen) {
            if (initialData) {
                reset({
                    kode: initialData.kode,
                    nama: initialData.nama,
                    jenisPembayaranId: initialData.jenisPembayaranId,
                    tipePotongan: initialData.tipePotongan,
                    nilaiPotongan: Number(initialData.nilaiPotongan),
                    keterangan: initialData.keterangan || '',
                    isAktif: initialData.isAktif
                });
            } else {
                reset({
                    isAktif: true,
                    tipePotongan: 'PERSENTASE',
                    nilaiPotongan: 0,
                    kode: '',
                    nama: '',
                    jenisPembayaranId: '',
                    keterangan: ''
                });
            }
        }
    }, [isOpen, initialData, reset]);

    const onSubmit = async (data: CreateDiskonInput) => {
        try {
            if (initialData) {
                await updateMutation.mutateAsync({ id: initialData.id, data });
            } else {
                await createMutation.mutateAsync(data);
            }
            onClose();
        } catch (error) {
            // Error handled by mutation
        }
    };

    if (!isOpen) return null;

    const inputClass = "w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all font-black text-xs text-slate-900 placeholder:text-slate-400 placeholder:italic";
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
                className="relative w-full max-w-lg bg-white rounded-xl shadow-2xl overflow-hidden border border-slate-200 flex flex-col max-h-[95vh]"
            >
                {/* Header */}
                <div className="px-4 py-3 border-b border-slate-100 flex justify-between items-center bg-slate-50/50 shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="p-1.5 bg-indigo-100 text-indigo-600 rounded-lg">
                            <Ticket size={16} />
                        </div>
                        <div>
                            <h2 className="text-base font-black text-slate-900 leading-tight uppercase tracking-tight italic">
                                {initialData ? 'Edit Master Diskon' : 'Tambah Master Diskon'}
                            </h2>
                            <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mt-0.5 italic mb-0.5">Konfigurasi jenis potongan / beasiswa</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-1 hover:bg-white hover:shadow-md rounded-full transition-all text-slate-400 hover:text-slate-600">
                        <X size={16} />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar">
                    <form id="diskon-form" onSubmit={handleSubmit(onSubmit)} className="p-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {/* Info Dasar */}
                            <div className="space-y-1 md:col-span-2">
                                <label className={labelClass}>Nama Diskon / Beasiswa</label>
                                <input
                                    {...register('nama')}
                                    placeholder="Contoh: Beasiswa Yatim, Diskon Saudara Kandung"
                                    className={`${inputClass}`}
                                />
                                {errors.nama && <p className="text-[9px] font-black text-rose-500 ml-1 uppercase">{errors.nama.message as string}</p>}
                            </div>

                            <div className="space-y-1">
                                <label className={labelClass}>Kode Diskon</label>
                                <input
                                    {...register('kode')}
                                    placeholder="BSW-YTM"
                                    className={`${inputClass} font-mono uppercase tracking-wider`}
                                    disabled={!!initialData}
                                />
                                {errors.kode && <p className="text-[9px] font-black text-rose-500 ml-1 uppercase">{errors.kode.message as string}</p>}
                            </div>

                            <div className="space-y-1">
                                <label className={labelClass}>Jenis Pembayaran</label>
                                <select
                                    {...register('jenisPembayaranId')}
                                    className={`${inputClass}`}
                                >
                                    <option value="">Pilih Jenis Tagihan...</option>
                                    {jenisPembayaranList?.map((jp: any) => (
                                        <option key={jp.id} value={jp.id}>{jp.nama} ({jp.kode})</option>
                                    ))}
                                </select>
                                {errors.jenisPembayaranId && <p className="text-[9px] font-black text-rose-500 ml-1 uppercase">Jenis harus dipilih</p>}
                            </div>

                            {/* Potongan Section */}
                            <div className="p-3 bg-slate-50 rounded-lg border border-slate-100 md:col-span-2 space-y-2">
                                <div className="flex items-center justify-between">
                                    <label className={labelClass}>Tipe & Nilai Potongan</label>
                                    <div className="flex bg-white p-0.5 rounded border border-slate-200 shadow-sm">
                                        <button
                                            type="button"
                                            onClick={() => setValue('tipePotongan', 'PERSENTASE')}
                                            className={`flex items-center gap-1.5 px-2 py-0.5 rounded text-[9px] font-black transition-all ${tipePotongan === 'PERSENTASE' ? 'bg-orange-600 text-white shadow-md' : 'text-slate-400 hover:bg-slate-50'}`}
                                        >
                                            <Percent size={8} /> PERSEN
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setValue('tipePotongan', 'NOMINAL')}
                                            className={`flex items-center gap-1.5 px-2 py-0.5 rounded text-[9px] font-black transition-all ${tipePotongan === 'NOMINAL' ? 'bg-emerald-600 text-white shadow-md' : 'text-slate-400 hover:bg-slate-50'}`}
                                        >
                                            <Banknote size={8} /> NOMINAL
                                        </button>
                                    </div>
                                </div>

                                <div className="relative">
                                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                                        {tipePotongan === 'PERSENTASE' ? <Percent size={14} /> : <span className="font-black text-[10px] uppercase tracking-tighter">Rp</span>}
                                    </div>
                                    <input
                                        type="number"
                                        {...register('nilaiPotongan', { valueAsNumber: true })}
                                        className={`${inputClass} pl-10 py-1.5 text-sm font-black`}
                                        placeholder="0"
                                    />
                                </div>
                                {errors.nilaiPotongan && <p className="text-[9px] font-black text-rose-500 ml-1 uppercase">{errors.nilaiPotongan.message as string}</p>}
                            </div>

                            <div className="space-y-1 md:col-span-2">
                                <label className={labelClass}>Keterangan (Opsional)</label>
                                <textarea
                                    {...register('keterangan')}
                                    rows={2}
                                    className={`${inputClass} resize-none`}
                                    placeholder="Catatan tambahan..."
                                />
                            </div>

                            <div className="flex items-center gap-2 py-1">
                                <input
                                    type="checkbox"
                                    id="isAktif"
                                    {...register('isAktif')}
                                    className="w-3.5 h-3.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500/20"
                                />
                                <label htmlFor="isAktif" className="text-[10px] font-black text-slate-500 cursor-pointer uppercase tracking-widest italic leading-none">Status Aktif</label>
                            </div>
                        </div>

                        <div className="mt-4 flex flex-col sm:flex-row gap-2">
                            <button
                                type="button"
                                onClick={onClose}
                                className="order-2 sm:order-1 flex-1 py-2 border border-slate-200 text-slate-500 font-black rounded-lg hover:bg-slate-50 transition-all active:scale-95 text-[10px] uppercase tracking-widest italic"
                            >
                                BATAL
                            </button>
                            <button
                                type="submit"
                                disabled={isSubmitting || createMutation.isPending || updateMutation.isPending}
                                className="order-1 sm:order-2 flex-2 py-2 bg-slate-900 text-white font-black rounded-lg hover:bg-black transition-all shadow-lg shadow-slate-200 flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50 text-[10px] uppercase tracking-widest italic"
                            >
                                {isSubmitting || createMutation.isPending || updateMutation.isPending ? (
                                    <Loader2 className="animate-spin" size={14} />
                                ) : (
                                    <Save size={14} />
                                )}
                                <span>{initialData ? 'SIMPAN PERUBAHAN' : 'TAMBAH DISKON'}</span>
                            </button>
                        </div>
                    </form>
                </div>
            </motion.div>
        </div>
    );
}
