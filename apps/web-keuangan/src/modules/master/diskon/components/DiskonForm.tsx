
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

    const inputClass = "w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium text-slate-900 placeholder:text-slate-400";
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
                className="relative w-full max-w-xl bg-white rounded-2xl shadow-2xl overflow-hidden border border-slate-200 flex flex-col max-h-[90vh]"
            >
                {/* Header */}
                <div className="px-5 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50 shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-indigo-100 text-indigo-600 rounded-xl">
                            <Ticket size={20} />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-slate-900 leading-tight">
                                {initialData ? 'Edit Master Diskon' : 'Tambah Master Diskon'}
                            </h2>
                            <p className="text-[10px] text-slate-500 font-medium italic">Konfigurasi jenis potongan / beasiswa</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-1.5 hover:bg-white hover:shadow-md rounded-full transition-all text-slate-400 hover:text-slate-600">
                        <X size={18} />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar">
                    <form id="diskon-form" onSubmit={handleSubmit(onSubmit)} className="p-5">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* Info Dasar */}
                            <div className="space-y-1.5 md:col-span-2">
                                <label className={labelClass}>Nama Diskon / Beasiswa</label>
                                <input
                                    {...register('nama')}
                                    placeholder="Contoh: Beasiswa Yatim, Diskon Saudara Kandung"
                                    className={`${inputClass} text-sm py-2.5`}
                                />
                                {errors.nama && <p className="text-[10px] font-bold text-rose-500 ml-1">{errors.nama.message as string}</p>}
                            </div>

                            <div className="space-y-1.5">
                                <label className={labelClass}>Kode Diskon</label>
                                <input
                                    {...register('kode')}
                                    placeholder="BSW-YTM"
                                    className={`${inputClass} text-sm py-2.5 font-mono uppercase tracking-wider`}
                                    disabled={!!initialData}
                                />
                                {errors.kode && <p className="text-[10px] font-bold text-rose-500 ml-1">{errors.kode.message as string}</p>}
                            </div>

                            <div className="space-y-1.5">
                                <label className={labelClass}>Jenis Pembayaran</label>
                                <select
                                    {...register('jenisPembayaranId')}
                                    className={`${inputClass} text-sm py-2.5`}
                                >
                                    <option value="">Pilih Jenis Tagihan...</option>
                                    {jenisPembayaranList?.map((jp: any) => (
                                        <option key={jp.id} value={jp.id}>{jp.nama} ({jp.kode})</option>
                                    ))}
                                </select>
                                {errors.jenisPembayaranId && <p className="text-[10px] font-bold text-rose-500 ml-1">Jenis harus dipilih</p>}
                            </div>

                            {/* Potongan Section */}
                            <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 md:col-span-2 space-y-3">
                                <div className="flex items-center justify-between">
                                    <label className={labelClass}>Tipe & Nilai Potongan</label>
                                    <div className="flex bg-white p-0.5 rounded-lg border border-slate-200 shadow-sm">
                                        <button
                                            type="button"
                                            onClick={() => setValue('tipePotongan', 'PERSENTASE')}
                                            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-black transition-all ${tipePotongan === 'PERSENTASE' ? 'bg-orange-600 text-white shadow-md' : 'text-slate-400 hover:bg-slate-50'}`}
                                        >
                                            <Percent size={10} /> Persen
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setValue('tipePotongan', 'NOMINAL')}
                                            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-black transition-all ${tipePotongan === 'NOMINAL' ? 'bg-emerald-600 text-white shadow-md' : 'text-slate-400 hover:bg-slate-50'}`}
                                        >
                                            <Banknote size={10} /> Nominal
                                        </button>
                                    </div>
                                </div>

                                <div className="relative">
                                    <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
                                        {tipePotongan === 'PERSENTASE' ? <Percent size={16} /> : <span className="font-bold text-xs uppercase tracking-tighter">Rp</span>}
                                    </div>
                                    <input
                                        type="number"
                                        {...register('nilaiPotongan', { valueAsNumber: true })}
                                        className={`${inputClass} pl-11 py-2 text-base font-bold`}
                                        placeholder="0"
                                    />
                                </div>
                                {errors.nilaiPotongan && <p className="text-[10px] font-bold text-rose-500 ml-1">{errors.nilaiPotongan.message as string}</p>}
                            </div>

                            <div className="space-y-1.5 md:col-span-2">
                                <label className={labelClass}>Keterangan (Opsional)</label>
                                <textarea
                                    {...register('keterangan')}
                                    rows={2}
                                    className={`${inputClass} text-sm py-2 px-3 resize-none`}
                                    placeholder="Catatan tambahan..."
                                />
                            </div>

                            <div className="flex items-center gap-2.5 pt-1">
                                <input
                                    type="checkbox"
                                    id="isAktif"
                                    {...register('isAktif')}
                                    className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500/20"
                                />
                                <label htmlFor="isAktif" className="text-xs font-bold text-slate-700 cursor-pointer uppercase tracking-tight">Status Aktif</label>
                            </div>
                        </div>

                        <div className="mt-6 flex flex-col sm:flex-row gap-2.5">
                            <button
                                type="button"
                                onClick={onClose}
                                className="order-2 sm:order-1 flex-1 py-2.5 border border-slate-200 text-slate-600 font-bold rounded-xl hover:bg-slate-50 transition-all active:scale-95 text-xs uppercase tracking-wider"
                            >
                                Batal
                            </button>
                            <button
                                type="submit"
                                disabled={isSubmitting || createMutation.isPending || updateMutation.isPending}
                                className="order-1 sm:order-2 flex-2 py-2.5 bg-slate-900 text-white font-bold rounded-xl hover:bg-slate-800 transition-all shadow-lg shadow-slate-200 flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50 text-xs uppercase tracking-wider"
                            >
                                {isSubmitting || createMutation.isPending || updateMutation.isPending ? (
                                    <Loader2 className="animate-spin" size={16} />
                                ) : (
                                    <Save size={16} />
                                )}
                                <span>{initialData ? 'Simpan Perubahan' : 'Tambah Diskon'}</span>
                            </button>
                        </div>
                    </form>
                </div>
            </motion.div>
        </div>
    );
}
