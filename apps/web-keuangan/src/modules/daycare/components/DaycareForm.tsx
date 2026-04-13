import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { createPesertaDaycareSchema } from '@alizzah/validators';
import { useDaycareMutations } from '../hooks/useDaycareMutations';
import { useSiswaList } from '~/modules/siswa/hooks/useSiswaList';
import { useJenjangList } from '~/modules/master/jenjang/hooks/useJenjangList';
import { X, Save, User, Home, Calendar, Info, Coffee } from 'lucide-react';
import { useAtomValue } from 'jotai';
import { tokenAtom } from '~/stores/auth';
import { AnimatePresence, motion } from 'framer-motion';
import { Search } from 'lucide-react';
import { useDebounce } from 'use-debounce';

interface DaycareFormProps {
    isOpen: boolean;
    onClose: () => void;
    initialData?: any;
}

export function DaycareForm({ isOpen, onClose, initialData }: DaycareFormProps) {
    const isEdit = !!initialData;
    const token = useAtomValue(tokenAtom);

    // Mutations
    const { createMutation, updateMutation } = useDaycareMutations(token);

    // Dependencies
    const [selectedSiswa, setSelectedSiswa] = useState<any>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const [debouncedSearch] = useDebounce(searchTerm, 500);

    const { data: searchResults, isLoading: isLoadingSiswa } = useSiswaList({ 
        status: 'AKTIF', 
        search: debouncedSearch,
        limit: 5 
    });
    
    const { data: jenjangList } = useJenjangList(token);

    const {
        register,
        handleSubmit,
        reset,
        watch,
        setValue,
        formState: { errors, isSubmitting }
    } = useForm<any>({
        resolver: zodResolver(createPesertaDaycareSchema),
        defaultValues: {
            tipePeserta: 'INTERNAL',
            modeDaycare: 'RUTIN',
            status: 'AKTIF',
            tanggalMulai: new Date().toISOString().split('T')[0],
            defaultIkutKonsumsi: true, // Set default true as requested/standard
        }
    });

    const tipePeserta = watch('tipePeserta');

    useEffect(() => {
        if (isOpen) {
            if (initialData) {
                reset({
                    ...initialData,
                    tipePeserta: initialData.siswaId ? 'INTERNAL' : 'EKSTERNAL',
                    tanggalMulai: initialData.tanggalMulai ? new Date(initialData.tanggalMulai).toISOString().split('T')[0] : '',
                    tanggalLahir: initialData.tanggalLahir ? new Date(initialData.tanggalLahir).toISOString().split('T')[0] : '',
                    tanggalBerakhir: initialData.tanggalBerakhir ? new Date(initialData.tanggalBerakhir).toISOString().split('T')[0] : '',
                    defaultIkutKonsumsi: initialData.defaultIkutKonsumsi ?? false,
                });
                if (initialData.siswa) {
                    setSelectedSiswa(initialData.siswa);
                }
            } else {
                setSelectedSiswa(null);
                setSearchTerm('');
                reset({
                    tipePeserta: 'INTERNAL',
                    modeDaycare: 'RUTIN',
                    status: 'AKTIF',
                    tanggalMulai: new Date().toISOString().split('T')[0],
                    defaultIkutKonsumsi: true,
                    siswaId: '',
                    namaLengkap: '',
                    namaOrtu: '',
                    noHpOrtu: '',
                });
            }
        }
    }, [isOpen, initialData, reset]);

    const onSubmit = async (data: any) => {
        try {
            if (isEdit && initialData?.id) {
                await updateMutation.mutateAsync({ id: initialData.id, data });
            } else {
                await createMutation.mutateAsync(data);
            }
            onClose();
        } catch (err) { }
    };

    const inputClass = "w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium text-slate-900 placeholder:text-slate-400 disabled:bg-slate-50";
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
                        className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh] relative z-10"
                    >
                        <div className="flex items-center justify-between p-6 border-b border-slate-100 bg-white sticky top-0 z-10">
                            <div>
                                <h2 className="text-xl font-bold text-slate-900">
                                    {isEdit ? 'Edit Peserta Daycare' : 'Registrasi Daycare'}
                                </h2>
                                <p className="text-sm text-slate-500 mt-1">
                                    Daftarkan peserta program daycare Alizzah.
                                </p>
                            </div>
                            <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400">
                                <X size={20} />
                            </button>
                        </div>

                        <div className="p-6 overflow-y-auto grow">
                            <form id="daycare-form" onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                                {/* Tipe Peserta */}
                                {!isEdit && (
                                    <div className="space-y-3">
                                        <label className="text-sm font-semibold text-slate-700">Tipe Peserta</label>
                                        <div className="grid grid-cols-2 gap-3">
                                            <button
                                                type="button"
                                                onClick={() => setValue('tipePeserta', 'INTERNAL')}
                                                className={`flex items-center gap-3 p-4 rounded-xl border-2 transition-all ${tipePeserta === 'INTERNAL' ? 'border-blue-600 bg-blue-50 text-blue-700' : 'border-slate-100 bg-white text-slate-500'}`}
                                            >
                                                <User size={20} />
                                                <span className="font-bold text-sm">Siswa Alizzah</span>
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setValue('tipePeserta', 'EKSTERNAL')}
                                                className={`flex items-center gap-3 p-4 rounded-xl border-2 transition-all ${tipePeserta === 'EKSTERNAL' ? 'border-orange-600 bg-orange-50 text-orange-700' : 'border-slate-100 bg-white text-slate-500'}`}
                                            >
                                                <Home size={20} />
                                                <span className="font-bold text-sm">Anak Luar</span>
                                            </button>
                                        </div>
                                    </div>
                                )}

                                {tipePeserta === 'INTERNAL' ? (
                                    <div className="space-y-4 animate-in slide-in-from-right duration-300">
                                        <div className="space-y-2">
                                            <label className="text-sm font-semibold text-slate-700">Pilih Siswa <span className="text-red-500">*</span></label>
                                            
                                            {selectedSiswa ? (
                                                <div className="flex items-center gap-4 p-4 bg-blue-50 border-2 border-blue-200 rounded-xl">
                                                    <div className="w-10 h-10 bg-blue-600 text-white rounded-lg flex items-center justify-center font-bold">
                                                        {selectedSiswa.namaLengkap.charAt(0)}
                                                    </div>
                                                    <div className="flex-1">
                                                        <div className="font-bold text-slate-900 leading-tight uppercase">{selectedSiswa.namaLengkap}</div>
                                                        <div className="text-[10px] text-slate-500 font-mono tracking-tighter uppercase">
                                                            {selectedSiswa.nis} • {selectedSiswa.rombel?.nama}
                                                        </div>
                                                    </div>
                                                    {!isEdit && (
                                                        <button 
                                                            type="button"
                                                            onClick={() => {
                                                                setSelectedSiswa(null);
                                                                setValue('siswaId', '');
                                                            }}
                                                            className="p-2 hover:bg-blue-100 rounded-lg text-blue-600 transition-colors"
                                                        >
                                                            <X size={18} />
                                                        </button>
                                                    )}
                                                </div>
                                            ) : (
                                                <div className="relative group">
                                                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={20} />
                                                    <input
                                                        type="text"
                                                        placeholder="Ketik nama untuk mencari..."
                                                        className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-bold"
                                                        onChange={(e) => {
                                                            setSearchTerm(e.target.value);
                                                            setIsDropdownOpen(true);
                                                        }}
                                                        onFocus={() => setIsDropdownOpen(true)}
                                                    />
                                                    
                                                    {isDropdownOpen && searchTerm.length > 0 && (
                                                        <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-slate-200 rounded-2xl shadow-2xl z-50 overflow-hidden max-h-60 overflow-y-auto">
                                                            {isLoadingSiswa ? (
                                                                <div className="p-4 text-center text-slate-400 text-sm animate-pulse">Mencari...</div>
                                                            ) : searchResults?.data?.length ? (
                                                                searchResults.data.map((s: any) => (
                                                                    <button
                                                                        key={s.id}
                                                                        type="button"
                                                                        onClick={() => {
                                                                            setSelectedSiswa(s);
                                                                            setValue('siswaId', s.id);
                                                                            setIsDropdownOpen(false);
                                                                            setSearchTerm('');
                                                                        }}
                                                                        className="w-full text-left px-4 py-3 hover:bg-blue-50 transition-colors flex items-center gap-3 border-b border-slate-50 last:border-0"
                                                                    >
                                                                        <div className="w-8 h-8 bg-slate-100 text-slate-500 rounded flex items-center justify-center text-xs font-bold shrink-0">
                                                                            {s.namaLengkap.charAt(0)}
                                                                        </div>
                                                                        <div className="flex-1 min-w-0">
                                                                            <div className="font-bold text-slate-900 text-sm truncate uppercase leading-tight">{s.namaLengkap}</div>
                                                                            <div className="text-[10px] text-slate-500 truncate">{s.rombel.nama}</div>
                                                                        </div>
                                                                    </button>
                                                                ))
                                                            ) : (
                                                                <div className="p-4 text-center text-slate-400 text-sm">Siswa tidak ditemukan</div>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                            
                                            {errors.siswaId && <span className="text-xs text-red-500">{errors.siswaId.message as string}</span>}
                                        </div>
                                    </div>
                                ) : (
                                    <div className="space-y-4 animate-in slide-in-from-left duration-300">
                                        <div className="space-y-2">
                                            <label className="text-sm font-semibold text-slate-700">Nama Lengkap Anak <span className="text-red-500">*</span></label>
                                            <input {...register('namaLengkap')} placeholder="Nama lengkap anak" className={inputClass} />
                                            {errors.namaLengkap && <span className="text-xs text-red-500">{errors.namaLengkap.message as string}</span>}
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <label className="text-sm font-semibold text-slate-700">Jenis Kelamin</label>
                                                <select {...register('jenisKelamin')} className={inputClass}>
                                                    <option value="L">Laki-laki</option>
                                                    <option value="P">Perempuan</option>
                                                </select>
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-sm font-semibold text-slate-700">Tanggal Lahir</label>
                                                <input type="date" {...register('tanggalLahir')} className={inputClass} />
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-sm font-semibold text-slate-700">Nama Orang Tua <span className="text-red-500">*</span></label>
                                            <input {...register('namaOrtu')} placeholder="Nama Wali" className={inputClass} />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-sm font-semibold text-slate-700">No. HP Orang Tua <span className="text-red-500">*</span></label>
                                            <input {...register('noHpOrtu')} placeholder="08xxxxxxxxxx" className={inputClass} />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-sm font-semibold text-slate-700">Jenjang Setara <span className="text-red-500">*</span></label>
                                            <select {...register('jenjangSetaraId')} className={inputClass}>
                                                <option value="">Pilih Jenjang...</option>
                                                {jenjangList?.map((j: any) => (
                                                    <option key={j.id} value={j.id}>{j.nama}</option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>
                                )}

                                <div className="p-4 bg-blue-50 border border-blue-100 rounded-xl flex gap-3">
                                    <Info size={18} className="text-blue-600 shrink-0" />
                                    <p className="text-[11px] text-blue-700">
                                        <strong>INFO BIAYA AWAL:</strong> Setelah disimpan, sistem akan otomatis menerbitkan tagihan <strong>Pendaftaran</strong> dan <strong>Akomodasi</strong> untuk peserta baru.
                                    </p>
                                </div>

                                <div className="grid grid-cols-2 gap-4 border-t border-slate-100 pt-6">
                                    <div className="space-y-2">
                                        <label className="text-sm font-semibold text-slate-700">Mode Paket <span className="text-red-500">*</span></label>
                                        <select {...register('modeDaycare')} className={inputClass}>
                                            <option value="RUTIN">Rutin Bulanan</option>
                                            <option value="HARIAN">Harian Lepas</option>
                                        </select>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-semibold text-slate-700">Status</label>
                                        <select {...register('status')} className={inputClass}>
                                            <option value="AKTIF">Aktif</option>
                                            <option value="NONAKTIF">Nonaktif</option>
                                        </select>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-semibold text-slate-700">Tanggal Mulai <span className="text-red-500">*</span></label>
                                        <div className={iconInputWrapper}>
                                            <Calendar size={16} className="text-slate-400" />
                                            <input type="date" {...register('tanggalMulai')} className="w-full py-2.5 focus:outline-none bg-transparent font-medium" />
                                        </div>
                                    </div>
                                    {isEdit && (
                                        <div className="space-y-2">
                                            <label className="text-sm font-semibold text-slate-700">Tanggal Berakhir</label>
                                            <input type="date" {...register('tanggalBerakhir')} className={inputClass} />
                                        </div>
                                    )}
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm font-semibold text-slate-700">Catatan Khusus</label>
                                    <textarea {...register('catatan')} rows={2} placeholder="Alergi, jadwal jemput, dsb..." className={`${inputClass} resize-none`} />
                                </div>

                                <div className="p-4 bg-orange-50 border border-orange-100 rounded-xl flex items-center justify-between">
                                    <div className="flex gap-3">
                                        <Coffee size={20} className="text-orange-600" />
                                        <div>
                                            <p className="text-sm font-bold text-orange-900">Default Ikut Konsumsi</p>
                                            <p className="text-[10px] text-orange-700">Otomatis pilih konsumsi saat input tagihan harian.</p>
                                        </div>
                                    </div>
                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input type="checkbox" {...register('defaultIkutKonsumsi')} className="sr-only peer" />
                                        <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-orange-600"></div>
                                    </label>
                                </div>
                            </form>
                        </div>

                        <div className="p-6 border-t border-slate-100 bg-slate-50/50 flex justify-end gap-3 sticky bottom-0">
                            <button onClick={onClose} type="button" className="px-5 py-2.5 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-100 transition-all">Batal</button>
                            <button
                                type="submit"
                                form="daycare-form"
                                disabled={isSubmitting}
                                className="bg-blue-600 text-white px-5 py-2.5 rounded-xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-200 font-bold active:scale-95 disabled:opacity-70 flex items-center gap-2"
                            >
                                {isSubmitting ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Save size={18} />}
                                <span>Simpan</span>
                            </button>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}
