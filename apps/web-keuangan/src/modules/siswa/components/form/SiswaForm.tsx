
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

    const inputClass = "w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-4 focus:ring-blue-500/10 transition-all font-black text-xs text-slate-900 placeholder:italic";
    const iconInputWrapper = "flex items-center gap-2 border border-slate-200 rounded-lg px-2.5 bg-slate-50 focus-within:ring-4 focus-within:ring-blue-500/10 transition-all";

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
                        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-white sticky top-0 z-10 shrink-0">
                            <div>
                                <h2 className="text-base font-black text-slate-900 uppercase tracking-tight leading-none italic">
                                    {isEdit ? 'Edit Data Siswa' : 'Registrasi Siswa Baru'}
                                </h2>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1 leading-none italic">
                                    Isi data lengkap siswa untuk keperluan akademik dan administrasi.
                                </p>
                            </div>
                            <button
                                onClick={onClose}
                                className="p-1.5 hover:bg-slate-100 rounded-full transition-colors text-slate-400 hover:text-slate-600 active:scale-90"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        <div className="border-b border-slate-100 px-5 shrink-0 bg-slate-50/50">
                            <div className="flex gap-4 overflow-x-auto scrollbar-hide">
                                <TabButton id="data-diri" active={activeTab} onClick={setActiveTab} icon={User}>DATA DIRI</TabButton>
                                <TabButton id="orang-tua" active={activeTab} onClick={setActiveTab} icon={Users}>ORANG TUA</TabButton>
                                <TabButton id="akademik" active={activeTab} onClick={setActiveTab} icon={GraduationCap}>AKADEMIK</TabButton>
                                <TabButton id="ekskul" active={activeTab} onClick={setActiveTab} icon={Target}>EKSKUL</TabButton>
                            </div>
                        </div>

                        <div className="p-4 overflow-y-auto custom-scrollbar grow text-left">
                            <form id="siswa-form" onSubmit={handleSubmit(onSubmit as any)} className="space-y-4">
                                {/* Tab 1: Data Diri */}
                                {activeTab === 'data-diri' && (
                                    <div className="space-y-4 animate-in fade-in duration-300">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div className="md:col-span-2 space-y-1.5">
                                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 leading-none">Nama Lengkap <span className="text-red-500 font-bold">*</span></label>
                                                <input {...register('namaLengkap')} placeholder="Nama lengkap sesuai akta" className={inputClass} />
                                                {errors.namaLengkap && <span className="text-[9px] text-red-500 font-black uppercase tracking-tighter italic">{errors.namaLengkap.message}</span>}
                                            </div>
                                            <div className="space-y-1.5">
                                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 leading-none">NIS <span className="text-slate-300 font-bold">(OPSIONAL)</span></label>
                                                <input {...register('nis')} placeholder="YY[Urut]" className={`${inputClass} font-mono`} />
                                            </div>
                                            <div className="space-y-1.5">
                                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 leading-none">Jenis Kelamin <span className="text-red-500 font-bold">*</span></label>
                                                <div className="flex gap-4 pt-1">
                                                    <RadioLabel id="L" label="Laki-laki" register={register('jenisKelamin')} color="blue" />
                                                    <RadioLabel id="P" label="Perempuan" register={register('jenisKelamin')} color="pink" />
                                                </div>
                                            </div>
                                            <div className="space-y-1.5">
                                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 leading-none">Tempat Lahir</label>
                                                <div className={iconInputWrapper}>
                                                    <MapPin size={14} className="text-slate-400" />
                                                    <input {...register('tempatLahir')} placeholder="Kota kelahiran" className="w-full py-2 focus:outline-none bg-transparent font-black text-xs" />
                                                </div>
                                            </div>
                                            <div className="space-y-1.5">
                                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 leading-none">Tanggal Lahir</label>
                                                <div className={iconInputWrapper}>
                                                    <Calendar size={14} className="text-slate-400" />
                                                    <input type="date" {...register('tanggalLahir')} className="w-full py-2 focus:outline-none bg-transparent font-black text-xs cursor-pointer" />
                                                </div>
                                            </div>
                                            <div className="md:col-span-2 space-y-1.5">
                                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 leading-none">Alamat</label>
                                                <textarea {...register('alamat')} rows={2} placeholder="Alamat lengkap..." className={`${inputClass} resize-none`} />
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Tab 2: Orang Tua */}
                                {activeTab === 'orang-tua' && (
                                    <div className="space-y-4 animate-in fade-in duration-300">
                                        <div className="space-y-4">
                                            <div className="space-y-1.5">
                                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 leading-none">Nama Orang Tua / Wali <span className="text-red-500 font-bold">*</span></label>
                                                <input {...register('namaOrtu')} placeholder="Nama Ayah/Ibu/Wali" className={inputClass} />
                                                {errors.namaOrtu && <span className="text-[9px] text-red-500 font-black uppercase tracking-tighter italic">{errors.namaOrtu.message}</span>}
                                            </div>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <div className="space-y-1.5">
                                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 leading-none">No. WhatsApp <span className="text-red-500 font-bold">*</span></label>
                                                    <div className={iconInputWrapper}>
                                                        <Phone size={14} className="text-slate-400" />
                                                        <input {...register('noHpOrtu')} placeholder="08xxxxxxxxxx" className="w-full py-2 focus:outline-none bg-transparent font-black text-xs" />
                                                    </div>
                                                </div>
                                                <div className="space-y-1.5">
                                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 leading-none">Email <span className="text-slate-300 font-bold">(OPSIONAL)</span></label>
                                                    <div className={iconInputWrapper}>
                                                        <Mail size={14} className="text-slate-400" />
                                                        <input type="email" {...register('emailOrtu')} placeholder="email@contoh.com" className="w-full py-2 focus:outline-none bg-transparent font-black text-xs" />
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Tab 3: Akademik */}
                                {activeTab === 'akademik' && (
                                    <div className="space-y-4 animate-in fade-in duration-300">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div className="space-y-1.5">
                                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 leading-none">Rombel (Kelas) <span className="text-red-500 font-bold">*</span></label>
                                                <select {...register('rombelId')} className={`${inputClass} cursor-pointer`}>
                                                    <option value="">Pilih Kelas...</option>
                                                    {rombelList?.map((r: any) => (
                                                        <option key={r.id} value={r.id}>{r.jenjang.kode} - {r.nama}</option>
                                                    ))}
                                                </select>
                                                {errors.rombelId && <span className="text-[9px] text-red-500 font-black uppercase tracking-tighter italic">{errors.rombelId.message}</span>}
                                            </div>
                                            <div className="space-y-1.5">
                                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 leading-none">Status Siswa <span className="text-red-500 font-bold">*</span></label>
                                                <select {...register('status')} className={`${inputClass} cursor-pointer uppercase`}>
                                                    <option value="CALON_SISWA">CALON SISWA</option>
                                                    <option value="AKTIF">AKTIF</option>
                                                    <option value="CUTI">CUTI</option>
                                                    <option value="LULUS">LULUS</option>
                                                    <option value="KELUAR">KELUAR</option>
                                                </select>
                                            </div>
                                            <div className="space-y-1.5">
                                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 leading-none">Tanggal Masuk <span className="text-red-500 font-bold">*</span></label>
                                                <input type="date" {...register('tanggalMasuk')} className={`${inputClass} cursor-pointer`} />
                                            </div>

                                            <div className="flex flex-col gap-3 pt-3 md:col-span-2 border-t border-slate-100 mt-1">
                                                <div className="flex items-center gap-3">
                                                    <input type="checkbox" id="isMutasi" {...register('isMutasi')} className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500" />
                                                    <label htmlFor="isMutasi" className="text-[10px] font-black text-slate-700 cursor-pointer uppercase tracking-tight">Siswa Mutasi Masuk? (Pindahan)</label>
                                                </div>
                                                <AnimatePresence>
                                                    {isMutasi && (
                                                        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                                                            <div className="space-y-1.5 pt-1">
                                                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 leading-none">Asal Sekolah</label>
                                                                <input {...register('asalSekolah')} placeholder="Nama sekolah asal..." className={inputClass} />
                                                            </div>
                                                        </motion.div>
                                                    )}
                                                </AnimatePresence>
                                            </div>

                                            <div className="flex items-center gap-3 pt-3 border-t border-slate-100 md:col-span-2">
                                                <input type="checkbox" id="daycare" {...register('ikutDaycare')} className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500" />
                                                <label htmlFor="daycare" className="text-[10px] font-black text-slate-700 cursor-pointer uppercase tracking-tight">Ikut Program Daycare?</label>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Tab 4: Ekskul */}
                                {activeTab === 'ekskul' && (
                                    <div className="space-y-3 animate-in fade-in duration-300">
                                        <div className="p-3 bg-yellow-50 text-yellow-800 rounded-lg text-[10px] font-black uppercase tracking-tight italic border border-yellow-200 leading-none">
                                            <strong>INFO:</strong> PASTA adalah kegiatan tambahan berbayar yang ditagihkan bulanan.
                                        </div>
                                        {isLoadingPasta ? (
                                            <div className="text-center py-8 text-slate-400 text-[10px] font-black uppercase tracking-widest italic">Memuat...</div>
                                        ) : (
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                                {pastaList?.map((pasta: any) => (
                                                    <label key={pasta.id} className="relative flex items-center gap-3 p-3 rounded-lg border border-slate-100 cursor-pointer hover:border-blue-200 transition-all bg-white has-checked:border-blue-500 has-checked:bg-blue-50/30">
                                                        <input type="checkbox" value={pasta.id} {...register('pastaIds')} className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500" />
                                                        <div className="flex-1">
                                                            <div className="font-black text-slate-800 text-xs uppercase tracking-tight italic">{pasta.nama}</div>
                                                            <div className="text-[8px] text-slate-400 font-black uppercase tracking-widest">{formatTime(pasta.jamMulai)} - {formatTime(pasta.jamSelesai)}</div>
                                                        </div>
                                                        <div className="text-right">
                                                            <div className="font-black text-blue-600 text-[10px] font-mono">{formatCurrency(pasta.biaya)}</div>
                                                        </div>
                                                    </label>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </form>
                        </div>

                        <div className="px-5 py-4 border-t border-slate-100 bg-slate-50/50 flex justify-between items-center gap-3 sticky bottom-0 shrink-0">
                            <div className="text-[9px] text-slate-400 font-black uppercase tracking-widest italic leading-none">* Wajib diisi</div>
                            <div className="flex gap-2">
                                <button onClick={onClose} type="button" className="px-4 py-2 text-[10px] font-black text-slate-500 hover:text-slate-800 hover:bg-slate-200/50 rounded-lg transition-all uppercase tracking-widest italic">Batal</button>
                                <button
                                    type="submit"
                                    form="siswa-form"
                                    disabled={isSubmitting}
                                    className="bg-blue-600 text-white px-5 py-2 text-[10px] font-black rounded-lg hover:bg-blue-700 transition-all shadow-lg shadow-blue-200 active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed flex items-center gap-2 uppercase tracking-widest italic"
                                >
                                    {isSubmitting ? <Loader /> : <><Save size={14} /><span>Simpan</span></>}
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
            className={`py-3 text-[10px] font-black uppercase tracking-widest border-b-2 transition-all flex items-center gap-2 shrink-0 italic ${isActive ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-400 hover:text-slate-700'}`}
        >
            <Icon size={14} /> {children}
        </button>
    );
}

function RadioLabel({ id, label, register, color }: any) {
    const colorClass = color === 'pink' ? 'text-pink-600 focus:ring-pink-500' : 'text-blue-600 focus:ring-blue-500';
    return (
        <label className="flex items-center gap-1.5 cursor-pointer group">
            <input type="radio" value={id} {...register} className={`w-3.5 h-3.5 ${colorClass} bg-slate-50 border-slate-200 pointer-events-none group-hover:scale-110 transition-transform`} />
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest italic leading-none">{label}</span>
        </label>
    );
}

function Loader() {
    return (
        <>
            <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            <span>Menyimpan...</span>
        </>
    );
}
