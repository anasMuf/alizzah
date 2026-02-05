import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useAtomValue } from 'jotai';
import { tokenAtom } from '~/stores/auth';
import {
    ArrowLeft,
    CheckCircle2,
    AlertTriangle,
    Calculator,
    Wallet,
    Calendar,
    Save,
    Info
} from 'lucide-react';
import { useState, useMemo } from 'react';
import { formatCurrency } from '@alizzah/shared';
import { useRekonsiliasiData, useKasList } from '~/modules/keuangan/kas/hooks/useKasQueries';
import { useKasMutations } from '~/modules/keuangan/kas/hooks/useKasMutations';
import { z } from 'zod';

const searchSchema = z.object({
    kasId: z.string().optional(),
});

export const Route = createFileRoute('/keuangan/kas/rekonsiliasi')({
    validateSearch: (search) => searchSchema.parse(search),
    component: RekonsiliasiPage,
});

function RekonsiliasiPage() {
    const token = useAtomValue(tokenAtom);
    const { kasId: initialKasId } = Route.useSearch();
    const navigate = useNavigate();

    const [selectedKasId, setSelectedKasId] = useState<string | null>(initialKasId || null);
    const [tanggal, setTanggal] = useState<Date>(new Date());
    const [saldoFisik, setSaldoFisik] = useState<number>(0);
    const [catatan, setCatatan] = useState('');

    const { data: kasList } = useKasList(token);
    const { data: recoData, isLoading: isLoadingData } = useRekonsiliasiData(token, selectedKasId, tanggal);
    const { submitRekonsiliasi } = useKasMutations(token);

    const selisih = useMemo(() => {
        if (!recoData) return 0;
        return saldoFisik - Number(recoData.saldoSistem);
    }, [saldoFisik, recoData]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedKasId) return;

        try {
            await submitRekonsiliasi.mutateAsync({
                kasId: selectedKasId,
                tanggal,
                saldoFisik,
                catatan
            });
            navigate({ to: '/keuangan/kas' });
        } catch (error) {
            // Handled by toast
        }
    };

    return (
        <div className="p-8 max-w-[1000px] mx-auto space-y-8 pb-24 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Back Button & Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => navigate({ to: '/keuangan/kas' })}
                        className="p-3 bg-white border border-slate-200 rounded-2xl hover:bg-slate-50 transition-all shadow-sm group"
                    >
                        <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
                    </button>
                    <div>
                        <h1 className="text-3xl font-black text-slate-900 tracking-tight">Rekonsiliasi Harian</h1>
                        <p className="text-slate-500 font-medium">Lakukan penutupan kas dan pencocokan saldo fisik.</p>
                    </div>
                </div>
                <div className="bg-blue-50 text-blue-700 px-4 py-2 rounded-xl border border-blue-100 flex items-center gap-2 text-xs font-black uppercase tracking-widest">
                    <Info size={16} /> Beta Version
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Left Side: Summary & Data */}
                <div className="space-y-6">
                    <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm space-y-6">
                        <h3 className="text-lg font-bold flex items-center gap-2">
                            <Calculator size={20} className="text-blue-600" /> Parameter Rekonsiliasi
                        </h3>

                        <div className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Pilih Akun Kas</label>
                                <select
                                    value={selectedKasId || ''}
                                    onChange={(e) => setSelectedKasId(e.target.value)}
                                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-4 focus:ring-blue-500/10 font-bold appearance-none"
                                >
                                    <option value="" disabled>Pilih Kas...</option>
                                    {kasList?.map((kas: any) => (
                                        <option key={kas.id} value={kas.id}>{kas.nama} ({kas.tipe})</option>
                                    ))}
                                </select>
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Tanggal Tutup Kas</label>
                                <div className="relative">
                                    <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                    <input
                                        type="date"
                                        value={tanggal.toISOString().split('T')[0]}
                                        onChange={(e) => setTanggal(new Date(e.target.value))}
                                        className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-4 focus:ring-blue-500/10 font-bold"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="bg-slate-900 p-8 rounded-[2.5rem] text-white shadow-2xl space-y-8">
                        <h3 className="text-lg font-bold flex items-center gap-2">
                            <Wallet size={20} className="text-blue-400" /> Ringkasan Saldo Sistem
                        </h3>

                        {isLoadingData ? (
                            <div className="space-y-4 animate-pulse">
                                <div className="h-10 bg-white/5 rounded-xl w-3/4" />
                                <div className="h-20 bg-white/5 rounded-xl w-full" />
                            </div>
                        ) : recoData ? (
                            <div className="space-y-6">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="p-4 bg-white/5 rounded-2xl border border-white/5">
                                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-1">Saldo Awal</p>
                                        <p className="text-lg font-black">{formatCurrency(recoData.saldoAwal)}</p>
                                    </div>
                                    <div className="p-4 bg-white/5 rounded-2xl border border-white/5">
                                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-1">Total Masuk</p>
                                        <p className="text-lg font-black text-emerald-400">{formatCurrency(recoData.totalMasuk)}</p>
                                    </div>
                                    <div className="p-4 bg-white/5 rounded-2xl border border-white/5">
                                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-1">Total Keluar</p>
                                        <p className="text-lg font-black text-rose-400">{formatCurrency(recoData.totalKeluar)}</p>
                                    </div>
                                    <div className="p-4 bg-white/5 rounded-2xl border border-white/5">
                                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-1">Jumlah Transaksi</p>
                                        <p className="text-lg font-black">{recoData.count} Trx</p>
                                    </div>
                                </div>

                                <div className="h-px bg-white/10" />

                                <div className="flex justify-between items-center">
                                    <div>
                                        <p className="text-[10px] text-blue-400 font-bold uppercase tracking-widest mb-1">Ekspektasi Saldo Sistem</p>
                                        <p className="text-4xl font-black">{formatCurrency(recoData.saldoSistem)}</p>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="py-12 text-center text-slate-500 font-medium">Pilih kas untuk melihat data saldo.</div>
                        )}
                    </div>
                </div>

                {/* Right Side: Input Form */}
                <div className="lg:h-fit lg:sticky lg:top-8">
                    <form onSubmit={handleSubmit} className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-xl space-y-8">
                        <div className="space-y-6">
                            <div className="space-y-3">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Input Saldo Fisik (Hasil Hitung)</label>
                                <div className="relative group">
                                    <span className="absolute left-6 top-1/2 -translate-y-1/2 font-black text-slate-300 group-focus-within:text-blue-500 transition-colors text-xl">Rp</span>
                                    <input
                                        type="number"
                                        value={saldoFisik || ''}
                                        onChange={(e) => setSaldoFisik(Number(e.target.value))}
                                        required
                                        className="w-full pl-16 pr-6 py-6 bg-slate-50 border border-slate-100 rounded-3xl focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500/50 font-black text-3xl text-slate-900 transition-all placeholder:text-slate-200"
                                        placeholder="0"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Catatan / Keterangan</label>
                                <textarea
                                    value={catatan}
                                    onChange={(e) => setCatatan(e.target.value)}
                                    className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500/50 font-medium text-sm transition-all"
                                    rows={3}
                                    placeholder="Opsional: Tambahkan catatan jika ada selisih..."
                                />
                            </div>
                        </div>

                        <div className={`p-6 rounded-3xl border transition-all duration-500 ${selisih === 0 ? 'bg-emerald-50 border-emerald-100 text-emerald-900' :
                                selisih > 0 ? 'bg-blue-50 border-blue-100 text-blue-900' :
                                    'bg-rose-50 border-rose-100 text-rose-900'
                            }`}>
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-[10px] font-black uppercase tracking-widest">Analisis Selisih</span>
                                {selisih === 0 ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
                            </div>
                            <p className="text-2xl font-black">{formatCurrency(selisih)}</p>
                            <p className="text-[11px] font-medium mt-1 leading-relaxed">
                                {selisih === 0 ? 'Saldo cocok sempurna dengan sistem. Siap untuk ditutup.' :
                                    selisih > 0 ? 'Terdapat surplus (kelebihan) uang fisik. Sistem akan mencatatkan penyesuaian MASUK.' :
                                        'Terdapat defisit (kekurangan) uang fisik. Sistem akan mencatatkan penyesuaian KELUAR.'}
                            </p>
                        </div>

                        <button
                            type="submit"
                            disabled={!selectedKasId || isLoadingData || submitRekonsiliasi.isPending}
                            className="w-full py-5 bg-blue-600 text-white font-black rounded-3xl hover:bg-blue-700 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-3 shadow-2xl shadow-blue-900/20 disabled:opacity-50 disabled:grayscale group"
                        >
                            {submitRekonsiliasi.isPending ? (
                                <div className="w-6 h-6 border-4 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : (
                                <>
                                    <Save size={20} /> SIMPAN REKONSILIASI
                                </>
                            )}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}
