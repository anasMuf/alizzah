
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { createRombelSchema, CreateRombelInput, UpdateRombelInput } from '@alizzah/validators';
import { useRombelMutations } from '~/modules/master/rombel/hooks/useRombelMutations';
import { useJenjangList } from '~/modules/master/jenjang/hooks/useJenjangList';
import { useTahunAjaranList } from '~/modules/master/tahun-ajaran/hooks/useTahunAjaranList';
import { X, Save, AlertCircle } from 'lucide-react';
import { useAtomValue } from 'jotai';
import { tokenAtom } from '~/stores/auth';
import { AnimatePresence, motion } from 'framer-motion';

interface RombelFormProps {
    isOpen: boolean;
    onClose: () => void;
    initialData?: any;
}

export function RombelForm({ isOpen, onClose, initialData }: RombelFormProps) {
    const isEdit = !!initialData;
    const token = useAtomValue(tokenAtom);

    // Mutations
    const { createMutation, updateMutation } = useRombelMutations(token);

    // Data Dependencies
    const { data: jenjangList } = useJenjangList(token);
    const { data: tahunAjaranList } = useTahunAjaranList(token);

    const {
        register,
        handleSubmit,
        reset,
        setValue,
        formState: { errors, isSubmitting }
    } = useForm<CreateRombelInput>({
        // @ts-ignore
        resolver: zodResolver(createRombelSchema),
        defaultValues: {
            nama: '',
            kapasitas: 25,
            jenjangId: '',
            tahunAjaranId: '',
            waliKelas: '',
            isMutasi: false,
        }
    });

    useEffect(() => {
        if (isOpen) {
            if (initialData) {
                reset({
                    nama: initialData.nama,
                    kapasitas: initialData.kapasitas,
                    jenjangId: initialData.jenjangId,
                    tahunAjaranId: initialData.tahunAjaranId,
                    waliKelas: initialData.waliKelas || '',
                    isMutasi: initialData.isMutasi || false,
                });
            } else {
                reset({
                    nama: '',
                    kapasitas: 25,
                    jenjangId: '',
                    tahunAjaranId: '', // Ideally default to active academic year
                    waliKelas: '',
                    isMutasi: false,
                });
                // Set default active academic year if available
                if (tahunAjaranList) {
                    const active = tahunAjaranList.find((t: any) => t.isAktif);
                    if (active) setValue('tahunAjaranId', active.id);
                }
            }
        }
    }, [isOpen, initialData, reset, tahunAjaranList, setValue]);

    const onSubmit = async (data: CreateRombelInput) => {
        try {
            if (isEdit && initialData?.id) {
                await updateMutation.mutateAsync({ id: initialData.id, data: data as UpdateRombelInput });
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
                <>
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4"
                    >
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.95, opacity: 0, y: 20 }}
                            onClick={(e) => e.stopPropagation()}
                            className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]"
                        >
                            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-white sticky top-0 z-10">
                                <div>
                                    <h2 className="text-base font-black text-slate-900 uppercase tracking-tight leading-none italic">
                                        {isEdit ? 'Edit Rombel' : 'Tambah Rombel Baru'}
                                    </h2>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1 leading-none italic">
                                        {isEdit ? 'Perbarui data rombongan belajar.' : 'Buat rombongan belajar untuk tahun ajaran aktif.'}
                                    </p>
                                </div>
                                <button
                                    onClick={onClose}
                                    className="p-1.5 hover:bg-slate-100 rounded-full transition-colors text-slate-400 hover:text-slate-600"
                                >
                                    <X size={18} />
                                </button>
                            </div>

                            <div className="p-5 overflow-y-auto custom-scrollbar text-left">
                                <form id="rombel-form" onSubmit={handleSubmit(onSubmit as any)} className="space-y-4">

                                    {/* Tahun Ajaran & Jenjang Row */}
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-1.5">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 leading-none">Tahun Ajaran <span className="text-red-500 font-bold">*</span></label>
                                            <select
                                                {...register('tahunAjaranId')}
                                                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-4 focus:ring-blue-500/10 transition-all font-black text-xs appearance-none cursor-pointer"
                                            >
                                                <option value="">Pilih Tahun...</option>
                                                {tahunAjaranList?.map((ta: any) => (
                                                    <option key={ta.id} value={ta.id}>{ta.nama}</option>
                                                ))}
                                            </select>
                                            {errors.tahunAjaranId && <span className="text-[9px] text-red-500 font-black uppercase tracking-tighter italic">{errors.tahunAjaranId.message}</span>}
                                        </div>

                                        <div className="space-y-1.5">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 leading-none">Jenjang <span className="text-red-500 font-bold">*</span></label>
                                            <select
                                                {...register('jenjangId')}
                                                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-4 focus:ring-blue-500/10 transition-all font-black text-xs appearance-none cursor-pointer"
                                            >
                                                <option value="">Pilih Jenjang...</option>
                                                {jenjangList?.map((j: any) => (
                                                    <option key={j.id} value={j.id}>{j.nama} ({j.kode})</option>
                                                ))}
                                            </select>
                                            {errors.jenjangId && <span className="text-[9px] text-red-500 font-black uppercase tracking-tighter italic">{errors.jenjangId.message}</span>}
                                        </div>
                                    </div>

                                    {/* Nama Rombel & Kapasitas Row */}
                                    <div className="grid grid-cols-3 gap-4">
                                        <div className="col-span-2 space-y-1.5">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 leading-none">Nama Rombel <span className="text-red-500 font-bold">*</span></label>
                                            <input
                                                {...register('nama')}
                                                placeholder="Contoh: Kelas Abu Bakar"
                                                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-4 focus:ring-blue-500/10 transition-all font-black text-xs placeholder:italic"
                                            />
                                            {errors.nama && <span className="text-[9px] text-red-500 font-black uppercase tracking-tighter italic">{errors.nama.message}</span>}
                                        </div>

                                        <div className="space-y-1.5">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 leading-none">Kapasitas</label>
                                            <input
                                                type="number"
                                                {...register('kapasitas', { valueAsNumber: true })}
                                                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-4 focus:ring-blue-500/10 transition-all font-black text-xs font-mono"
                                            />
                                            {errors.kapasitas && <span className="text-[9px] text-red-500 font-black uppercase tracking-tighter italic">{errors.kapasitas.message}</span>}
                                        </div>
                                    </div>

                                    {/* Wali Kelas */}
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 leading-none">Wali Kelas</label>
                                        <input
                                            {...register('waliKelas')}
                                            placeholder="Nama Wali Kelas (Opsional)"
                                            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-4 focus:ring-blue-500/10 transition-all font-black text-xs placeholder:italic"
                                        />
                                        <p className="text-[9px] text-slate-400 font-bold uppercase tracking-tight italic leading-none">Guru yang bertanggung jawab atas kelas ini.</p>
                                    </div>

                                    <div className="flex items-center gap-3 p-3 bg-orange-50/50 rounded-xl border border-orange-100">
                                        <input
                                            type="checkbox"
                                            id="isMutasi"
                                            {...register('isMutasi')}
                                            className="w-4 h-4 text-orange-600 border-slate-300 rounded focus:ring-orange-500"
                                        />
                                        <div className="flex flex-col">
                                            <label htmlFor="isMutasi" className="text-[10px] font-black text-orange-700 cursor-pointer uppercase tracking-tight">
                                                Kelas Mutasi (Pindahan)
                                            </label>
                                            <p className="text-[9px] text-slate-500 font-bold italic leading-none">
                                                Dicentang jika kelas ini ditujukan khusus untuk siswa pindahan/mutasi.
                                            </p>
                                        </div>
                                    </div>

                                    {/* Alert Info */}
                                    <div className="bg-blue-50 px-3 py-2 rounded-lg flex items-start gap-2 border border-blue-100">
                                        <AlertCircle size={14} className="text-blue-600 mt-0.5 shrink-0" />
                                        <p className="text-[9px] font-black text-blue-700 uppercase tracking-tight italic leading-relaxed">
                                            Pastikan kombinasi Jenjang, Tahun Ajaran, dan Nama Rombel unik.
                                        </p>
                                    </div>

                                </form>
                            </div>

                            <div className="px-5 py-4 border-t border-slate-100 bg-slate-50/50 flex justify-end gap-3 sticky bottom-0">
                                <button
                                    onClick={onClose}
                                    type="button"
                                    className="px-4 py-2 text-[10px] font-black text-slate-500 hover:text-slate-800 hover:bg-slate-200/50 rounded-lg transition-all uppercase tracking-widest italic"
                                >
                                    Batal
                                </button>
                                <button
                                    type="submit"
                                    form="rombel-form"
                                    disabled={isSubmitting}
                                    className="bg-blue-600 text-white px-5 py-2 text-[10px] font-black rounded-lg hover:bg-blue-700 transition-all shadow-lg shadow-blue-200 active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed flex items-center gap-2 uppercase tracking-widest italic"
                                >
                                    {isSubmitting ? (
                                        <>
                                            <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                            <span>Menyimpan...</span>
                                        </>
                                    ) : (
                                        <>
                                            <Save size={14} />
                                            <span>Simpan Rombel</span>
                                        </>
                                    )}
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
