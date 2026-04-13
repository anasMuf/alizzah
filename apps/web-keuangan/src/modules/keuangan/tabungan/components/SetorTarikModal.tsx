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
                className="relative bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden"
            >
                <div className={`p-5 ${type === 'setor' ? 'bg-emerald-600' : 'bg-amber-600'} text-white relative overflow-hidden`}>
                    <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 blur-2xl rounded-full -mr-12 -mt-12" />

                    <div className="flex justify-between items-center mb-4 relative z-10">
                        <div className="flex items-center gap-2.5">
                            <div className="p-2 bg-white/20 backdrop-blur-xl rounded-xl border border-white/10">
                                {type === 'setor' ? <ArrowDownCircle size={20} /> : <ArrowUpCircle size={20} />}
                            </div>
                            <h2 className="text-lg font-black tracking-tight uppercase">
                                {type === 'setor' ? 'Setoran' : 'Penarikan'}
                            </h2>
                        </div>
                        <button onClick={onClose} className="p-1.5 hover:bg-white/20 rounded-lg transition-all text-white/70 hover:text-white">
                            <X size={20} />
                        </button>
                    </div>
                    <p className="text-white/60 text-[10px] font-black uppercase tracking-widest relative z-10 leading-none italic">
                        {type === 'setor'
                            ? 'Lakukan penyetoran saldo tabungan.'
                            : 'Penarikan dana (potongan admin berlaku).'}
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="p-5 space-y-5">
                    <div className="space-y-1.5">
                        <div className="flex justify-between items-end mb-1">
                            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1 leading-none">Nominal Transaksi</label>
                            {type === 'tarik' && maxAmount !== undefined && (
                                <span className={`text-[9px] font-black uppercase tracking-tighter italic ${isOverLimit ? 'text-rose-500 underline' : 'text-slate-400 font-mono'}`}>
                                    Saldo: {formatCurrency(maxAmount)}
                                </span>
                            )}
                        </div>
                        <div className="relative group">
                            <span className={`absolute left-4 top-1/2 -translate-y-1/2 font-black transition-colors text-lg font-mono ${isOverLimit ? 'text-rose-500' : 'text-slate-300 group-focus-within:text-emerald-500'
                                }`}>Rp</span>
                            <input
                                type="text"
                                value={nominal}
                                onChange={(e) => setNominal(formatNumber(e.target.value))}
                                required
                                autoFocus
                                className={`w-full pl-12 pr-4 py-3.5 bg-slate-50 border rounded-xl focus:outline-none focus:ring-4 font-black text-xl transition-all placeholder:text-slate-200 font-mono ${isOverLimit
                                    ? 'border-rose-100 text-rose-500 focus:ring-rose-500/10'
                                    : 'border-slate-100 text-slate-900 focus:ring-emerald-500/10'
                                    }`}
                                placeholder="0"
                            />
                        </div>
                    </div>

                    {type === 'tarik' && numNominal > 0 && (
                        <div className={`p-4 rounded-xl border transition-all ${isOverLimit ? 'bg-rose-50 border-rose-100' : 'bg-amber-50 border-amber-100'
                            }`}>
                            <div className="space-y-2">
                                <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest leading-none">
                                    <span className="text-slate-400">Nominal Tarik</span>
                                    <span className="text-slate-900 font-mono">{formatCurrency(numNominal)}</span>
                                </div>
                                <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest leading-none">
                                    <span className="text-slate-400">Potongan Admin (2.5%)</span>
                                    <span className="text-rose-600 font-mono">-{formatCurrency(adminFee)}</span>
                                </div>
                                <div className="h-px bg-slate-200/50 my-1" />
                                <div className="flex justify-between items-center">
                                    <span className="text-xs font-black text-slate-800 uppercase tracking-tight leading-none">Net Diterima</span>
                                    <span className={`text-lg font-black font-mono ${isOverLimit ? 'text-rose-600' : 'text-emerald-600'}`}>
                                        {formatCurrency(netAmount)}
                                    </span>
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="space-y-1.5">
                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1 leading-none">Keterangan (Opsional)</label>
                        <textarea
                            value={keterangan}
                            onChange={(e) => setKeterangan(e.target.value)}
                            className="w-full px-4 py-2.5 bg-slate-50 border border-slate-100 rounded-xl focus:outline-none focus:ring-4 focus:ring-emerald-500/10 font-bold text-xs transition-all placeholder:text-slate-300 min-h-[60px]"
                            rows={2}
                            placeholder="Catatan transaksi..."
                        />
                    </div>

                    <div className="flex gap-2.5 pt-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 py-3 bg-white border border-slate-200 text-slate-500 font-black rounded-xl hover:bg-slate-50 transition-all text-[10px] uppercase tracking-widest active:scale-95 italic"
                        >
                            Batal
                        </button>
                        <button
                            type="submit"
                            disabled={isLoading || numNominal <= 0 || isOverLimit}
                            className={`flex-2 py-3 rounded-xl font-black text-white transition-all text-[10px] uppercase tracking-[0.2em] shadow-lg flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50 disabled:grayscale ${type === 'setor'
                                ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-900/10'
                                : 'bg-amber-600 hover:bg-amber-700 shadow-amber-900/10'
                                }`}
                        >
                            {isLoading ? (
                                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : (
                                type === 'setor' ? 'Konfirmasi Setor' : 'Konfirmasi Tarik'
                            )}
                        </button>
                    </div>
                </form>
            </motion.div>
        </div>,
        document.body
    );
}
