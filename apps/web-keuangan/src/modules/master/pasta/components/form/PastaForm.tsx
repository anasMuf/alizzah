
'use client';

import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { createPastaSchema, CreatePastaInput, UpdatePastaInput } from '@alizzah/validators';
import { X, Save, Calendar } from 'lucide-react';
import { usePastaMutations } from '../../hooks/usePastaMutations';
import { useAtomValue } from 'jotai';
import { tokenAtom } from '~/stores/auth';
import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { formatNumber, parseCurrency } from '@alizzah/shared';

interface PastaFormProps {
    isOpen: boolean;
    onClose: () => void;
    initialData?: { id: string } & UpdatePastaInput;
}

export function PastaForm({ isOpen, onClose, initialData }: PastaFormProps) {
    const token = useAtomValue(tokenAtom);
    const { createMutation, updateMutation } = usePastaMutations(token);

    const isEdit = !!initialData?.id;

    // Local form handling to manage string times
    interface FormData extends Omit<CreatePastaInput, 'jamMulai' | 'jamSelesai'> {
        jamMulai: string;
        jamSelesai: string;
    }

    const {
        register,
        handleSubmit,
        reset,
        control,
        formState: { errors, isSubmitting }
    } = useForm<FormData>({
        // @ts-ignore
        resolver: zodResolver(createPastaSchema),
        defaultValues: {
            nama: '',
            biaya: 0,
            hari: '',
            jamMulai: '',
            jamSelesai: '',
            isAktif: true,
        }
    });

    useEffect(() => {
        if (isOpen) {
            if (initialData) {
                reset({
                    nama: initialData.nama || '',
                    biaya: initialData.biaya || 0,
                    hari: initialData.hari || '',
                    jamMulai: initialData.jamMulai ? new Date(initialData.jamMulai).toISOString().substring(11, 16) : '',
                    jamSelesai: initialData.jamSelesai ? new Date(initialData.jamSelesai).toISOString().substring(11, 16) : '',
                    isAktif: initialData.isAktif ?? true,
                });
            } else {
                reset({
                    nama: '',
                    biaya: 0,
                    hari: '',
                    jamMulai: '',
                    jamSelesai: '',
                    isAktif: true,
                });
            }
        }
    }, [isOpen, initialData, reset]);

    const onSubmit = async (data: FormData) => {
        try {
            // Preprocess times to full dates (today's date + time)
            const today = new Date().toISOString().split('T')[0];
            const payload = {
                ...data,
                jamMulai: new Date(`${today}T${data.jamMulai}:00Z`),
                jamSelesai: new Date(`${today}T${data.jamSelesai}:00Z`),
            };

            if (isEdit && initialData?.id) {
                await updateMutation.mutateAsync({ id: initialData.id, data: payload as any });
            } else {
                await createMutation.mutateAsync(payload as any);
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
                        className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden border border-slate-200"
                    >
                        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
                            <div>
                                <h3 className="text-lg font-bold text-slate-900">
                                    {isEdit ? 'Edit Program PASTA' : 'Tambah Program PASTA'}
                                </h3>
                                <p className="text-sm text-slate-500">Kelola program asah talenta (ekskul).</p>
                            </div>
                            <button
                                onClick={onClose}
                                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <div className="p-6">
                            <form id="pasta-form" onSubmit={handleSubmit(onSubmit as any)} className="space-y-5">
                                <div className="space-y-2">
                                    <label className="text-sm font-semibold text-slate-700">Nama Program <span className="text-red-500">*</span></label>
                                    <input
                                        {...register('nama')}
                                        placeholder="Contoh: Robotika Dasar"
                                        className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium"
                                    />
                                    {errors.nama && <span className="text-xs text-red-500 font-medium">{errors.nama.message}</span>}
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm font-semibold text-slate-700">Biaya Bulanan <span className="text-red-500">*</span></label>
                                    <div className="relative group">
                                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 font-semibold group-focus-within:text-blue-500 transition-colors">Rp</div>
                                        <Controller
                                            name="biaya"
                                            control={control}
                                            render={({ field }) => (
                                                <input
                                                    type="text"
                                                    value={field.value === 0 ? '' : formatNumber(field.value)}
                                                    onChange={(e) => field.onChange(parseCurrency(e.target.value))}
                                                    className="w-full pl-12 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-mono"
                                                    placeholder="0"
                                                />
                                            )}
                                        />
                                    </div>
                                    {errors.biaya && <span className="text-xs text-red-500 font-medium">{errors.biaya.message}</span>}
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-sm font-semibold text-slate-700">Hari <span className="text-red-500">*</span></label>
                                        <div className="relative">
                                            <Calendar className="absolute left-3 top-2.5 text-slate-400" size={18} />
                                            <input
                                                {...register('hari')}
                                                placeholder="Contoh: Jumat"
                                                className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                                            />
                                        </div>
                                        {errors.hari && <span className="text-xs text-red-500 font-medium">{errors.hari.message}</span>}
                                    </div>

                                    <div className="grid grid-cols-2 gap-2">
                                        <div className="space-y-2">
                                            <label className="text-sm font-semibold text-slate-700 text-[10px] uppercase">Mulai</label>
                                            <input
                                                type="time"
                                                {...register('jamMulai')}
                                                className="w-full px-2 py-2.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-sm font-semibold text-slate-700 text-[10px] uppercase">Selesai</label>
                                            <input
                                                type="time"
                                                {...register('jamSelesai')}
                                                className="w-full px-2 py-2.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm"
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center gap-3 p-4 bg-slate-50 border border-slate-100 rounded-xl">
                                    <input
                                        type="checkbox"
                                        id="isAktif"
                                        {...register('isAktif')}
                                        className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500 border-gray-300"
                                    />
                                    <div>
                                        <label htmlFor="isAktif" className="text-sm font-semibold text-slate-700 cursor-pointer">Status Aktif</label>
                                        <p className="text-xs text-slate-500">Non-aktifkan jika program ini sedang tidak dibuka.</p>
                                    </div>
                                </div>
                            </form>
                        </div>

                        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-100 bg-slate-50/50">
                            <button
                                onClick={onClose}
                                type="button"
                                disabled={isSubmitting}
                                className="px-5 py-2.5 text-sm font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-200/50 rounded-xl transition-colors"
                            >
                                Batal
                            </button>
                            <button
                                form="pasta-form"
                                type="submit"
                                disabled={isSubmitting}
                                className="flex items-center gap-2 px-6 py-2.5 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 active:scale-95 rounded-xl shadow-lg shadow-blue-200 transition-all disabled:opacity-70 disabled:active:scale-100"
                            >
                                {isSubmitting ? (
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
