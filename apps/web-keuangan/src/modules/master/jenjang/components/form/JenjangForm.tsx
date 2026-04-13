'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { createJenjangSchema, CreateJenjangInput, UpdateJenjangInput } from '@alizzah/validators';
import { X, Save } from 'lucide-react';
import { useJenjangMutations } from '../../hooks/useJenjangMutations';
import { useAtomValue } from 'jotai';
import { tokenAtom } from '~/stores/auth';
import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface JenjangFormProps {
    isOpen: boolean;
    onClose: () => void;
    initialData?: { id: string } & Partial<CreateJenjangInput>;
}

export function JenjangForm({ isOpen, onClose, initialData }: JenjangFormProps) {
    const token = useAtomValue(tokenAtom);
    const { createMutation, updateMutation } = useJenjangMutations(token);

    const isEdit = !!initialData?.id;

    const {
        register,
        handleSubmit,
        reset,
        formState: { errors, isSubmitting }
    } = useForm<CreateJenjangInput>({
        // @ts-ignore
        resolver: zodResolver(createJenjangSchema),
        defaultValues: {
            kode: '',
            nama: '',
            kelompok: '',
            urutan: 1,
            isLevelAwal: false,
        }
    });

    useEffect(() => {
        if (isOpen) {
            if (initialData) {
                reset({ ...initialData });
            } else {
                reset({
                    kode: '',
                    nama: '',
                    kelompok: '',
                    urutan: 1,
                    isLevelAwal: false,
                });
            }
        }
    }, [isOpen, initialData, reset]);

    const onSubmit = async (data: CreateJenjangInput) => {
        try {
            if (isEdit && initialData?.id) {
                await updateMutation.mutateAsync({ id: initialData.id, data: data as UpdateJenjangInput });
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
                        className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden border border-slate-200"
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-slate-50/50">
                            <div>
                                <h3 className="text-base font-black text-slate-900 uppercase tracking-tight leading-none italic">
                                    {isEdit ? 'Edit Jenjang' : 'Tambah Jenjang'}
                                </h3>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1 leading-none italic">Kelola tingkat pendidikan sekolah.</p>
                            </div>
                            <button
                                onClick={onClose}
                                className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors active:scale-90"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        {/* Form Body */}
                        <div className="p-5 text-left">
                            <form id="jenjang-form" onSubmit={handleSubmit(onSubmit as any)} className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 leading-none">Kode <span className="text-red-500 font-bold">*</span></label>
                                        <input
                                            {...register('kode')}
                                            placeholder="Ex: KB-A"
                                            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-4 focus:ring-blue-500/10 transition-all font-black text-xs uppercase"
                                        />
                                        {errors.kode && <span className="text-[9px] text-red-500 font-black uppercase tracking-tighter italic">{errors.kode.message}</span>}
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 leading-none">Urutan <span className="text-red-500 font-bold">*</span></label>
                                        <input
                                            type="number"
                                            {...register('urutan', { valueAsNumber: true })}
                                            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-4 focus:ring-blue-500/10 transition-all font-black text-xs font-mono"
                                        />
                                        {errors.urutan && <span className="text-[9px] text-red-500 font-black uppercase tracking-tighter italic">{errors.urutan.message}</span>}
                                    </div>
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 leading-none">Nama Jenjang <span className="text-red-500 font-bold">*</span></label>
                                    <input
                                        {...register('nama')}
                                        placeholder="Contoh: Kelompok Bermain A"
                                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-4 focus:ring-blue-500/10 transition-all font-black text-xs placeholder:italic"
                                    />
                                    {errors.nama && <span className="text-[9px] text-red-500 font-black uppercase tracking-tighter italic">{errors.nama.message}</span>}
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 leading-none">Kelompok <span className="text-red-500 font-bold">*</span></label>
                                    <input
                                        {...register('kelompok')}
                                        placeholder="Contoh: Mutiara, Intan, Berlian"
                                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-4 focus:ring-blue-500/10 transition-all font-black text-xs placeholder:italic"
                                    />
                                    <p className="text-[9px] text-slate-400 font-bold uppercase tracking-tight italic leading-none">Nama kelompok khusus untuk jenjang ini.</p>
                                    {errors.kelompok && <span className="text-[9px] text-red-500 font-black uppercase tracking-tighter italic">{errors.kelompok.message}</span>}
                                </div>

                                <div className="flex items-center gap-3 p-3 bg-blue-50/50 rounded-xl border border-blue-100">
                                    <input
                                        type="checkbox"
                                        id="isLevelAwal"
                                        {...register('isLevelAwal')}
                                        className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
                                    />
                                    <div className="flex flex-col">
                                        <label htmlFor="isLevelAwal" className="text-[10px] font-black text-slate-900 cursor-pointer uppercase tracking-tight">
                                            Jenjang Awal (Gatekeeper)
                                        </label>
                                        <p className="text-[9px] text-slate-500 font-bold italic leading-none">
                                            Otomatis dikenakan Biaya Awal Pendidikan (BAP) jika aktif.
                                        </p>
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
                                form="jenjang-form"
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
