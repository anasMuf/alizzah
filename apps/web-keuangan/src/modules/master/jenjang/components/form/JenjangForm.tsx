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
                        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
                            <div>
                                <h3 className="text-lg font-bold text-slate-900">
                                    {isEdit ? 'Edit Jenjang' : 'Tambah Jenjang'}
                                </h3>
                                <p className="text-sm text-slate-500">Kelola tingkat pendidikan sekolah.</p>
                            </div>
                            <button
                                onClick={onClose}
                                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        {/* Form Body */}
                        <div className="p-6">
                            <form id="jenjang-form" onSubmit={handleSubmit(onSubmit as any)} className="space-y-5">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-sm font-semibold text-slate-700">Kode <span className="text-red-500">*</span></label>
                                        <input
                                            {...register('kode')}
                                            placeholder="Ex: KB-A"
                                            className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium uppercase"
                                        />
                                        {errors.kode && <span className="text-xs text-red-500 font-medium">{errors.kode.message}</span>}
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-semibold text-slate-700">Urutan <span className="text-red-500">*</span></label>
                                        <input
                                            type="number"
                                            {...register('urutan', { valueAsNumber: true })}
                                            className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium"
                                        />
                                        {errors.urutan && <span className="text-xs text-red-500 font-medium">{errors.urutan.message}</span>}
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm font-semibold text-slate-700">Nama Jenjang <span className="text-red-500">*</span></label>
                                    <input
                                        {...register('nama')}
                                        placeholder="Contoh: Kelompok Bermain A"
                                        className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium"
                                    />
                                    {errors.nama && <span className="text-xs text-red-500 font-medium">{errors.nama.message}</span>}
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm font-semibold text-slate-700">Kelompok <span className="text-red-500">*</span></label>
                                    <input
                                        {...register('kelompok')}
                                        placeholder="Contoh: Mutiara, Intan, Berlian"
                                        className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium"
                                    />
                                    <p className="text-[11px] text-slate-400">Nama kelompok/grup khusus untuk jenjang ini.</p>
                                    {errors.kelompok && <span className="text-xs text-red-500 font-medium">{errors.kelompok.message}</span>}
                                </div>

                                <div className="flex items-center gap-3 p-4 bg-blue-50/50 rounded-xl border border-blue-100">
                                    <input
                                        type="checkbox"
                                        id="isLevelAwal"
                                        {...register('isLevelAwal')}
                                        className="w-5 h-5 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
                                    />
                                    <div className="flex flex-col">
                                        <label htmlFor="isLevelAwal" className="text-sm font-bold text-slate-900 cursor-pointer">
                                            Jenjang Awal (Gatekeeper)
                                        </label>
                                        <p className="text-[11px] text-slate-500">
                                            Jika dicentang, siswa baru di jenjang ini otomatis akan dikenakan Biaya Awal Pendidikan (BAP).
                                        </p>
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
                                form="jenjang-form"
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
