
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
            jumlahHariEfektif: 20,
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

    const inputClass = "w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium text-slate-900";
    const labelClass = "text-sm font-bold text-slate-700 flex items-center gap-2 mb-2";

    const months = [
        "Januari", "Februari", "Maret", "April", "Mei", "Juni",
        "Juli", "Agustus", "September", "Oktober", "November", "Desember"
    ];

    return (
        <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Header Section */}
            <div className="bg-linear-to-br from-slate-900 to-slate-800 p-8 rounded-[2.5rem] text-white shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 blur-[100px] rounded-full -mr-32 -mt-32" />
                <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="space-y-2">
                        <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/10 backdrop-blur-md rounded-full text-xs font-bold tracking-widest uppercase text-blue-300 border border-white/10">
                            <Zap size={14} className="animate-pulse" /> Automatic Billing Engine
                        </div>
                        <h1 className="text-3xl font-extrabold tracking-tight">Generate Tagihan Bulanan</h1>
                        <p className="text-slate-400 font-medium">Buat invoice otomatis untuk seluruh siswa aktif sesuai jenjang.</p>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Configuration Form */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Periode Info */}
                    <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm space-y-6">
                        <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
                            <Calendar className="text-blue-600" size={24} />
                            <h2 className="text-xl font-bold text-slate-900">Konfigurasi Periode</h2>
                        </div>

                        <div className="grid grid-cols-2 gap-6">
                            <div className="space-y-1">
                                <label className={labelClass}>Bulan Tagihan</label>
                                <select {...register('bulan', { valueAsNumber: true })} className={inputClass}>
                                    {months.map((m, i) => (
                                        <option key={i} value={i + 1}>{m}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="space-y-1">
                                <label className={labelClass}>Tahun</label>
                                <input {...register('tahun', { valueAsNumber: true })} type="number" className={inputClass} />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-6 pt-4">
                            <div className="space-y-1">
                                <label className={labelClass}>
                                    Hari Efektif
                                    <Info size={14} className="text-slate-400" />
                                </label>
                                <input {...register('jumlahHariEfektif', { valueAsNumber: true })} type="number" className={inputClass} placeholder="20" />
                            </div>
                            <div className="space-y-1">
                                <label className={labelClass}>
                                    Jumlah Senin
                                    <Info size={14} className="text-slate-400" />
                                </label>
                                <input {...register('jumlahSenin', { valueAsNumber: true })} type="number" className={inputClass} placeholder="4" />
                            </div>
                        </div>
                    </div>

                    <div className="bg-blue-50/50 p-6 rounded-3xl border border-blue-100 flex gap-4">
                        <AlertTriangle className="text-blue-600 shrink-0" size={24} />
                        <div>
                            <p className="text-sm font-bold text-blue-900 italic">Penting!</p>
                            <p className="text-xs text-blue-700 leading-relaxed mt-1">
                                Sistem akan otomatis mendeteksi komponen wajib (SPP, Infaq, Calisan, Tabungan) sesuai jenjang masing-masing siswa (KB, TK-A, TK-B).
                            </p>
                        </div>
                    </div>
                </div>

                {/* Status & Action */}
                <div className="space-y-6">
                    <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm space-y-6 flex flex-col items-center text-center">
                        <div className="p-4 bg-blue-50 text-blue-600 rounded-3xl">
                            <Users size={40} />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-slate-900">Siap Proses</h3>
                            <p className="text-sm text-slate-400 font-medium">Periode: {months[formValues.bulan - 1]} {formValues.tahun}</p>
                        </div>

                        {!isConfirming ? (
                            <button
                                onClick={() => setIsConfirming(true)}
                                className="w-full py-4 bg-blue-600 text-white font-bold rounded-2xl hover:bg-blue-700 transition-all shadow-xl shadow-blue-100 flex items-center justify-center gap-2 active:scale-95"
                            >
                                <Zap size={20} />
                                <span>Mulai Generate</span>
                            </button>
                        ) : (
                            <div className="w-full space-y-3">
                                <p className="text-xs font-bold text-rose-500 uppercase tracking-wider italic">Konfirmasi Akhir?</p>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => setIsConfirming(false)}
                                        className="flex-1 py-3 border border-slate-200 text-slate-600 font-bold rounded-xl hover:bg-slate-50 transition-all"
                                    >
                                        Batal
                                    </button>
                                    <button
                                        onClick={handleSubmit(onSubmit)}
                                        disabled={generateMutation.isPending}
                                        className="flex-2 py-3 bg-slate-900 text-white font-bold rounded-xl hover:bg-slate-800 transition-all flex items-center justify-center gap-2"
                                    >
                                        {generateMutation.isPending ? <Loader2 className="animate-spin" size={18} /> : <span>Ya, Lanjut</span>}
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>

                    {lastPeriode ? (
                        <div className="w-full p-8 bg-emerald-50 rounded-[2.5rem] border border-emerald-100 flex flex-col items-center text-center space-y-4 animate-in zoom-in-95 duration-500 shadow-sm transition-all">
                            <div className="p-3 bg-white rounded-2xl text-emerald-600 shadow-sm border border-emerald-50">
                                <CheckCircle size={28} />
                            </div>
                            <div>
                                <h4 className="text-sm font-bold text-emerald-900 leading-tight">Berhasil Generate!</h4>
                                <p className="text-[10px] text-emerald-600 font-medium italic mt-1 leading-tight">
                                    Tagihan periode {months[parseInt(lastPeriode.split('-')[1]) - 1]} {lastPeriode.split('-')[0]} telah siap.
                                </p>
                            </div>
                            <button
                                onClick={() => onViewDetail?.(lastPeriode)}
                                className="w-full py-3 bg-emerald-600 text-white text-xs font-bold rounded-xl hover:bg-emerald-700 transition-all active:scale-95 shadow-lg shadow-emerald-200 flex items-center justify-center gap-2"
                            >
                                <ArrowRight size={16} /> Lihat Detail Tagihan
                            </button>
                            <button
                                onClick={() => setLastPeriode(null)}
                                className="text-[10px] font-bold text-emerald-400 hover:text-emerald-600 uppercase tracking-widest transition-colors"
                            >
                                Tutup
                            </button>
                        </div>
                    ) : (
                        <button
                            onClick={onViewHistory}
                            className="w-full p-8 bg-indigo-50/50 rounded-[2.5rem] border border-indigo-100 flex flex-col items-center text-center space-y-3 group hover:bg-indigo-600 hover:border-indigo-600 transition-all active:scale-95 shadow-sm"
                        >
                            <div className="p-3 bg-white rounded-2xl text-indigo-600 group-hover:scale-110 transition-transform">
                                <Calendar size={24} />
                            </div>
                            <div>
                                <p className="text-xs font-bold text-indigo-900 group-hover:text-white uppercase tracking-widest">Lihat Riwayat</p>
                                <p className="text-[10px] text-indigo-400 group-hover:text-indigo-200 font-medium italic mt-1 leading-tight">Cek hasil generate sebelumnya di sini.</p>
                            </div>
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
