
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { createSiswaSchema, CreateSiswaInput, UpdateSiswaInput } from '@alizzah/validators';
import { useSiswaMutations } from '../../hooks/useSiswaMutations';
import { useRombelList } from '~/modules/master/rombel/hooks/useRombelList';
import { usePastaList } from '~/modules/master/pasta/hooks/usePastaList';
import { X, Save, User, Users, GraduationCap, Calendar, MapPin, Phone, Mail, Target } from 'lucide-react';
import { useAtomValue } from 'jotai';
import { tokenAtom } from '~/stores/auth';
import { AnimatePresence, motion } from 'framer-motion';
import { formatCurrency, formatTime } from '@alizzah/shared';

interface SiswaFormProps {
    isOpen: boolean;
    onClose: () => void;
    initialData?: any;
}

export function SiswaForm({ isOpen, onClose, initialData }: SiswaFormProps) {
    const isEdit = !!initialData;
    const token = useAtomValue(tokenAtom);

    // Mutations
    const { createMutation, updateMutation } = useSiswaMutations(token);

    // Dependencies
    const { data: rombelList } = useRombelList(undefined);
    const { data: pastaList, isLoading: isLoadingPasta } = usePastaList();

    // Active Tab state
    const [activeTab, setActiveTab] = useState('data-diri');

    const {
        register,
        handleSubmit,
        reset,
        watch,
        formState: { errors, isSubmitting }
    } = useForm<CreateSiswaInput>({
        // @ts-ignore
        resolver: zodResolver(createSiswaSchema),
        defaultValues: {
            namaLengkap: '',
            jenisKelamin: 'L',
            namaOrtu: '',
            noHpOrtu: '',
            status: 'AKTIF',
            ikutDaycare: false,
            isMutasi: false,
            asalSekolah: '',
        }
    });

    const isMutasi = watch('isMutasi');

    useEffect(() => {
        if (isOpen) {
            setActiveTab('data-diri');
            if (initialData) {
                reset({
                    ...initialData,
                    tanggalLahir: initialData.tanggalLahir ? new Date(initialData.tanggalLahir).toISOString().split('T')[0] : '',
                    tanggalMasuk: initialData.tanggalMasuk ? new Date(initialData.tanggalMasuk).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
                    rombelId: initialData.rombelId,
                    isMutasi: initialData.isMutasi || false,
                    asalSekolah: initialData.asalSekolah || '',
                    pastaIds: initialData.siswaPastas?.map((sp: any) => sp.pastaId) || [],
                } as any);
            } else {
                reset({
                    namaLengkap: '',
                    jenisKelamin: 'L',
                    namaOrtu: '',
                    noHpOrtu: '',
                    status: 'AKTIF',
                    ikutDaycare: false,
                    isMutasi: false,
                    asalSekolah: '',
                    tanggalMasuk: new Date().toISOString().split('T')[0],
                    rombelId: '',
                    pastaIds: [],
                    nis: undefined,
                } as any);
            }
        }
    }, [isOpen, initialData, reset]);

    const onSubmit = async (data: CreateSiswaInput) => {
        try {
            if (isEdit && initialData?.id) {
                await updateMutation.mutateAsync({ id: initialData.id, data: data as UpdateSiswaInput });
            } else {
                await createMutation.mutateAsync(data);
            }
            onClose();
        } catch (err) { }
    };

    const inputClass = "w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium text-slate-900 placeholder:text-slate-400";
    const iconInputWrapper = "flex items-center gap-2 border border-slate-200 rounded-xl px-3 bg-white focus-within:ring-2 focus-within:ring-blue-500/20 focus-within:border-blue-500 transition-all";

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
                        initial={{ scale: 0.95, opacity: 0, y: 20 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0.95, opacity: 0, y: 20 }}
                        onClick={(e) => e.stopPropagation()}
                        className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col h-[85vh] relative z-10"
                    >
                        <div className="flex items-center justify-between p-6 border-b border-slate-100 bg-white sticky top-0 z-10 shrink-0">
                            <div>
                                <h2 className="text-xl font-bold text-slate-900">
                                    {isEdit ? 'Edit Data Siswa' : 'Registrasi Siswa Baru'}
                                </h2>
                                <p className="text-sm text-slate-500 mt-1">
                                    Isi data lengkap siswa untuk keperluan akademik dan administrasi.
                                </p>
                            </div>
                            <button
                                onClick={onClose}
                                className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400 hover:text-slate-600"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <div className="border-b border-slate-100 px-6 shrink-0 bg-slate-50/50">
                            <div className="flex gap-6 overflow-x-auto scrollbar-hide">
                                <TabButton id="data-diri" active={activeTab} onClick={setActiveTab} icon={User}>Data Diri</TabButton>
                                <TabButton id="orang-tua" active={activeTab} onClick={setActiveTab} icon={Users}>Orang Tua</TabButton>
                                <TabButton id="akademik" active={activeTab} onClick={setActiveTab} icon={GraduationCap}>Akademik</TabButton>
                                <TabButton id="ekskul" active={activeTab} onClick={setActiveTab} icon={Target}>Ekskul</TabButton>
                            </div>
                        </div>

                        <div className="p-6 overflow-y-auto custom-scrollbar grow">
                            <form id="siswa-form" onSubmit={handleSubmit(onSubmit as any)} className="space-y-6">
                                {/* Tab 1: Data Diri */}
                                {activeTab === 'data-diri' && (
                                    <div className="space-y-5 animate-in fade-in duration-300">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div className="md:col-span-2 space-y-2">
                                                <label className="text-sm font-semibold text-slate-700">Nama Lengkap <span className="text-red-500">*</span></label>
                                                <input {...register('namaLengkap')} placeholder="Nama lengkap sesuai akta" className={inputClass} />
                                                {errors.namaLengkap && <span className="text-xs text-red-500 font-medium">{errors.namaLengkap.message}</span>}
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-sm font-semibold text-slate-700">NIS <span className="text-slate-400 font-normal">(Opsional)</span></label>
                                                <input {...register('nis')} placeholder="YY[Urut]" className={`${inputClass} font-mono`} />
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-sm font-semibold text-slate-700">Jenis Kelamin <span className="text-red-500">*</span></label>
                                                <div className="flex gap-4 pt-1">
                                                    <RadioLabel id="L" label="Laki-laki" register={register('jenisKelamin')} color="blue" />
                                                    <RadioLabel id="P" label="Perempuan" register={register('jenisKelamin')} color="pink" />
                                                </div>
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-sm font-semibold text-slate-700">Tempat Lahir</label>
                                                <div className={iconInputWrapper}>
                                                    <MapPin size={16} className="text-slate-400" />
                                                    <input {...register('tempatLahir')} placeholder="Kota kelahiran" className="w-full py-2.5 focus:outline-none bg-transparent font-medium" />
                                                </div>
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-sm font-semibold text-slate-700">Tanggal Lahir</label>
                                                <div className={iconInputWrapper}>
                                                    <Calendar size={16} className="text-slate-400" />
                                                    <input type="date" {...register('tanggalLahir')} className="w-full py-2.5 focus:outline-none bg-transparent font-medium" />
                                                </div>
                                            </div>
                                            <div className="md:col-span-2 space-y-2">
                                                <label className="text-sm font-semibold text-slate-700">Alamat</label>
                                                <textarea {...register('alamat')} rows={2} placeholder="Alamat lengkap..." className={`${inputClass} resize-none`} />
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Tab 2: Orang Tua */}
                                {activeTab === 'orang-tua' && (
                                    <div className="space-y-5 animate-in fade-in duration-300">
                                        <div className="space-y-4">
                                            <div className="space-y-2">
                                                <label className="text-sm font-semibold text-slate-700">Nama Orang Tua / Wali <span className="text-red-500">*</span></label>
                                                <input {...register('namaOrtu')} placeholder="Nama Ayah/Ibu/Wali" className={inputClass} />
                                                {errors.namaOrtu && <span className="text-xs text-red-500 font-medium">{errors.namaOrtu.message}</span>}
                                            </div>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <div className="space-y-2">
                                                    <label className="text-sm font-semibold text-slate-700">No. WhatsApp <span className="text-red-500">*</span></label>
                                                    <div className={iconInputWrapper}>
                                                        <Phone size={16} className="text-slate-400" />
                                                        <input {...register('noHpOrtu')} placeholder="08xxxxxxxxxx" className="w-full py-2.5 focus:outline-none bg-transparent font-medium" />
                                                    </div>
                                                </div>
                                                <div className="space-y-2">
                                                    <label className="text-sm font-semibold text-slate-700">Email (Opsional)</label>
                                                    <div className={iconInputWrapper}>
                                                        <Mail size={16} className="text-slate-400" />
                                                        <input type="email" {...register('emailOrtu')} placeholder="email@contoh.com" className="w-full py-2.5 focus:outline-none bg-transparent font-medium" />
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Tab 3: Akademik */}
                                {activeTab === 'akademik' && (
                                    <div className="space-y-5 animate-in fade-in duration-300">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <label className="text-sm font-semibold text-slate-700">Rombel (Kelas) <span className="text-red-500">*</span></label>
                                                <select {...register('rombelId')} className={inputClass}>
                                                    <option value="">Pilih Kelas...</option>
                                                    {rombelList?.map((r: any) => (
                                                        <option key={r.id} value={r.id}>{r.jenjang.kode} - {r.nama} ({r.tahunAjaran.nama})</option>
                                                    ))}
                                                </select>
                                                {errors.rombelId && <span className="text-xs text-red-500 font-medium">{errors.rombelId.message}</span>}
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-sm font-semibold text-slate-700">Status Siswa <span className="text-red-500">*</span></label>
                                                <select {...register('status')} className={inputClass}>
                                                    <option value="CALON_SISWA">Calon Siswa</option>
                                                    <option value="AKTIF">Aktif</option>
                                                    <option value="CUTI">Cuti</option>
                                                    <option value="LULUS">Lulus</option>
                                                    <option value="KELUAR">Keluar</option>
                                                </select>
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-sm font-semibold text-slate-700">Tanggal Masuk <span className="text-red-500">*</span></label>
                                                <input type="date" {...register('tanggalMasuk')} className={inputClass} />
                                            </div>

                                            <div className="flex flex-col gap-4 pt-4 md:col-span-2 border-t border-slate-100 mt-2">
                                                <div className="flex items-center gap-3">
                                                    <input type="checkbox" id="isMutasi" {...register('isMutasi')} className="w-5 h-5 rounded border-slate-300 text-blue-600 focus:ring-blue-500" />
                                                    <label htmlFor="isMutasi" className="text-sm font-bold text-slate-700 cursor-pointer">Siswa Mutasi Masuk? (Pindahan)</label>
                                                </div>
                                                <AnimatePresence>
                                                    {isMutasi && (
                                                        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                                                            <div className="space-y-2 pt-2">
                                                                <label className="text-sm font-semibold text-slate-700">Asal Sekolah</label>
                                                                <input {...register('asalSekolah')} placeholder="Nama sekolah asal..." className={inputClass} />
                                                            </div>
                                                        </motion.div>
                                                    )}
                                                </AnimatePresence>
                                            </div>

                                            <div className="flex items-center gap-3 pt-4 border-t border-slate-100 md:col-span-2">
                                                <input type="checkbox" id="daycare" {...register('ikutDaycare')} className="w-5 h-5 rounded border-slate-300 text-blue-600 focus:ring-blue-500" />
                                                <label htmlFor="daycare" className="text-sm font-semibold text-slate-700 cursor-pointer">Ikut Program Daycare?</label>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Tab 4: Ekskul */}
                                {activeTab === 'ekskul' && (
                                    <div className="space-y-4 animate-in fade-in duration-300">
                                        <div className="p-4 bg-yellow-50 text-yellow-800 rounded-xl text-sm border border-yellow-200">
                                            <strong>Info:</strong> PASTA adalah kegiatan tambahan berbayar yang ditagihkan bulanan.
                                        </div>
                                        {isLoadingPasta ? (
                                            <div className="text-center py-8 text-slate-500 text-sm">Memuat...</div>
                                        ) : (
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                {pastaList?.map((pasta: any) => (
                                                    <label key={pasta.id} className="relative flex items-center gap-4 p-4 rounded-xl border-2 border-slate-100 cursor-pointer hover:border-blue-200 transition-all bg-white has-checked:border-blue-500 has-checked:bg-blue-50/30">
                                                        <input type="checkbox" value={pasta.id} {...register('pastaIds')} className="w-5 h-5 rounded border-slate-300 text-blue-600 focus:ring-blue-500" />
                                                        <div className="flex-1">
                                                            <div className="font-bold text-slate-800">{pasta.nama}</div>
                                                            <div className="text-[10px] text-slate-500">{formatTime(pasta.jamMulai)} - {formatTime(pasta.jamSelesai)}</div>
                                                        </div>
                                                        <div className="text-right">
                                                            <div className="font-bold text-blue-600 text-sm">{formatCurrency(pasta.biaya)}</div>
                                                        </div>
                                                    </label>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </form>
                        </div>

                        <div className="p-6 border-t border-slate-100 bg-slate-50/50 flex justify-between gap-3 sticky bottom-0 shrink-0">
                            <div className="text-xs text-slate-400 font-medium py-2">* Wajib diisi</div>
                            <div className="flex gap-3">
                                <button onClick={onClose} type="button" className="px-5 py-2.5 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-100 transition-all">Batal</button>
                                <button
                                    type="submit"
                                    form="siswa-form"
                                    disabled={isSubmitting}
                                    className="bg-blue-600 text-white px-5 py-2.5 rounded-xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-200 font-bold active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed flex items-center gap-2"
                                >
                                    {isSubmitting ? <Loader /> : <><Save size={18} /><span>Simpan</span></>}
                                </button>
                            </div>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}

// Helper Components
function TabButton({ id, active, onClick, icon: Icon, children }: any) {
    const isActive = active === id;
    return (
        <button
            onClick={() => onClick(id)}
            className={`py-3 text-sm font-semibold border-b-2 transition-all flex items-center gap-2 shrink-0 ${isActive ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
        >
            <Icon size={16} /> {children}
        </button>
    );
}

function RadioLabel({ id, label, register, color }: any) {
    const colorClass = color === 'pink' ? 'text-pink-600 focus:ring-pink-500' : 'text-blue-600 focus:ring-blue-500';
    return (
        <label className="flex items-center gap-2 cursor-pointer">
            <input type="radio" value={id} {...register} className={`w-4 h-4 ${colorClass}`} />
            <span className="text-sm text-slate-700">{label}</span>
        </label>
    );
}

function Loader() {
    return (
        <>
            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            <span>Menyimpan...</span>
        </>
    );
}
