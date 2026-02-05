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
                className="relative bg-white w-full max-w-xl rounded-[2.5rem] shadow-2xl overflow-hidden"
            >
                <div className={`p-8 ${type === 'MASUK' ? 'bg-emerald-600' : 'bg-rose-600'} text-white`}>
                    <div className="flex justify-between items-center mb-6">
                        <div className="flex items-center gap-3">
                            <div className="p-3 bg-white/20 backdrop-blur-xl rounded-2xl border border-white/20">
                                {type === 'MASUK' ? <ArrowDownLeft size={24} /> : <ArrowUpRight size={24} />}
                            </div>
                            <h2 className="text-2xl font-black tracking-tight">Catat {type === 'MASUK' ? 'Uang Masuk' : 'Uang Keluar'}</h2>
                        </div>
                        <button onClick={onClose} className="p-2 hover:bg-white/20 rounded-xl transition-all">
                            <X size={24} />
                        </button>
                    </div>
                    <p className="text-white/70 text-sm font-medium">Input detail transaksi berikut untuk pencatatan jurnal kas otomatis.</p>
                </div>

                <form onSubmit={handleSubmit} className="p-8 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Akun Kas</label>
                            <select
                                value={kasId}
                                onChange={(e) => setKasId(e.target.value)}
                                required
                                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-4 focus:ring-blue-500/10 font-bold"
                            >
                                <option value="">Pilih Kas...</option>
                                {kasList?.map((k: any) => <option key={k.id} value={k.id}>{k.nama}</option>)}
                            </select>
                        </div>

                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                                {type === 'MASUK' ? 'Sumber Dana' : 'Pos Pengeluaran'}
                            </label>
                            <select
                                value={type === 'MASUK' ? sumberDanaId : posPengeluaranId}
                                onChange={(e) => type === 'MASUK' ? setSumberDanaId(e.target.value) : setPosPengeluaranId(e.target.value)}
                                required
                                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-4 focus:ring-blue-500/10 font-bold"
                            >
                                <option value="">Pilih {type === 'MASUK' ? 'Sumber...' : 'Pos...'}</option>
                                {type === 'MASUK'
                                    ? danaList?.map((d: any) => <option key={d.id} value={d.id}>{d.nama}</option>)
                                    : posList?.map((p: any) => <option key={p.id} value={p.id}>{p.nama}</option>)
                                }
                            </select>
                            {type === 'KELUAR' && selectedPos?.prioritasSumberDana && (
                                <div className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-700 rounded-lg border border-blue-100 animate-in fade-in slide-in-from-top-1">
                                    <Info size={12} className="shrink-0" />
                                    <span className="text-[10px] font-bold uppercase tracking-tight">
                                        Dana: {selectedPos.prioritasSumberDana.nama}
                                    </span>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nominal Transaksi</label>
                        <div className="relative group">
                            <span className="absolute left-6 top-1/2 -translate-y-1/2 font-black text-slate-300 group-focus-within:text-blue-500 transition-colors text-xl">Rp</span>
                            <input
                                type="number"
                                value={nominal || ''}
                                onChange={(e) => setNominal(Number(e.target.value))}
                                required
                                className="w-full pl-16 pr-6 py-5 bg-slate-50 border border-slate-100 rounded-3xl focus:outline-none focus:ring-4 focus:ring-blue-500/10 font-black text-2xl text-slate-900 transition-all placeholder:text-slate-200"
                                placeholder="0"
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Keterangan Tambahan</label>
                        <textarea
                            value={keterangan}
                            onChange={(e) => setKeterangan(e.target.value)}
                            required
                            className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:outline-none focus:ring-4 focus:ring-blue-500/10 font-medium text-sm transition-all"
                            rows={2}
                            placeholder="Contoh: Pembelian alat tulis kantor..."
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={kasirMasuk.isPending || kasirKeluar.isPending}
                        className={`w-full py-5 ${type === 'MASUK' ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-900/20' : 'bg-rose-600 hover:bg-rose-700 shadow-rose-900/20'} text-white font-black rounded-3xl hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-3 shadow-2xl disabled:opacity-50`}
                    >
                        {kasirMasuk.isPending || kasirKeluar.isPending ? <div className="w-6 h-6 border-4 border-white/30 border-t-white rounded-full animate-spin" /> : <><Save size={20} /> SIMPAN TRANSAKSI</>}
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
                className="relative bg-white w-full max-w-xl rounded-[2.5rem] shadow-2xl overflow-hidden"
            >
                <div className="p-8 bg-blue-600 text-white">
                    <div className="flex justify-between items-center mb-6">
                        <div className="flex items-center gap-3">
                            <div className="p-3 bg-white/20 backdrop-blur-xl rounded-2xl border border-white/20">
                                <ArrowRightLeft size={24} />
                            </div>
                            <h2 className="text-2xl font-black tracking-tight">Mutasi Antar Kas</h2>
                        </div>
                        <button onClick={onClose} className="p-2 hover:bg-white/20 rounded-xl transition-all">
                            <X size={24} />
                        </button>
                    </div>
                    <p className="text-white/70 text-sm font-medium">Lakukan perpindahan dana antar rekening kas atau berangkas.</p>
                </div>

                <form onSubmit={handleSubmit} className="p-8 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Dari Kas (Sumber)</label>
                            <select
                                value={dariKasId} onChange={(e) => setDariKasId(e.target.value)} required
                                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-4 focus:ring-blue-500/10 font-bold"
                            >
                                <option value="">Pilih Kas...</option>
                                {kasList?.map((k: any) => <option key={k.id} value={k.id}>{k.nama}</option>)}
                            </select>
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Ke Kas (Tujuan)</label>
                            <select
                                value={keKasId} onChange={(e) => setKeKasId(e.target.value)} required
                                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-4 focus:ring-blue-500/10 font-bold"
                            >
                                <option value="">Pilih Kas...</option>
                                {kasList?.filter((k: any) => k.id !== dariKasId).map((k: any) => <option key={k.id} value={k.id}>{k.nama}</option>)}
                            </select>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nominal Transfer</label>
                        <div className="relative group">
                            <span className="absolute left-6 top-1/2 -translate-y-1/2 font-black text-slate-300 group-focus-within:text-blue-500 transition-colors text-xl">Rp</span>
                            <input
                                type="number" value={nominal || ''} onChange={(e) => setNominal(Number(e.target.value))} required
                                className="w-full pl-16 pr-6 py-5 bg-slate-50 border border-slate-100 rounded-3xl focus:outline-none focus:ring-4 focus:ring-blue-500/10 font-black text-2xl text-slate-900 transition-all placeholder:text-slate-200"
                                placeholder="0"
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Keterangan</label>
                        <textarea
                            value={keterangan} onChange={(e) => setKeterangan(e.target.value)}
                            className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:outline-none focus:ring-4 focus:ring-blue-500/10 font-medium text-sm transition-all"
                            rows={2} placeholder="Contoh: Pengisian kas kecil hari ini..."
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={transferKas.isPending}
                        className="w-full py-5 bg-blue-600 hover:bg-blue-700 text-white font-black rounded-3xl hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-3 shadow-2xl shadow-blue-900/40 disabled:opacity-50"
                    >
                        {transferKas.isPending ? <div className="w-6 h-6 border-4 border-white/30 border-t-white rounded-full animate-spin" /> : <><ArrowRightLeft size={20} /> PROSES MUTASI</>}
                    </button>
                </form>
            </motion.div>
        </div>
    );
}
