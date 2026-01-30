
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
    const { data: rombelList } = useRombelList(undefined); // Fetch all/many for dropdown
    const { data: pastaList, isLoading: isLoadingPasta } = usePastaList();

    // Active Tab state
    const [activeTab, setActiveTab] = useState('data-diri');

    const {
        register,
        handleSubmit,
        reset,
        formState: { errors, isSubmitting }
    } = useForm<CreateSiswaInput>({
        // @ts-ignore - resolver might be strict
        resolver: zodResolver(createSiswaSchema),
        defaultValues: {
            namaLengkap: '',
            jenisKelamin: 'L',
            namaOrtu: '',
            noHpOrtu: '',
            status: 'AKTIF',
            ikutDaycare: false,
            // Dates handling for HTML date input
        }
    });

    useEffect(() => {
        if (isOpen) {
            setActiveTab('data-diri');
            if (initialData) {
                reset({
                    ...initialData,
                    // Parse dates for input type="date"
                    tanggalLahir: initialData.tanggalLahir ? new Date(initialData.tanggalLahir).toISOString().split('T')[0] : '',
                    tanggalMasuk: initialData.tanggalMasuk ? new Date(initialData.tanggalMasuk).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
                    rombelId: initialData.rombelId,
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
                            className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col h-[85vh]"
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

                            {/* Tabs Navigation */}
                            <div className="border-b border-slate-100 px-6 shrink-0 bg-slate-50/50">
                                <div className="flex gap-6">
                                    <button
                                        onClick={() => setActiveTab('data-diri')}
                                        className={`py-3 text-sm font-semibold border-b-2 transition-all flex items-center gap-2 ${activeTab === 'data-diri' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                                    >
                                        <User size={16} /> Data Diri
                                    </button>
                                    <button
                                        onClick={() => setActiveTab('orang-tua')}
                                        className={`py-3 text-sm font-semibold border-b-2 transition-all flex items-center gap-2 ${activeTab === 'orang-tua' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                                    >
                                        <Users size={16} /> Orang Tua
                                    </button>
                                    <button
                                        onClick={() => setActiveTab('akademik')}
                                        className={`py-3 text-sm font-semibold border-b-2 transition-all flex items-center gap-2 ${activeTab === 'akademik' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                                    >
                                        <GraduationCap size={16} /> Akademik
                                    </button>
                                    <button
                                        onClick={() => setActiveTab('ekskul')}
                                        className={`py-3 text-sm font-semibold border-b-2 transition-all flex items-center gap-2 ${activeTab === 'ekskul' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                                    >
                                        <Target size={16} /> Ekstrakurikuler
                                    </button>
                                </div>
                            </div>

                            <div className="p-6 overflow-y-auto custom-scrollbar grow">
                                <form id="siswa-form" onSubmit={handleSubmit(onSubmit as any)} className="space-y-6">

                                    {/* Tab 1: Data Diri */}
                                    <div className={activeTab === 'data-diri' ? 'block space-y-5' : 'hidden'}>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div className="md:col-span-2 space-y-2">
                                                <label className="text-sm font-semibold text-slate-700">Nama Lengkap <span className="text-red-500">*</span></label>
                                                <input
                                                    {...register('namaLengkap')}
                                                    placeholder="Nama lengkap sesuai akta"
                                                    className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium"
                                                />
                                                {errors.namaLengkap && <span className="text-xs text-red-500 font-medium">{errors.namaLengkap.message}</span>}
                                            </div>

                                            <div className="space-y-2">
                                                <label className="text-sm font-semibold text-slate-700">NIS <span className="text-slate-400 font-normal">(Opsional)</span></label>
                                                <input
                                                    {...register('nis')}
                                                    placeholder="Kosongkan untuk auto-generate"
                                                    className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium font-mono"
                                                />
                                                <p className="text-[10px] text-slate-400">Otomatis format: YY[Urut] (misal 250001)</p>
                                            </div>

                                            <div className="space-y-2">
                                                <label className="text-sm font-semibold text-slate-700">Jenis Kelamin <span className="text-red-500">*</span></label>
                                                <div className="flex gap-4 pt-1">
                                                    <label className="flex items-center gap-2 cursor-pointer">
                                                        <input type="radio" value="L" {...register('jenisKelamin')} className="w-4 h-4 text-blue-600 focus:ring-blue-500" />
                                                        <span className="text-sm text-slate-700">Laki-laki</span>
                                                    </label>
                                                    <label className="flex items-center gap-2 cursor-pointer">
                                                        <input type="radio" value="P" {...register('jenisKelamin')} className="w-4 h-4 text-pink-600 focus:ring-pink-500" />
                                                        <span className="text-sm text-slate-700">Perempuan</span>
                                                    </label>
                                                </div>
                                            </div>

                                            <div className="space-y-2">
                                                <label className="text-sm font-semibold text-slate-700">Tempat Lahir</label>
                                                <div className="flex items-center gap-2 border border-slate-200 rounded-xl px-3 bg-white">
                                                    <MapPin size={16} className="text-slate-400" />
                                                    <input
                                                        {...register('tempatLahir')}
                                                        className="w-full py-2.5 focus:outline-none bg-transparent font-medium"
                                                        placeholder="Kota kelahiran"
                                                    />
                                                </div>
                                            </div>

                                            <div className="space-y-2">
                                                <label className="text-sm font-semibold text-slate-700">Tanggal Lahir</label>
                                                <div className="flex items-center gap-2 border border-slate-200 rounded-xl px-3 bg-white">
                                                    <Calendar size={16} className="text-slate-400" />
                                                    <input
                                                        type="date"
                                                        {...register('tanggalLahir')}
                                                        className="w-full py-2.5 focus:outline-none bg-transparent font-medium"
                                                    />
                                                </div>
                                            </div>

                                            <div className="md:col-span-2 space-y-2">
                                                <label className="text-sm font-semibold text-slate-700">Alamat</label>
                                                <textarea
                                                    {...register('alamat')}
                                                    rows={2}
                                                    placeholder="Alamat lengkap domisili..."
                                                    className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium resize-none"
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Tab 2: Orang Tua */}
                                    <div className={activeTab === 'orang-tua' ? 'block space-y-5' : 'hidden'}>
                                        <div className="space-y-4">
                                            <div className="space-y-2">
                                                <label className="text-sm font-semibold text-slate-700">Nama Orang Tua / Wali <span className="text-red-500">*</span></label>
                                                <input
                                                    {...register('namaOrtu')}
                                                    placeholder="Nama Ayah/Ibu/Wali"
                                                    className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium"
                                                />
                                                {errors.namaOrtu && <span className="text-xs text-red-500 font-medium">{errors.namaOrtu.message}</span>}
                                            </div>

                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <div className="space-y-2">
                                                    <label className="text-sm font-semibold text-slate-700">No. WhatsApp <span className="text-red-500">*</span></label>
                                                    <div className="flex items-center gap-2 border border-slate-200 rounded-xl px-3 bg-white">
                                                        <Phone size={16} className="text-slate-400" />
                                                        <input
                                                            {...register('noHpOrtu')}
                                                            placeholder="08xxxxxxxxxx"
                                                            className="w-full py-2.5 focus:outline-none bg-transparent font-medium"
                                                        />
                                                    </div>
                                                    <p className="text-[10px] text-slate-400">Digunakan untuk notifikasi tagihan.</p>
                                                    {errors.noHpOrtu && <span className="text-xs text-red-500 font-medium">{errors.noHpOrtu.message}</span>}
                                                </div>

                                                <div className="space-y-2">
                                                    <label className="text-sm font-semibold text-slate-700">Email (Opsional)</label>
                                                    <div className="flex items-center gap-2 border border-slate-200 rounded-xl px-3 bg-white">
                                                        <Mail size={16} className="text-slate-400" />
                                                        <input
                                                            {...register('emailOrtu')}
                                                            type="email"
                                                            placeholder="email@contoh.com"
                                                            className="w-full py-2.5 focus:outline-none bg-transparent font-medium"
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Tab 3: Akademik */}
                                    <div className={activeTab === 'akademik' ? 'block space-y-5' : 'hidden'}>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <label className="text-sm font-semibold text-slate-700">Rombel (Kelas) <span className="text-red-500">*</span></label>
                                                <select
                                                    {...register('rombelId')}
                                                    className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium appearance-none"
                                                >
                                                    <option value="">Pilih Kelas...</option>
                                                    {rombelList?.map((r: any) => (
                                                        <option key={r.id} value={r.id}>
                                                            {r.jenjang.kode} - {r.nama} ({r.tahunAjaran.nama})
                                                        </option>
                                                    ))}
                                                </select>
                                                {errors.rombelId && <span className="text-xs text-red-500 font-medium">{errors.rombelId.message}</span>}
                                            </div>

                                            <div className="space-y-2">
                                                <label className="text-sm font-semibold text-slate-700">Status Siswa <span className="text-red-500">*</span></label>
                                                <select
                                                    {...register('status')}
                                                    className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium appearance-none"
                                                >
                                                    <option value="CALON_SISWA">Calon Siswa</option>
                                                    <option value="AKTIF">Aktif</option>
                                                    <option value="CUTI">Cuti</option>
                                                    <option value="LULUS">Lulus</option>
                                                    <option value="KELUAR">Keluar</option>
                                                </select>
                                            </div>

                                            <div className="space-y-2">
                                                <label className="text-sm font-semibold text-slate-700">Tanggal Masuk <span className="text-red-500">*</span></label>
                                                <input
                                                    type="date"
                                                    {...register('tanggalMasuk')}
                                                    className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium"
                                                />
                                            </div>

                                            <div className="flex items-center gap-3 pt-6">
                                                <input
                                                    type="checkbox"
                                                    id="daycare"
                                                    {...register('ikutDaycare')}
                                                    className="w-5 h-5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                                                />
                                                <label htmlFor="daycare" className="text-sm font-semibold text-slate-700 cursor-pointer">
                                                    Ikut Program Daycare?
                                                </label>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Tab 4: Ekskul (PASTA) */}
                                    <div className={activeTab === 'ekskul' ? 'block space-y-5' : 'hidden'}>
                                        <div className="space-y-4">
                                            <div className="p-4 bg-yellow-50 text-yellow-800 rounded-xl text-sm border border-yellow-200">
                                                <strong>Info:</strong> Program Asah Talenta (PASTA) adalah kegiatan tambahan berbayar.<br />
                                                Tagihan akan otomatis ditambahkan ke invoice bulanan siswa.
                                            </div>

                                            {isLoadingPasta ? (
                                                <div className="text-center py-8 text-slate-500 text-sm">Memuat daftar program...</div>
                                            ) : (
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                    {pastaList?.map((pasta: any) => (
                                                        <label key={pasta.id} className="relative flex items-center gap-4 p-4 rounded-xl border-2 border-slate-100 cursor-pointer hover:border-blue-200 transition-all bg-white has-checked:border-blue-500 has-checked:bg-blue-50/30">
                                                            <input
                                                                type="checkbox"
                                                                value={pasta.id}
                                                                {...register('pastaIds')}
                                                                className="w-5 h-5 rounded border-slate-300 text-blue-600 focus:ring-blue-500 shrink-0"
                                                            />
                                                            <div className="flex-1">
                                                                <div className="font-bold text-slate-800">{pasta.nama}</div>
                                                                <div className="text-xs text-slate-500 mt-0.5">
                                                                    {pasta.hari}, {formatTime(pasta.jamMulai)} - {formatTime(pasta.jamSelesai)}
                                                                </div>
                                                            </div>
                                                            <div className="text-right">
                                                                <div className="font-bold text-blue-600">
                                                                    {formatCurrency(pasta.biaya)}
                                                                </div>
                                                                <div className="text-[10px] text-slate-400 font-medium">/bulan</div>
                                                            </div>
                                                        </label>
                                                    ))}
                                                </div>
                                            )}

                                            {(!pastaList || pastaList.length === 0) && !isLoadingPasta && (
                                                <div className="text-center py-8 text-slate-400 italic">
                                                    Belum ada program ekskul yang tersedia.
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                </form>
                            </div>

                            <div className="p-6 border-t border-slate-100 bg-slate-50/50 flex justify-between gap-3 sticky bottom-0 shrink-0">
                                <div className="text-xs text-slate-400 font-medium py-2">
                                    * Wajib diisi
                                </div>
                                <div className="flex gap-3">
                                    <button
                                        onClick={onClose}
                                        type="button"
                                        className="px-5 py-2.5 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-100 hover:text-slate-800 transition-all"
                                    >
                                        Batal
                                    </button>
                                    <button
                                        type="submit"
                                        form="siswa-form"
                                        disabled={isSubmitting}
                                        className="bg-blue-600 text-white px-5 py-2.5 rounded-xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-200 font-bold active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed flex items-center gap-2"
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
                            </div>
                        </motion.div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
