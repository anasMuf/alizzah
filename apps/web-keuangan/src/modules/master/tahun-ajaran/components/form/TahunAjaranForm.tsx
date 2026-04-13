'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { createTahunAjaranSchema, CreateTahunAjaranInput, UpdateTahunAjaranInput } from '@alizzah/validators';
import { X, Save } from 'lucide-react';
import { useTahunAjaranMutations } from '../../hooks/useTahunAjaranMutations';
import { useAtomValue } from 'jotai';
import { tokenAtom } from '~/stores/auth';
import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface TahunAjaranFormProps {
    isOpen: boolean;
    onClose: () => void;
    initialData?: { id: string } & Partial<CreateTahunAjaranInput>;
}

export function TahunAjaranForm({ isOpen, onClose, initialData }: TahunAjaranFormProps) {
    const token = useAtomValue(tokenAtom);
    const { createMutation, updateMutation } = useTahunAjaranMutations(token);

    const isEdit = !!initialData?.id;

    // Local interface for form handling to manage string dates
    interface FormData {
        nama: string;
        tanggalMulai: string;
        tanggalSelesai: string;
        isAktif: boolean;
    }

    const {
        register,
        handleSubmit,
        reset,
        formState: { errors, isSubmitting }
    } = useForm<FormData>({
        // @ts-ignore - Resolver types mismatch due to date/string conversion
        resolver: zodResolver(createTahunAjaranSchema),
        defaultValues: {
            nama: '',
            tanggalMulai: '',
            tanggalSelesai: '',
            isAktif: false,
        }
    });

    useEffect(() => {
        if (isOpen) {
            if (initialData) {
                reset({
                    nama: initialData.nama || '',
                    tanggalMulai: initialData.tanggalMulai ? new Date(initialData.tanggalMulai).toISOString().split('T')[0] : '',
                    tanggalSelesai: initialData.tanggalSelesai ? new Date(initialData.tanggalSelesai).toISOString().split('T')[0] : '',
                    isAktif: initialData.isAktif || false,
                });
            } else {
                reset({
                    nama: '',
                    tanggalMulai: '',
                    tanggalSelesai: '',
                    isAktif: false,
                });
            }
        }
    }, [isOpen, initialData, reset]);

    const onSubmit = async (data: Record<string, unknown>) => {
        try {
            // Data is already validated and transformed by Zod resolver
            // The zod resolver transforms string dates to Date objects
            const payload = data as unknown as CreateTahunAjaranInput;

            if (isEdit && initialData?.id) {
                await updateMutation.mutateAsync({ id: initialData.id, data: payload as UpdateTahunAjaranInput });
            } else {
                await createMutation.mutateAsync(payload);
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
                                    {isEdit ? 'Edit Tahun Ajaran' : 'Tambah Tahun Ajaran'}
                                </h3>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1 leading-none italic">Kelola periode akademik sekolah.</p>
                            </div>
                            <button
                                onClick={onClose}
                                className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors active:scale-90"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        {/* Form Body */}
                        <div className="p-5">
                            <form id="tahun-ajaran-form" onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 leading-none">Nama Periode <span className="text-red-500 font-bold">*</span></label>
                                    <input
                                        {...register('nama')}
                                        placeholder="Contoh: 2024/2025"
                                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-4 focus:ring-blue-500/10 transition-all font-black text-xs placeholder:italic"
                                    />
                                    {errors.nama && <span className="text-[9px] text-red-500 font-black uppercase tracking-tighter italic">{errors.nama.message}</span>}
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 leading-none">Tanggal Mulai <span className="text-red-500 font-bold">*</span></label>
                                        <input
                                            type="date"
                                            {...register('tanggalMulai')}
                                            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-4 focus:ring-blue-500/10 transition-all text-xs font-black font-mono"
                                        />
                                        {errors.tanggalMulai && <span className="text-[9px] text-red-500 font-black uppercase tracking-tighter italic">{errors.tanggalMulai.message}</span>}
                                    </div>

                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 leading-none">Tanggal Selesai <span className="text-red-500 font-bold">*</span></label>
                                        <input
                                            type="date"
                                            {...register('tanggalSelesai')}
                                            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-4 focus:ring-blue-500/10 transition-all text-xs font-black font-mono"
                                        />
                                        {errors.tanggalSelesai && <span className="text-[9px] text-red-500 font-black uppercase tracking-tighter italic">{errors.tanggalSelesai.message}</span>}
                                    </div>
                                </div>

                                <div className="flex items-center gap-3 p-3 bg-slate-50/50 border border-slate-100 rounded-xl">
                                    <input
                                        type="checkbox"
                                        id="isAktif"
                                        {...register('isAktif')}
                                        className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500 border-slate-300"
                                    />
                                    <div>
                                        <label htmlFor="isAktif" className="text-[10px] font-black text-slate-700 cursor-pointer uppercase tracking-tight">Set sebagai Aktif</label>
                                        <p className="text-[9px] text-slate-400 font-bold italic leading-none">Periode aktif akan menjadi default sistem.</p>
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
                                form="tahun-ajaran-form"
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
