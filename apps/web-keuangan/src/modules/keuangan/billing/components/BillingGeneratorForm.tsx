
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { generateTagihanSchema } from '@alizzah/validators';
import { useBillingMutations } from '../hooks/useBillingMutations';
import { useAtomValue } from 'jotai';
import { tokenAtom } from '~/stores/auth';
import {
    Zap,
    Calendar,
    Users,
    AlertTriangle,
    Loader2,
    Info,
    CheckCircle,
    ArrowRight
} from 'lucide-react';

export function BillingGeneratorForm({
    onViewHistory,
    onViewDetail,
    onSuccess
}: {
    onViewHistory?: () => void;
    onViewDetail?: (periode: string) => void;
    onSuccess?: (periode: string) => void;
}) {
    const token = useAtomValue(tokenAtom);
    const { generateMutation } = useBillingMutations(token);

    const [isConfirming, setIsConfirming] = useState(false);
    const [lastPeriode, setLastPeriode] = useState<string | null>(null);

    const {
        register,
        handleSubmit,
        watch,
    } = useForm<any>({
        resolver: zodResolver(generateTagihanSchema) as any,
        defaultValues: {
            bulan: new Date().getMonth() + 1,
            tahun: new Date().getFullYear(),
            hariEfektifMutiara13: 20,
            hariEfektifMutiara46: 20,
            hariEfektifIntan18: 20,
            hariEfektifBerlian18: 20,
            jumlahSenin: 4,
            jenisPembayaranIds: []
        }
    });

    const formValues = watch();

    const onSubmit = async (data: any) => {
        try {
            const periode = `${data.tahun}-${data.bulan.toString().padStart(2, '0')}`;
            // Unified automatic mode: backend pulls all WAJIB items
            await generateMutation.mutateAsync({ ...data, jenisPembayaranIds: [] });
            setLastPeriode(periode);
            onSuccess?.(periode);
            setIsConfirming(false);
        } catch (error) {
            // Error handled by mutation
        }
    };

    const inputClass = "w-full px-3 py-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all font-black text-xs text-slate-900 placeholder:italic";

    const months = [
        "Januari", "Februari", "Maret", "April", "Mei", "Juni",
        "Juli", "Agustus", "September", "Oktober", "November", "Desember"
    ];

    return (
        <div className="max-w-4xl mx-auto space-y-3 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Header Section */}
            <div className="bg-linear-to-br from-slate-900 to-slate-800 p-4 rounded-xl text-white shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 blur-[100px] rounded-full -mr-32 -mt-32" />
                <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="space-y-1">
                        <div className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-white/10 backdrop-blur-md rounded-full text-[8px] font-black tracking-widest uppercase text-blue-300 border border-white/10">
                            <Zap size={10} className="animate-pulse" /> AUTOMATIC BILLING ENGINE
                        </div>
                        <h1 className="text-lg font-black uppercase tracking-tight italic">Generate Tagihan Bulanan</h1>
                        <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest italic leading-none">Buat invoice otomatis untuk seluruh siswa aktif sesuai jenjang.</p>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
                {/* Configuration Form */}
                <div className="lg:col-span-2 space-y-3">
                    {/* Periode Info */}
                    <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm space-y-4">
                        <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                            <Calendar className="text-blue-600" size={16} />
                            <h2 className="text-base font-black text-slate-900 uppercase tracking-tight italic">Konfigurasi Periode</h2>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div className="space-y-1">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5 italic">BULAN TAGIHAN</label>
                                <select {...register('bulan', { valueAsNumber: true })} className={`${inputClass}`}>
                                    {months.map((m, i) => (
                                        <option key={i} value={i + 1}>{m.toUpperCase()}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5 italic">TAHUN</label>
                                <input {...register('tahun', { valueAsNumber: true })} type="number" className={`${inputClass}`} />
                            </div>
                        </div>

                        <div className="pt-2 border-t border-slate-100">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5 italic mb-2">
                                JUMLAH HARI EFEKTIF PER ROMBEL
                                <Info size={10} className="text-slate-300" />
                            </label>
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                <div className="space-y-1">
                                    <label className="text-[8px] font-black text-slate-500 uppercase tracking-widest italic">MUTIARA 1-3</label>
                                    <input {...register('hariEfektifMutiara13', { valueAsNumber: true })} type="number" className={`${inputClass}`} />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[8px] font-black text-slate-500 uppercase tracking-widest italic">MUTIARA 4-6</label>
                                    <input {...register('hariEfektifMutiara46', { valueAsNumber: true })} type="number" className={`${inputClass}`} />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[8px] font-black text-slate-500 uppercase tracking-widest italic">INTAN 1-8</label>
                                    <input {...register('hariEfektifIntan18', { valueAsNumber: true })} type="number" className={`${inputClass}`} />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[8px] font-black text-slate-500 uppercase tracking-widest italic">BERLIAN 1-8</label>
                                    <input {...register('hariEfektifBerlian18', { valueAsNumber: true })} type="number" className={`${inputClass}`} />
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 gap-3 pt-1 mt-2">
                            <div className="space-y-1">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5 italic">
                                    JUMLAH SENIN (TK-B / BERLIAN)
                                    <Info size={10} className="text-slate-300" />
                                </label>
                                <input {...register('jumlahSenin', { valueAsNumber: true })} type="number" className={`${inputClass} sm:max-w-[200px]`} placeholder="4" />
                            </div>
                        </div>
                    </div>

                    <div className="bg-blue-50/50 p-3 rounded-lg border border-blue-100 flex gap-2.5">
                        <AlertTriangle className="text-blue-600 shrink-0" size={16} />
                        <div>
                            <p className="text-[10px] font-black text-blue-900 uppercase tracking-widest italic leading-none">PENTING!</p>
                            <p className="text-[9px] text-blue-700 font-bold uppercase tracking-tight leading-relaxed mt-1 italic">
                                Sistem akan otomatis mendeteksi komponen wajib (SPP, Infaq, Calisan, Tabungan) sesuai jenjang masing-masing siswa (KB, TK-A, TK-B).
                            </p>
                        </div>
                    </div>
                </div>

                {/* Status & Action */}
                <div className="space-y-3">
                    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-4 flex flex-col items-center text-center">
                        <div className="p-2.5 bg-blue-50 text-blue-600 rounded-lg">
                            <Users size={24} />
                        </div>
                        <div>
                            <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight italic">Siap Proses</h3>
                            <p className="text-[9px] text-slate-400 font-black uppercase tracking-widest italic mt-0.5">PERIODE: {months[formValues.bulan - 1].toUpperCase()} {formValues.tahun}</p>
                        </div>

                        {!isConfirming ? (
                            <button
                                onClick={() => setIsConfirming(true)}
                                className="w-full py-2 bg-blue-600 text-white font-black rounded hover:bg-black transition-all shadow-lg shadow-blue-100 flex items-center justify-center gap-2 active:scale-95 text-[10px] uppercase tracking-widest italic"
                            >
                                <Zap size={14} />
                                <span>MULAI GENERATE</span>
                            </button>
                        ) : (
                            <div className="w-full space-y-2">
                                <p className="text-[9px] font-black text-rose-500 uppercase tracking-widest italic">KONFIRMASI AKHIR?</p>
                                <div className="flex gap-1.5">
                                    <button
                                        onClick={() => setIsConfirming(false)}
                                        className="flex-1 py-1.5 text-[9px] border border-slate-200 text-slate-400 font-black rounded hover:bg-slate-50 transition-all uppercase tracking-widest"
                                    >
                                        BATAL
                                    </button>
                                    <button
                                        onClick={handleSubmit(onSubmit)}
                                        disabled={generateMutation.isPending}
                                        className="flex-2 py-1.5 text-[9px] bg-slate-900 text-white font-black rounded hover:bg-black transition-all flex items-center justify-center gap-2 uppercase tracking-widest"
                                    >
                                        {generateMutation.isPending ? <Loader2 className="animate-spin" size={12} /> : <span>YA, LANJUT</span>}
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>

                    {lastPeriode ? (
                        <div className="w-full p-4 bg-emerald-50 rounded-xl border border-emerald-100 flex flex-col items-center text-center space-y-3 animate-in zoom-in-95 duration-500 shadow-sm transition-all">
                            <div className="p-2 bg-white rounded-lg text-emerald-600 shadow-sm border border-emerald-50">
                                <CheckCircle size={20} />
                            </div>
                            <div>
                                <h4 className="text-xs font-black text-emerald-900 leading-tight uppercase tracking-tight italic">Berhasil!</h4>
                                <p className="text-[9px] text-emerald-600 font-black uppercase tracking-widest italic mt-0.5 leading-tight">
                                    Tagihan periode {months[parseInt(lastPeriode.split('-')[1]) - 1].toUpperCase()} {lastPeriode.split('-')[0]} telah siap.
                                </p>
                            </div>
                            <button
                                onClick={() => onViewDetail?.(lastPeriode)}
                                className="w-full py-2 bg-emerald-600 text-white text-[9px] font-black rounded hover:bg-black transition-all active:scale-95 shadow-lg shadow-emerald-200 flex items-center justify-center gap-2 uppercase tracking-widest italic"
                            >
                                <ArrowRight size={14} /> DETAIL TAGIHAN
                            </button>
                            <button
                                onClick={() => setLastPeriode(null)}
                                className="text-[8px] font-black text-emerald-400 hover:text-emerald-700 uppercase tracking-widest transition-colors"
                            >
                                TUTUP
                            </button>
                        </div>
                    ) : (
                        <button
                            onClick={onViewHistory}
                            className="w-full p-4 bg-indigo-50/50 rounded-xl border border-indigo-100 flex flex-col items-center text-center space-y-2 group hover:bg-indigo-600 hover:border-indigo-600 transition-all active:scale-95 shadow-sm"
                        >
                            <div className="p-2 bg-white rounded-lg text-indigo-600 group-hover:scale-110 transition-transform shadow-sm">
                                <Calendar size={16} />
                            </div>
                            <div>
                                <p className="text-[9px] font-black text-indigo-900 group-hover:text-white uppercase tracking-widest italic leading-none">LIHAT RIWAYAT</p>
                                <p className="text-[8px] text-indigo-400 group-hover:text-indigo-100 font-bold uppercase tracking-tight italic mt-1 leading-tight">Cek hasil generate sebelumnya di sini.</p>
                            </div>
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
