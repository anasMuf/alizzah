import { useState, useMemo } from 'react';
import { useAtomValue } from 'jotai';
import { tokenAtom } from '~/stores/auth';
import { X, Save, ArrowDownLeft, ArrowUpRight, ArrowRightLeft, Info } from 'lucide-react';
import { motion } from 'framer-motion';
import { useKasMutations } from '../hooks/useKasMutations';
import { useKasList, usePosPengeluaranList } from '../hooks/useKasQueries';
import { useJenisPembayaranList } from '../../pembayaran/hooks/useJenisPembayaranList';

interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    defaultKasId?: string;
}

export function TransactionModal({ isOpen, onClose, type, defaultKasId }: ModalProps & { type: 'MASUK' | 'KELUAR' }) {
    const token = useAtomValue(tokenAtom);
    const [kasId, setKasId] = useState(defaultKasId || '');
    const [nominal, setNominal] = useState(0);
    const [keterangan, setKeterangan] = useState('');
    const [posPengeluaranId, setPosPengeluaranId] = useState('');
    const [sumberDanaId, setSumberDanaId] = useState('');

    const { data: kasList } = useKasList(token);
    const { data: posList } = usePosPengeluaranList(token);
    const { data: danaList } = useJenisPembayaranList(token);
    const { kasirMasuk, kasirKeluar } = useKasMutations(token);

    // Find selected POS details
    const selectedPos = useMemo(() => {
        if (type !== 'KELUAR' || !posPengeluaranId) return null;
        return posList?.find((p: any) => p.id === posPengeluaranId);
    }, [posPengeluaranId, posList, type]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (type === 'MASUK') {
                await kasirMasuk.mutateAsync({ kasId, nominal, sumberDanaId, keterangan });
            } else {
                await kasirKeluar.mutateAsync({ kasId, nominal, posPengeluaranId, keterangan });
            }
            onClose();
        } catch (error) { }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-100 flex items-center justify-center p-4">
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
                className="relative bg-white w-full max-w-xl rounded-2xl shadow-2xl overflow-hidden"
            >
                <div className={`p-5 ${type === 'MASUK' ? 'bg-emerald-600' : 'bg-rose-600'} text-white relative overflow-hidden`}>
                    <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 blur-3xl rounded-full -mr-12 -mt-12" />
                    <div className="flex justify-between items-center mb-5 relative z-10">
                        <div className="flex items-center gap-2.5">
                            <div className="p-2 bg-white/20 backdrop-blur-xl rounded-xl border border-white/20">
                                {type === 'MASUK' ? <ArrowDownLeft size={20} /> : <ArrowUpRight size={20} />}
                            </div>
                            <h2 className="text-lg font-black tracking-tight uppercase leading-none">
                                Catat {type === 'MASUK' ? 'Masuk' : 'Keluar'}
                            </h2>
                        </div>
                        <button onClick={onClose} className="p-1.5 hover:bg-white/20 rounded-lg transition-all text-white/70 hover:text-white active:scale-95">
                            <X size={20} />
                        </button>
                    </div>
                    <p className="text-white/60 text-[10px] font-black uppercase tracking-widest relative z-10 leading-none italic">
                        Input detail transaksi pencatatan jurnal kas otomatis.
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="p-5 space-y-5">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1 leading-none">Akun Kas</label>
                            <select
                                value={kasId}
                                onChange={(e) => setKasId(e.target.value)}
                                required
                                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-blue-500/10 font-black text-[10px] uppercase tracking-widest text-slate-700 appearance-none cursor-pointer"
                            >
                                <option value="">Pilih Kas...</option>
                                {kasList?.map((k: any) => <option key={k.id} value={k.id}>{k.nama}</option>)}
                            </select>
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1 leading-none">
                                {type === 'MASUK' ? 'Sumber Dana' : 'Pos Pengeluaran'}
                            </label>
                            <select
                                value={type === 'MASUK' ? sumberDanaId : posPengeluaranId}
                                onChange={(e) => type === 'MASUK' ? setSumberDanaId(e.target.value) : setPosPengeluaranId(e.target.value)}
                                required
                                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-blue-500/10 font-black text-[10px] uppercase tracking-widest text-slate-700 appearance-none cursor-pointer"
                            >
                                <option value="">Pilih {type === 'MASUK' ? 'Sumber...' : 'Pos...'}</option>
                                {type === 'MASUK'
                                    ? danaList?.map((d: any) => <option key={d.id} value={d.id}>{d.nama}</option>)
                                    : posList?.map((p: any) => <option key={p.id} value={p.id}>{p.nama}</option>)
                                }
                            </select>
                            {type === 'KELUAR' && selectedPos?.prioritasSumberDana && (
                                <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-blue-50 text-blue-700 rounded-lg border border-blue-100 animate-in fade-in slide-in-from-top-1">
                                    <Info size={11} className="shrink-0" />
                                    <span className="text-[8px] font-black uppercase tracking-tight">
                                        Dana: {selectedPos.prioritasSumberDana.nama}
                                    </span>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1 leading-none">Nominal Transaksi</label>
                        <div className="relative group">
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 font-black text-slate-300 group-focus-within:text-blue-500 transition-colors text-xl font-mono leading-none">Rp</span>
                            <input
                                type="number"
                                value={nominal || ''}
                                onChange={(e) => setNominal(Number(e.target.value))}
                                required
                                className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-100 rounded-xl focus:outline-none focus:ring-4 focus:ring-blue-500/10 font-black text-xl text-slate-900 transition-all placeholder:text-slate-200 font-mono"
                                placeholder="0"
                            />
                        </div>
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1 leading-none">Keterangan Tambahan</label>
                        <textarea
                            value={keterangan}
                            onChange={(e) => setKeterangan(e.target.value)}
                            required
                            className="w-full px-4 py-2.5 bg-slate-50 border border-slate-100 rounded-xl focus:outline-none focus:ring-4 focus:ring-blue-500/10 font-bold text-xs transition-all placeholder:text-slate-300 min-h-[60px]"
                            rows={2}
                            placeholder="Catatan transaksi..."
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={kasirMasuk.isPending || kasirKeluar.isPending}
                        className={`w-full py-4 ${type === 'MASUK' ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-900/10' : 'bg-rose-600 hover:bg-rose-700 shadow-rose-900/10'} text-white font-black rounded-xl hover:scale-[1.01] active:scale-95 transition-all flex items-center justify-center gap-2 shadow-lg disabled:opacity-50 text-[10px] uppercase tracking-[0.2em]`}
                    >
                        {kasirMasuk.isPending || kasirKeluar.isPending ? <div className="w-5 h-5 border-3 border-white/30 border-t-white rounded-full animate-spin" /> : <><Save size={16} /> SIMPAN TRANSAKSI</>}
                    </button>
                </form>
            </motion.div>
        </div>
    );
}

export function TransferModal({ isOpen, onClose }: ModalProps) {
    const token = useAtomValue(tokenAtom);
    const [dariKasId, setDariKasId] = useState('');
    const [keKasId, setKeKasId] = useState('');
    const [nominal, setNominal] = useState(0);
    const [keterangan, setKeterangan] = useState('');

    const { data: kasList } = useKasList(token);
    const { transferKas } = useKasMutations(token);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await transferKas.mutateAsync({ dariKasId, keKasId, nominal, keterangan });
            onClose();
        } catch (error) { }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-100 flex items-center justify-center p-4">
            <motion.div
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                onClick={onClose}
                className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                className="relative bg-white w-full max-w-xl rounded-2xl shadow-2xl overflow-hidden"
            >
                <div className="p-5 bg-blue-600 text-white relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 blur-3xl rounded-full -mr-12 -mt-12" />
                    <div className="flex justify-between items-center mb-5 relative z-10">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-white/20 backdrop-blur-xl rounded-xl border border-white/20">
                                <ArrowRightLeft size={20} />
                            </div>
                            <h2 className="text-lg font-black tracking-tight uppercase leading-none">Mutasi Antar Kas</h2>
                        </div>
                        <button onClick={onClose} className="p-1.5 hover:bg-white/20 rounded-lg transition-all text-white/70 hover:text-white active:scale-95">
                            <X size={20} />
                        </button>
                    </div>
                    <p className="text-white/60 text-[10px] font-black uppercase tracking-widest relative z-10 leading-none italic">
                        Lakukan perpindahan dana antar rekening kas atau brankas.
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="p-5 space-y-5">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1 leading-none">Dari Kas (Sumber)</label>
                            <select
                                value={dariKasId} onChange={(e) => setDariKasId(e.target.value)} required
                                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-blue-500/10 font-black text-[10px] uppercase tracking-widest text-slate-700 appearance-none cursor-pointer"
                            >
                                <option value="">Pilih Kas...</option>
                                {kasList?.map((k: any) => <option key={k.id} value={k.id}>{k.nama}</option>)}
                            </select>
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1 leading-none">Ke Kas (Tujuan)</label>
                            <select
                                value={keKasId} onChange={(e) => setKeKasId(e.target.value)} required
                                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-blue-500/10 font-black text-[10px] uppercase tracking-widest text-slate-700 appearance-none cursor-pointer"
                            >
                                <option value="">Pilih Kas...</option>
                                {kasList?.filter((k: any) => k.id !== dariKasId).map((k: any) => <option key={k.id} value={k.id}>{k.nama}</option>)}
                            </select>
                        </div>
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1 leading-none">Nominal Transfer</label>
                        <div className="relative group">
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 font-black text-slate-300 group-focus-within:text-blue-500 transition-colors text-xl font-mono leading-none">Rp</span>
                            <input
                                type="number" value={nominal || ''} onChange={(e) => setNominal(Number(e.target.value))} required
                                className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-100 rounded-xl focus:outline-none focus:ring-4 focus:ring-blue-500/10 font-black text-xl text-slate-900 transition-all placeholder:text-slate-200 font-mono"
                                placeholder="0"
                            />
                        </div>
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1 leading-none">Keterangan</label>
                        <textarea
                            value={keterangan} onChange={(e) => setKeterangan(e.target.value)}
                            className="w-full px-4 py-2.5 bg-slate-50 border border-slate-100 rounded-xl focus:outline-none focus:ring-4 focus:ring-blue-500/10 font-bold text-xs transition-all placeholder:text-slate-300 min-h-[60px]"
                            rows={2} placeholder="Catatan mutasi..."
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={transferKas.isPending}
                        className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white font-black rounded-xl hover:scale-[1.01] active:scale-95 transition-all flex items-center justify-center gap-2 shadow-xl shadow-blue-900/40 disabled:opacity-50 text-[10px] uppercase tracking-[0.2em]"
                    >
                        {transferKas.isPending ? <div className="w-5 h-5 border-3 border-white/30 border-t-white rounded-full animate-spin" /> : <><ArrowRightLeft size={16} /> PROSES MUTASI</>}
                    </button>
                </form>
            </motion.div>
        </div>
    );
}
