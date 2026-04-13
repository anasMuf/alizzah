'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { createJenisPembayaranSchema, CreateJenisPembayaranInput, UpdateJenisPembayaranInput, KategoriPembayaranSchema, TipePembayaranSchema, SifatPembayaranSchema, PemicuTagihanSchema } from '@alizzah/validators';
import { X, Save } from 'lucide-react';
import { useJenisPembayaranMutations } from '../../hooks/useJenisPembayaranMutations';
import { useAtomValue } from 'jotai';
import { tokenAtom } from '~/stores/auth';
import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Controller } from 'react-hook-form';
import { formatNumber, parseCurrency } from '@alizzah/shared';

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
        control,
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
            pemicu: 'MANUAL',
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
                    pemicu: 'MANUAL',
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
                        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-slate-50/50">
                            <div>
                                <h3 className="text-base font-black text-slate-900 uppercase tracking-tight leading-none italic">
                                    {isEdit ? 'Edit Jenis Pembayaran' : 'Tambah Jenis Pembayaran'}
                                </h3>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1 leading-none italic">Isi detail informasi jenis pembayaran di bawah ini.</p>
                            </div>
                            <button
                                onClick={onClose}
                                className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors active:scale-90"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        {/* Form Body - Scrollable */}
                        <div className="p-4 overflow-y-auto custom-scrollbar text-left">
                            <form id="jenis-pembayaran-form" onSubmit={handleSubmit(onSubmit as any)} className="space-y-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 leading-none">Kode Pembayaran <span className="text-red-500 font-bold">*</span></label>
                                        <input
                                            {...register('kode')}
                                            placeholder="Contoh: SPP-TK"
                                            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-4 focus:ring-blue-500/10 transition-all font-mono font-black text-xs uppercase"
                                        />
                                        {errors.kode && <span className="text-[9px] text-red-500 font-black uppercase tracking-tighter italic">{errors.kode.message}</span>}
                                    </div>

                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 leading-none">Nama Pembayaran <span className="text-red-500 font-bold">*</span></label>
                                        <input
                                            {...register('nama')}
                                            placeholder="Contoh: SPP Bulanan TK"
                                            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-4 focus:ring-blue-500/10 transition-all font-black text-xs placeholder:italic"
                                        />
                                        {errors.nama && <span className="text-[9px] text-red-500 font-black uppercase tracking-tighter italic">{errors.nama.message}</span>}
                                    </div>

                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 leading-none">Kategori <span className="text-red-500 font-bold">*</span></label>
                                        <div className="relative">
                                            <select
                                                {...register('kategori')}
                                                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-4 focus:ring-blue-500/10 transition-all appearance-none font-black text-xs cursor-pointer uppercase tracking-tighter"
                                            >
                                                {KategoriPembayaranSchema.options.map((opt) => (
                                                    <option key={opt} value={opt}>{opt.replace('_', ' ')}</option>
                                                ))}
                                            </select>
                                            <div className="absolute inset-y-0 right-0 flex items-center px-4 pointer-events-none text-slate-400">
                                                <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 20 20"><path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" /></svg>
                                            </div>
                                        </div>
                                        {errors.kategori && <span className="text-[9px] text-red-500 font-black uppercase tracking-tighter italic">{errors.kategori.message}</span>}
                                    </div>

                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 leading-none">Tipe Pembayaran <span className="text-red-500 font-bold">*</span></label>
                                        <div className="relative">
                                            <select
                                                {...register('tipe')}
                                                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-4 focus:ring-blue-500/10 transition-all appearance-none font-black text-xs cursor-pointer uppercase tracking-tighter"
                                            >
                                                {TipePembayaranSchema.options.map((opt) => (
                                                    <option key={opt} value={opt}>{opt}</option>
                                                ))}
                                            </select>
                                            <div className="absolute inset-y-0 right-0 flex items-center px-4 pointer-events-none text-slate-400">
                                                <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 20 20"><path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" /></svg>
                                            </div>
                                        </div>
                                        {errors.tipe && <span className="text-[9px] text-red-500 font-black uppercase tracking-tighter italic">{errors.tipe.message}</span>}
                                    </div>

                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 leading-none">Nominal Default (Rp) <span className="text-red-500 font-bold">*</span></label>
                                        <div className="relative group">
                                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 font-black text-[10px] group-focus-within:text-blue-500 transition-colors uppercase">Rp</div>
                                            <Controller
                                                name="nominalDefault"
                                                control={control}
                                                render={({ field }) => (
                                                    <input
                                                        type="text"
                                                        value={field.value === 0 ? '' : formatNumber(field.value)}
                                                        onChange={(e) => field.onChange(parseCurrency(e.target.value))}
                                                        className="w-full pl-10 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-4 focus:ring-blue-500/10 transition-all font-black text-xs font-mono"
                                                        placeholder="0"
                                                    />
                                                )}
                                            />
                                        </div>
                                        <p className="text-[9px] text-slate-400 font-bold uppercase tracking-tight italic leading-none">Masukkan 0 jika tarif berbeda tiap jenjang.</p>
                                        {errors.nominalDefault && <span className="text-[9px] text-red-500 font-black uppercase tracking-tighter italic">{errors.nominalDefault.message}</span>}
                                    </div>

                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 leading-none">Sifat Pembayaran <span className="text-red-500 font-bold">*</span></label>
                                        <div className="flex bg-slate-100 p-0.5 rounded-lg">
                                            {SifatPembayaranSchema.options.map((option) => (
                                                <label
                                                    key={option}
                                                    className={`flex-1 text-center py-1.5 text-[10px] font-black uppercase tracking-widest rounded-md cursor-pointer transition-all ${watch('sifat') === option
                                                        ? 'bg-white text-blue-600 shadow-sm'
                                                        : 'text-slate-400 hover:text-slate-600'
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

                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 leading-none">Jatuh Tempo (Tanggal)</label>
                                        <input
                                            type="number"
                                            {...register('jatuhTempoHari', { valueAsNumber: true })}
                                            min={1}
                                            max={31}
                                            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-4 focus:ring-blue-500/10 transition-all font-black font-mono text-xs"
                                        />
                                        <p className="text-[9px] text-slate-400 font-bold uppercase tracking-tight italic leading-none">Default tanggal 10 setiap bulan.</p>
                                    </div>

                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 leading-none">Pemicu Otomatis <span className="text-red-500 font-bold">*</span></label>
                                        <div className="relative">
                                            <select
                                                {...register('pemicu')}
                                                className="w-full px-3 py-2 bg-blue-50/50 border border-blue-100 rounded-lg focus:outline-none focus:ring-4 focus:ring-blue-500/10 transition-all appearance-none font-black text-xs text-blue-700 cursor-pointer uppercase tracking-tighter"
                                            >
                                                {PemicuTagihanSchema.options.map((opt) => (
                                                    <option key={opt} value={opt}>
                                                        {opt === 'MANUAL' ? 'Manual (Standard)' :
                                                            opt === 'OTOMATIS_SISWA_BARU' ? 'Otomatis: Siswa Baru (BAP)' :
                                                                'Otomatis: Awal Tahun (Reg. Tahunan)'}
                                                    </option>
                                                ))}
                                            </select>
                                            <div className="absolute inset-y-0 right-0 flex items-center px-4 pointer-events-none text-blue-400">
                                                <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 20 20"><path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" /></svg>
                                            </div>
                                        </div>
                                        <p className="text-[9px] text-slate-400 font-bold uppercase tracking-tight italic leading-none">Kapan tagihan ini dibuat secara otomatis.</p>
                                        {errors.pemicu && <span className="text-[9px] text-red-500 font-black uppercase tracking-tighter italic">{errors.pemicu.message}</span>}
                                    </div>

                                    <div className="space-y-1.5 col-span-1 md:col-span-2">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 leading-none">Keterangan</label>
                                        <textarea
                                            {...register('keterangan')}
                                            rows={2}
                                            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-4 focus:ring-blue-500/10 transition-all resize-none font-black text-xs placeholder:italic"
                                            placeholder="Tambahkan catatan tambahan..."
                                        />
                                    </div>

                                    <div className="col-span-1 md:col-span-2 flex items-center gap-3 p-3 bg-slate-50/50 border border-slate-100 rounded-xl">
                                        <input
                                            type="checkbox"
                                            id="isAktif"
                                            {...register('isAktif')}
                                            className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500 border-slate-300"
                                        />
                                        <div>
                                            <label htmlFor="isAktif" className="text-[10px] font-black text-slate-700 cursor-pointer uppercase tracking-tight leading-none">Status Aktif</label>
                                            <p className="text-[9px] text-slate-400 font-bold italic leading-none mt-1">Non-aktifkan jika tidak lagi digunakan.</p>
                                        </div>
                                    </div>
                                </div>
                            </form>
                        </div>

                        {/* Footer */}
                        <div className="flex items-center justify-end gap-3 px-5 py-4 border-t border-slate-100 bg-slate-50/50">
                            <button
                                onClick={onClose}
                                type="button"
                                disabled={isSubmitting || createMutation.isPending || updateMutation.isPending}
                                className="px-4 py-2 text-[10px] font-black text-slate-500 hover:text-slate-800 hover:bg-slate-200/50 rounded-lg transition-all uppercase tracking-widest italic"
                            >
                                Batal
                            </button>
                            <button
                                form="jenis-pembayaran-form"
                                type="submit"
                                disabled={isSubmitting || createMutation.isPending || updateMutation.isPending}
                                className="flex items-center gap-2 px-5 py-2 text-[10px] font-black text-white bg-blue-600 hover:bg-blue-700 active:scale-95 rounded-lg shadow-lg shadow-blue-200 transition-all disabled:opacity-70 disabled:active:scale-100 uppercase tracking-widest italic"
                            >
                                {(createMutation.isPending || updateMutation.isPending) ? (
                                    <>
                                        <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                        <span>Menyimpan...</span>
                                    </>
                                ) : (
                                    <>
                                        <Save size={14} />
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
