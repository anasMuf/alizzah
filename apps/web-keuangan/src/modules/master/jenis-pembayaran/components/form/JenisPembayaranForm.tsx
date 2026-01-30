'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { createJenisPembayaranSchema, CreateJenisPembayaranInput, UpdateJenisPembayaranInput, KategoriPembayaranSchema, TipePembayaranSchema, SifatPembayaranSchema } from '@alizzah/validators';
import { X, Save } from 'lucide-react';
import { useJenisPembayaranMutations } from '../../hooks/useJenisPembayaranMutations';
import { useAtomValue } from 'jotai';
import { tokenAtom } from '~/stores/auth';
import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface JenisPembayaranFormProps {
    isOpen: boolean;
    onClose: () => void;
    initialData?: { id: string } & Partial<CreateJenisPembayaranInput>;
}

export function JenisPembayaranForm({ isOpen, onClose, initialData }: JenisPembayaranFormProps) {
    const token = useAtomValue(tokenAtom);
    const { createMutation, updateMutation } = useJenisPembayaranMutations(token);

    const isEdit = !!initialData?.id;

    const {
        register,
        handleSubmit,
        reset,
        watch,
        formState: { errors, isSubmitting }
    } = useForm<CreateJenisPembayaranInput>({
        // @ts-ignore
        resolver: zodResolver(createJenisPembayaranSchema),
        defaultValues: {
            kode: '',
            nama: '',
            kategori: 'INFAQ_RUTIN',
            tipe: 'BULANAN',
            nominalDefault: 0,
            sifat: 'WAJIB',
            jatuhTempoHari: 10,
            jenjangIds: [],
            isAktif: true,
            keterangan: '',
        }
    });

    useEffect(() => {
        if (isOpen) {
            if (initialData) {
                // @ts-ignore
                reset({ ...initialData });
            } else {
                reset({
                    kode: '',
                    nama: '',
                    kategori: 'INFAQ_RUTIN',
                    tipe: 'BULANAN',
                    nominalDefault: 0,
                    sifat: 'WAJIB',
                    jatuhTempoHari: 10,
                    jenjangIds: [],
                    isAktif: true,
                    keterangan: '',
                });
            }
        }
    }, [isOpen, initialData, reset]);

    const onSubmit = async (data: CreateJenisPembayaranInput) => {
        try {
            if (isEdit && initialData?.id) {
                await updateMutation.mutateAsync({ id: initialData.id, data: data as UpdateJenisPembayaranInput });
            } else {
                await createMutation.mutateAsync(data);
            }
            onClose();
        } catch (err) {
            // Error handled by mutation hook
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
                    />

                    {/* Modal */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl overflow-hidden border border-slate-200 max-h-[90vh] flex flex-col"
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
                            <div>
                                <h3 className="text-lg font-bold text-slate-900">
                                    {isEdit ? 'Edit Jenis Pembayaran' : 'Tambah Jenis Pembayaran'}
                                </h3>
                                <p className="text-sm text-slate-500">Isi detail informasi jenis pembayaran di bawah ini.</p>
                            </div>
                            <button
                                onClick={onClose}
                                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        {/* Form Body - Scrollable */}
                        <div className="p-6 overflow-y-auto custom-scrollbar">
                            <form id="jenis-pembayaran-form" onSubmit={handleSubmit(onSubmit as any)} className="space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <label className="text-sm font-semibold text-slate-700">Kode Pembayaran <span className="text-red-500">*</span></label>
                                        <input
                                            {...register('kode')}
                                            placeholder="Contoh: SPP-TK"
                                            className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-mono text-sm"
                                        />
                                        {errors.kode && <span className="text-xs text-red-500 font-medium">{errors.kode.message}</span>}
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-sm font-semibold text-slate-700">Nama Pembayaran <span className="text-red-500">*</span></label>
                                        <input
                                            {...register('nama')}
                                            placeholder="Contoh: SPP Bulanan TK"
                                            className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                                        />
                                        {errors.nama && <span className="text-xs text-red-500 font-medium">{errors.nama.message}</span>}
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-sm font-semibold text-slate-700">Kategori <span className="text-red-500">*</span></label>
                                        <div className="relative">
                                            <select
                                                {...register('kategori')}
                                                className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all appearance-none"
                                            >
                                                {KategoriPembayaranSchema.options.map((opt) => (
                                                    <option key={opt} value={opt}>{opt.replace('_', ' ')}</option>
                                                ))}
                                            </select>
                                            <div className="absolute inset-y-0 right-0 flex items-center px-4 pointer-events-none text-slate-500">
                                                <svg className="w-4 h-4 fill-current" viewBox="0 0 20 20"><path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" /></svg>
                                            </div>
                                        </div>
                                        {errors.kategori && <span className="text-xs text-red-500 font-medium">{errors.kategori.message}</span>}
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-sm font-semibold text-slate-700">Tipe Pembayaran <span className="text-red-500">*</span></label>
                                        <div className="relative">
                                            <select
                                                {...register('tipe')}
                                                className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all appearance-none"
                                            >
                                                {TipePembayaranSchema.options.map((opt) => (
                                                    <option key={opt} value={opt}>{opt}</option>
                                                ))}
                                            </select>
                                            <div className="absolute inset-y-0 right-0 flex items-center px-4 pointer-events-none text-slate-500">
                                                <svg className="w-4 h-4 fill-current" viewBox="0 0 20 20"><path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" /></svg>
                                            </div>
                                        </div>
                                        {errors.tipe && <span className="text-xs text-red-500 font-medium">{errors.tipe.message}</span>}
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-sm font-semibold text-slate-700">Nominal Default (Rp) <span className="text-red-500">*</span></label>
                                        <div className="relative group">
                                            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 font-semibold group-focus-within:text-blue-500 transition-colors">Rp</div>
                                            <input
                                                type="number"
                                                {...register('nominalDefault', { valueAsNumber: true })}
                                                className="w-full pl-12 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-mono"
                                                placeholder="0"
                                            />
                                        </div>
                                        <p className="text-[11px] text-slate-400">Masukkan 0 jika tarif berbeda tiap jenjang.</p>
                                        {errors.nominalDefault && <span className="text-xs text-red-500 font-medium">{errors.nominalDefault.message}</span>}
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-sm font-semibold text-slate-700">Sifat Pembayaran <span className="text-red-500">*</span></label>
                                        <div className="flex bg-slate-100 p-1 rounded-xl">
                                            {SifatPembayaranSchema.options.map((option) => (
                                                <label
                                                    key={option}
                                                    className={`flex-1 text-center py-2 text-sm font-medium rounded-lg cursor-pointer transition-all ${watch('sifat') === option
                                                        ? 'bg-white text-blue-600 shadow-sm'
                                                        : 'text-slate-500 hover:text-slate-700'
                                                        }`}
                                                >
                                                    <input
                                                        type="radio"
                                                        value={option}
                                                        {...register('sifat')}
                                                        className="hidden"
                                                    />
                                                    {option === 'WAJIB' ? 'Wajib' : 'Opsional'}
                                                </label>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-sm font-semibold text-slate-700">Jatuh Tempo (Tanggal)</label>
                                        <input
                                            type="number"
                                            {...register('jatuhTempoHari', { valueAsNumber: true })}
                                            min={1}
                                            max={31}
                                            className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                                        />
                                        <p className="text-[11px] text-slate-400">Default tanggal 10 setiap bulan.</p>
                                    </div>

                                    <div className="space-y-2 col-span-1 md:col-span-2">
                                        <label className="text-sm font-semibold text-slate-700">Keterangan</label>
                                        <textarea
                                            {...register('keterangan')}
                                            rows={3}
                                            className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all resize-none"
                                            placeholder="Tambahkan catatan tambahan..."
                                        />
                                    </div>

                                    <div className="col-span-1 md:col-span-2 flex items-center gap-3 p-4 bg-slate-50 border border-slate-100 rounded-xl">
                                        <input
                                            type="checkbox"
                                            id="isAktif"
                                            {...register('isAktif')}
                                            className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500 border-gray-300"
                                        />
                                        <div>
                                            <label htmlFor="isAktif" className="text-sm font-semibold text-slate-700 cursor-pointer">Status Aktif</label>
                                            <p className="text-xs text-slate-500">Non-aktifkan jika jenis pembayaran ini tidak lagi digunakan.</p>
                                        </div>
                                    </div>
                                </div>
                            </form>
                        </div>

                        {/* Footer */}
                        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-100 bg-slate-50/50">
                            <button
                                onClick={onClose}
                                type="button"
                                disabled={isSubmitting || createMutation.isPending || updateMutation.isPending}
                                className="px-5 py-2.5 text-sm font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-200/50 rounded-xl transition-colors"
                            >
                                Batal
                            </button>
                            <button
                                form="jenis-pembayaran-form"
                                type="submit"
                                disabled={isSubmitting || createMutation.isPending || updateMutation.isPending}
                                className="flex items-center gap-2 px-6 py-2.5 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 active:scale-95 rounded-xl shadow-lg shadow-blue-200 transition-all disabled:opacity-70 disabled:active:scale-100"
                            >
                                {(createMutation.isPending || updateMutation.isPending) ? (
                                    <>
                                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                        <span>Menyimpan...</span>
                                    </>
                                ) : (
                                    <>
                                        <Save size={18} />
                                        <span>Simpan Data</span>
                                    </>
                                )}
                            </button>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}

