import { useState, type FormEvent } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';
import { X, ArrowDownCircle, ArrowUpCircle } from 'lucide-react';
import { formatCurrency, parseCurrency, formatNumber } from '@alizzah/shared';

interface SetorTarikModalProps {
    type: 'setor' | 'tarik';
    siswaId: string;
    maxAmount?: number;
    onClose: () => void;
    onSubmit: (data: any) => void;
    isLoading: boolean;
}

export function SetorTarikModal({ type, siswaId, maxAmount, onClose, onSubmit, isLoading }: SetorTarikModalProps) {
    const [nominal, setNominal] = useState('');
    const [keterangan, setKeterangan] = useState('');

    const handleSubmit = (e: FormEvent) => {
        e.preventDefault();
        const numNominal = parseCurrency(nominal);
        if (numNominal <= 0) return;

        onSubmit({
            siswaId,
            nominal: numNominal,
            keterangan: keterangan || undefined,
            ...(type === 'setor' ? { jenis: 'UMUM' } : {})
        });
    };

    const numNominal = parseCurrency(nominal);
    const adminFee = type === 'tarik' ? numNominal * 0.025 : 0;
    const netAmount = type === 'tarik' ? numNominal - adminFee : numNominal;
    const isOverLimit = type === 'tarik' && maxAmount !== undefined && numNominal > maxAmount;

    return createPortal(
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4">
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={onClose}
                className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                className="relative bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl overflow-hidden"
            >
                <div className={`p-8 ${type === 'setor' ? 'bg-emerald-600' : 'bg-amber-600'} text-white relative overflow-hidden`}>
                    <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 blur-3xl rounded-full -mr-12 -mt-12" />

                    <div className="flex justify-between items-center mb-6 relative z-10">
                        <div className="flex items-center gap-3">
                            <div className="p-3 bg-white/20 backdrop-blur-xl rounded-2xl border border-white/20">
                                {type === 'setor' ? <ArrowDownCircle size={24} /> : <ArrowUpCircle size={24} />}
                            </div>
                            <h2 className="text-2xl font-black tracking-tight">
                                {type === 'setor' ? 'Setoran Tabungan' : 'Penarikan Dana'}
                            </h2>
                        </div>
                        <button onClick={onClose} className="p-2 hover:bg-white/20 rounded-xl transition-all">
                            <X size={24} />
                        </button>
                    </div>
                    <p className="text-white/70 text-sm font-medium relative z-10">
                        {type === 'setor'
                            ? 'Lakukan penyetoran saldo ke rekening tabungan siswa.'
                            : 'Lakukan penarikan saldo tabungan (potongan admin berlaku).'}
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="p-8 space-y-6">
                    <div className="space-y-2">
                        <div className="flex justify-between items-end mb-1">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nominal Transaksi</label>
                            {type === 'tarik' && maxAmount !== undefined && (
                                <span className={`text-[10px] font-bold uppercase tracking-tight ${isOverLimit ? 'text-rose-500' : 'text-slate-400'}`}>
                                    Saldo: {formatCurrency(maxAmount)}
                                </span>
                            )}
                        </div>
                        <div className="relative group">
                            <span className={`absolute left-6 top-1/2 -translate-y-1/2 font-black transition-colors text-xl ${isOverLimit ? 'text-rose-500' : 'text-slate-300 group-focus-within:text-emerald-500'
                                }`}>Rp</span>
                            <input
                                type="text"
                                value={nominal}
                                onChange={(e) => setNominal(formatNumber(e.target.value))}
                                required
                                autoFocus
                                className={`w-full pl-16 pr-6 py-5 bg-slate-50 border rounded-3xl focus:outline-none focus:ring-4 font-black text-2xl transition-all placeholder:text-slate-200 ${isOverLimit
                                    ? 'border-rose-100 text-rose-500 focus:ring-rose-500/10'
                                    : 'border-slate-100 text-slate-900 focus:ring-emerald-500/10'
                                    }`}
                                placeholder="0"
                            />
                        </div>
                    </div>

                    {type === 'tarik' && numNominal > 0 && (
                        <div className={`p-5 rounded-2xl border transition-all ${isOverLimit ? 'bg-rose-50 border-rose-100' : 'bg-amber-50 border-amber-100'
                            }`}>
                            <div className="space-y-3">
                                <div className="flex justify-between items-center text-xs font-bold">
                                    <span className="text-slate-500 uppercase tracking-widest text-[10px]">Nominal Tarik</span>
                                    <span className="text-slate-900">{formatCurrency(numNominal)}</span>
                                </div>
                                <div className="flex justify-between items-center text-xs font-bold">
                                    <span className="text-slate-500 uppercase tracking-widest text-[10px]">Potongan Admin (2.5%)</span>
                                    <span className="text-rose-600">-{formatCurrency(adminFee)}</span>
                                </div>
                                <div className="h-px bg-slate-200/50 my-2" />
                                <div className="flex justify-between items-center">
                                    <span className="text-sm font-black text-slate-800 uppercase tracking-tight">Net Diterima</span>
                                    <span className={`text-xl font-black ${isOverLimit ? 'text-rose-600' : 'text-emerald-600'}`}>
                                        {formatCurrency(netAmount)}
                                    </span>
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Keterangan (Opsional)</label>
                        <textarea
                            value={keterangan}
                            onChange={(e) => setKeterangan(e.target.value)}
                            className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:outline-none focus:ring-4 focus:ring-emerald-500/10 font-medium text-sm transition-all"
                            rows={2}
                            placeholder="Tulis catatan transaksi jika diperlukan..."
                        />
                    </div>

                    <div className="flex gap-3 pt-4">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 py-4 bg-white border border-slate-200 text-slate-500 font-bold rounded-2xl hover:bg-slate-50 transition-all text-xs uppercase tracking-widest active:scale-95"
                        >
                            Batal
                        </button>
                        <button
                            type="submit"
                            disabled={isLoading || numNominal <= 0 || isOverLimit}
                            className={`flex-2 py-4 rounded-2xl font-black text-white transition-all text-xs uppercase tracking-widest shadow-xl flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50 disabled:grayscale ${type === 'setor'
                                ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-900/10'
                                : 'bg-amber-600 hover:bg-amber-700 shadow-amber-900/10'
                                }`}
                        >
                            {isLoading ? (
                                <div className="w-5 h-5 border-3 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : (
                                type === 'setor' ? 'Konfirmasi Setoran' : 'Konfirmasi Penarikan'
                            )}
                        </button>
                    </div>
                </form>
            </motion.div>
        </div>,
        document.body
    );
}
