import { useState, useEffect } from 'react'
import { createFileRoute, useSearch, useNavigate } from '@tanstack/react-router'
import { useAtomValue } from 'jotai'
import { tokenAtom } from '~/stores/auth'
import {
    CreditCard,
    ArrowRight,
    Search,
    CheckCircle,
    Banknote,
    Wallet,
    AlertTriangle,
    X,
    ChevronRight,
    Loader2,
    Info,
    FileText
} from 'lucide-react'
import { AnimatePresence, motion } from 'framer-motion'
import { formatCurrency, parseCurrency } from '@alizzah/shared'

// Hooks & Components
import { useStudentFinancialSummary } from '~/modules/keuangan/pembayaran/hooks/useStudentFinancialSummary'
import { usePembayaranMutations } from '~/modules/keuangan/pembayaran/hooks/usePembayaranMutations'
import { useJenisPembayaranList } from '~/modules/keuangan/pembayaran/hooks/useJenisPembayaranList'
import { StudentSearch } from '~/modules/keuangan/pembayaran/components/StudentSearch'
import { StudentDebtSummary } from '~/modules/keuangan/pembayaran/components/StudentDebtSummary'
import { ReceiptModal } from '~/modules/keuangan/pembayaran/components/ReceiptModal'
import { IncidentalItemForm } from '~/modules/keuangan/pembayaran/components/IncidentalItemForm'

export const Route = createFileRoute('/keuangan/pembayaran/')({
    component: PembayaranKasirPage,
})

interface PaymentConfirmationModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    data: {
        siswa: any;
        paymentAmount: number;
        metode: string;
        additionalItems: any[];
        unpaidTagihan: any[];
        isPending: boolean;
    };
}

function PaymentConfirmationModal({ isOpen, onClose, onConfirm, data }: PaymentConfirmationModalProps) {
    const [openTagihanId, setOpenTagihanId] = useState<string | null>(null);
    if (!isOpen) return null;

    const totalIncidental = data.additionalItems.reduce((acc, curr) => acc + parseCurrency(curr.nominal), 0);
    const amountForTagihan = Math.max(0, data.paymentAmount - totalIncidental);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={onClose}
                className="absolute inset-0 bg-slate-900/60 backdrop-blur-md"
            />

            <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden border border-white/20 flex flex-col max-h-[90vh]"
            >
                {/* Header */}
                <div className="px-5 py-4 border-b border-slate-100 flex justify-between items-center bg-indigo-50/30">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-indigo-600 text-white rounded-xl shadow-lg shadow-indigo-100">
                            <AlertTriangle size={20} />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-slate-900 leading-tight">Konfirmasi Pembayaran</h2>
                            <p className="text-[9px] text-indigo-600 font-black uppercase tracking-widest italic">Preview Transaksi</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-1.5 hover:bg-white rounded-full transition-all text-slate-400">
                        <X size={18} />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-5 space-y-5">
                    {/* Student Info Summary */}
                    <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100 flex items-center gap-3.5">
                        <div className="w-10 h-10 bg-indigo-100 text-indigo-600 rounded-lg flex items-center justify-center font-black">
                            {data.siswa?.namaLengkap?.charAt(0)}
                        </div>
                        <div>
                            <div className="text-sm font-black text-slate-900 leading-none mb-1">{data.siswa?.namaLengkap}</div>
                            <div className="text-[9px] text-slate-400 font-black uppercase tracking-tighter italic">
                                {data.siswa?.nis} • {data.siswa?.rombel?.nama}
                            </div>
                        </div>
                    </div>

                    <div className="space-y-5">
                        <div className="flex justify-between items-center">
                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Metode Bayar</span>
                            <span className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border ${data.metode === 'TUNAI' ? 'bg-emerald-50 border-emerald-100 text-emerald-600' : 'bg-blue-50 border-blue-100 text-blue-600'}`}>
                                {data.metode}
                            </span>
                        </div>

                        {/* Mandatory Items Preview */}
                        <div className="space-y-2.5">
                            <span className="text-[9px] font-black text-indigo-600 uppercase tracking-widest flex items-center gap-1.5 leading-none">
                                <div className="w-1 h-1 rounded-full bg-indigo-600" /> Tagihan Utama
                            </span>
                            <div className="bg-slate-50/50 rounded-xl border border-slate-100 divide-y divide-slate-100 overflow-hidden">
                                {data.unpaidTagihan.length === 0 ? (
                                    <div className="p-3 text-center text-[9px] text-slate-400 font-bold uppercase italic">Tidak Ada Tunggakan</div>
                                ) : (
                                    data.unpaidTagihan.map((tagihan, idx) => (
                                        <div key={idx} className="flex flex-col">
                                            <button
                                                onClick={() => setOpenTagihanId(openTagihanId === tagihan.id ? null : tagihan.id)}
                                                className="p-2.5 flex justify-between items-center text-[11px] hover:bg-white transition-all text-left w-full group"
                                            >
                                                <div className="flex items-center gap-2.5">
                                                    <ChevronRight size={12} className={`text-slate-400 transition-transform ${openTagihanId === tagihan.id ? 'rotate-90 text-indigo-600' : ''}`} />
                                                    <div className="flex flex-col">
                                                        <span className={`font-black transition-colors ${openTagihanId === tagihan.id ? 'text-indigo-600' : 'text-slate-700'}`}>Tagihan {new Date(tagihan.periode).toLocaleDateString('id-ID', { month: 'short', year: 'numeric' })}</span>
                                                        <span className="text-[8px] text-slate-400 font-mono italic leading-none">{tagihan.kode}</span>
                                                    </div>
                                                </div>
                                                <span className="font-bold text-slate-900">{formatCurrency(tagihan.sisaTagihan)}</span>
                                            </button>

                                            <AnimatePresence>
                                                {openTagihanId === tagihan.id && (
                                                    <motion.div
                                                        initial={{ height: 0, opacity: 0 }}
                                                        animate={{ height: 'auto', opacity: 1 }}
                                                        exit={{ height: 0, opacity: 0 }}
                                                        className="overflow-hidden bg-white/60 border-t border-slate-100"
                                                    >
                                                        <div className="px-8 py-2.5 space-y-1">
                                                            {tagihan.tagihanItems?.map((item: any) => (
                                                                <div key={item.id} className="flex justify-between items-center text-[9px]">
                                                                    <span className="text-slate-500 font-black italic">• {item.namaItem}</span>
                                                                    <span className="font-bold text-slate-700 font-mono">{formatCurrency(item.nominalAkhir)}</span>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </motion.div>
                                                )}
                                            </AnimatePresence>
                                        </div>
                                    ))
                                )}
                                <div className="p-2.5 bg-indigo-50/50 flex justify-between items-center text-[9px] font-black border-t-2 border-indigo-100">
                                    <span className="text-indigo-600 uppercase tracking-widest leading-none">Alokasi ke Tagihan</span>
                                    <span className="text-indigo-700 font-mono">{formatCurrency(amountForTagihan)}</span>
                                </div>
                            </div>
                        </div>

                        {/* Additional Items Preview */}
                        {data.additionalItems.length > 0 && (
                            <div className="space-y-2.5">
                                <span className="text-[9px] font-black text-emerald-600 uppercase tracking-widest flex items-center gap-1.5 leading-none">
                                    <div className="w-1 h-1 rounded-full bg-emerald-600" /> Item Tambahan (Incidental)
                                </span>
                                <div className="bg-emerald-50/30 rounded-xl border border-emerald-100/50 divide-y divide-emerald-100/50">
                                    {data.additionalItems.map((item, idx) => (
                                        <div key={idx} className="p-2.5 flex justify-between items-center text-[11px]">
                                            <span className="text-emerald-700 font-black italic">• {item.catatan || 'Biaya Tambahan'}</span>
                                            <span className="font-bold text-emerald-900 font-mono">{formatCurrency(item.nominal)}</span>
                                        </div>
                                    ))}
                                    <div className="p-2.5 bg-emerald-100/30 flex justify-between items-center text-[9px] font-black border-t border-emerald-200/50">
                                        <span className="text-emerald-600 uppercase tracking-widest text-[8px] leading-none">Subtotal Tambahan</span>
                                        <span className="text-emerald-700 font-mono">{formatCurrency(totalIncidental)}</span>
                                    </div>
                                </div>
                            </div>
                        )}

                        <div className="p-5 bg-slate-900 rounded-2xl text-white space-y-1.5 text-center relative overflow-hidden shadow-xl">
                            <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/10 blur-2xl rounded-full -mr-12 -mt-12" />
                            <p className="text-[9px] font-black text-indigo-400 uppercase tracking-widest relative z-10 leading-none">Nominal Diterima</p>
                            <p className="text-2xl font-black tracking-tight relative z-10 font-mono">{formatCurrency(data.paymentAmount)}</p>
                        </div>
                    </div>

                    <div className="bg-amber-50 p-3.5 rounded-xl border border-amber-100 flex gap-2.5">
                        <Info size={14} className="text-amber-600 shrink-0 mt-0.5" />
                        <p className="text-[9px] text-amber-800 leading-relaxed font-black mb-0.5 italic">
                            Sistem mendahulukan Item Tambahan, kemudian sisa dana ke Tagihan Utama (FIFO).
                        </p>
                    </div>
                </div>

                <div className="px-5 py-4 bg-slate-50 border-t border-slate-100 flex gap-2.5">
                    <button
                        onClick={onClose}
                        disabled={data.isPending}
                        className="flex-1 py-3 bg-white border border-slate-200 text-slate-600 font-black rounded-xl hover:bg-slate-50 transition-all text-[10px] uppercase tracking-widest"
                    >
                        Perbaiki
                    </button>
                    <button
                        onClick={onConfirm}
                        disabled={data.isPending}
                        className="flex-1 py-3 bg-indigo-600 text-white font-black rounded-xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 flex items-center justify-center gap-2 active:scale-95 text-[10px] uppercase tracking-widest disabled:opacity-50"
                    >
                        {data.isPending ? <Loader2 className="animate-spin" size={14} /> : <CheckCircle size={14} />}
                        <span>Final Submit</span>
                    </button>
                </div>
            </motion.div>
        </div>
    );
}

function PembayaranKasirPage() {
    const token = useAtomValue(tokenAtom)
    const { siswaId } = useSearch({ from: '/keuangan/pembayaran' })
    const navigate = useNavigate()
    const [selectedSiswaId, setSelectedSiswaId] = useState<string | null>(null)
    const [paymentAmount, setPaymentAmount] = useState<number>(0)
    const [metode, setMetode] = useState<'TUNAI' | 'TRANSFER'>('TUNAI')
    const [selectedReceipt, setSelectedReceipt] = useState<any | null>(null)
    const [isReceiptOpen, setIsReceiptOpen] = useState(false)
    const [incidentalItems, setIncidentalItems] = useState<any[]>([])
    const [isConfirmOpen, setIsConfirmOpen] = useState(false);

    // Initial load from search params
    useEffect(() => {
        if (siswaId) {
            setSelectedSiswaId(siswaId);
        }
    }, [siswaId]);

    const handleSelectSiswa = (id: string) => {
        setSelectedSiswaId(id);
        navigate({
            to: '/keuangan/pembayaran',
            search: { siswaId: id },
            replace: true
        });
    };

    const handleClearSiswa = () => {
        setSelectedSiswaId(null);
        setPaymentAmount(0);
        setIncidentalItems([]);
        navigate({
            to: '/keuangan/pembayaran',
            search: { siswaId: undefined },
            replace: true
        });
    };

    const { data: summary, isLoading: loadingSummary, refetch: refetchSummary } = useStudentFinancialSummary(token, selectedSiswaId)
    const { createMutation } = usePembayaranMutations(token)
    const { data: jpList } = useJenisPembayaranList(token)

    // Clear state when student changes
    useEffect(() => {
        setPaymentAmount(0);
        setIncidentalItems([]);
    }, [selectedSiswaId]);

    const handleOpenConfirm = () => {
        if (!selectedSiswaId || paymentAmount <= 0) return;
        setIsConfirmOpen(true);
    }

    const handleConfirmPayment = async () => {
        try {
            const result = await createMutation.mutateAsync({
                siswaId: selectedSiswaId!,
                totalBayar: paymentAmount,
                metode,
                tanggal: new Date(),
                additionalItems: incidentalItems.map(item => ({
                    jenisPembayaranId: item.jenisPembayaranId,
                    nominal: item.nominal,
                    catatan: item.catatan
                }))
            });
            // Show receipt
            setSelectedReceipt(result);
            setIsReceiptOpen(true);
            setIsConfirmOpen(false);

            // Reset form
            setPaymentAmount(0);
            setIncidentalItems([]);
            refetchSummary();
        } catch (error) {
            // Error handled by mutation toast
        }
    }

    const totalIncidental = incidentalItems.reduce((acc, curr) => acc + parseCurrency(curr.nominal), 0);
    const suggestedTotal = parseCurrency(summary?.totalDebt || 0) + totalIncidental;

    return (
        <div className="space-y-5 animate-in fade-in duration-500">
            <AnimatePresence>
                {isReceiptOpen && (
                    <ReceiptModal
                        isOpen={isReceiptOpen}
                        onClose={() => setIsReceiptOpen(false)}
                        pembayaran={selectedReceipt}
                    />
                )}
                {isConfirmOpen && (
                    <PaymentConfirmationModal
                        isOpen={isConfirmOpen}
                        onClose={() => setIsConfirmOpen(false)}
                        onConfirm={handleConfirmPayment}
                        data={{
                            siswa: summary?.siswa,
                            paymentAmount,
                            metode,
                            additionalItems: incidentalItems,
                            unpaidTagihan: summary?.unpaidTagihan || [],
                            isPending: createMutation.isPending
                        }}
                    />
                )}
            </AnimatePresence>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                {/* Input Area */}
                <div className="lg:col-span-2 space-y-4">
                    <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-5">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl">
                                    <Search size={20} />
                                </div>
                                <h2 className="text-lg font-bold text-slate-900 uppercase">Input Kasir</h2>
                            </div>
                            {selectedSiswaId && (
                                <button
                                    onClick={handleClearSiswa}
                                    className="text-[10px] font-black text-rose-500 hover:text-rose-700 uppercase tracking-[0.2em] italic"
                                >
                                    Ganti Siswa
                                </button>
                            )}
                        </div>

                        {!selectedSiswaId ? (
                            <StudentSearch onSelect={(s) => handleSelectSiswa(s.id)} />
                        ) : (
                            <div className="space-y-5 animate-in fade-in duration-500">
                                <StudentDebtSummary data={summary} isLoading={loadingSummary} />

                                <div className="h-px bg-slate-100" />

                                <IncidentalItemForm
                                    availableItems={jpList || []}
                                    items={incidentalItems}
                                    onChange={setIncidentalItems}
                                />
                            </div>
                        )}
                    </div>

                    {selectedSiswaId && suggestedTotal > 0 && (
                        <div className="bg-blue-600 p-5 rounded-2xl text-white shadow-xl shadow-blue-200 flex flex-col md:flex-row items-center justify-between gap-5 animate-in zoom-in-95 duration-500 overflow-hidden relative">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 blur-3xl rounded-full -mr-16 -mt-16" />
                            <div className="space-y-1 relative z-10 text-center md:text-left">
                                <p className="text-blue-100/60 font-black uppercase tracking-widest text-[9px] leading-none mb-1">Total Estimasi Pembayaran</p>
                                <p className="text-2xl font-black font-mono">{formatCurrency(suggestedTotal)}</p>
                                {totalIncidental > 0 && (
                                    <p className="text-[9px] text-blue-200 font-black uppercase tracking-tight italic mt-1 leading-none">Termasuk {incidentalItems.length} tambahan: {formatCurrency(totalIncidental)}</p>
                                )}
                            </div>
                            <button
                                onClick={() => setPaymentAmount(suggestedTotal)}
                                className="px-5 py-2.5 bg-white text-blue-600 font-black rounded-xl hover:bg-blue-50 transition-all shadow-lg active:scale-95 flex items-center gap-2 text-[10px] uppercase tracking-widest relative z-10"
                            >
                                <CheckCircle size={14} /> Gunakan Nominal Ini
                            </button>
                        </div>
                    )}
                </div>

                {/* Order Sidebar */}
                <div className="space-y-4 h-fit lg:sticky lg:top-4">
                    <div className="bg-slate-900 p-5 rounded-2xl text-white shadow-2xl space-y-5 relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 blur-3xl rounded-full -mr-16 -mt-16" />

                        <h3 className="text-sm font-black flex items-center gap-2 relative z-10 uppercase tracking-widest">
                            <Banknote className="text-blue-400" size={18} /> Ringkasan Bayar
                        </h3>

                        <div className="space-y-4 relative z-10">
                            {/* Amount Input */}
                            <div className="space-y-2">
                                <label className="text-[9px] font-black text-blue-400 uppercase tracking-[0.2em] ml-1">Bayar Diterima</label>
                                <div className="relative group">
                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 font-black text-slate-500 group-focus-within:text-blue-400 transition-colors text-lg">Rp</span>
                                    <input
                                        type="number"
                                        value={paymentAmount || ''}
                                        onChange={(e) => setPaymentAmount(Number(e.target.value))}
                                        className="w-full pl-12 pr-4 py-4 bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500/50 font-black text-xl text-white transition-all placeholder:text-white/10 font-mono"
                                        placeholder="0"
                                    />
                                </div>
                            </div>

                            {/* Toggle Method */}
                            <div className="grid grid-cols-2 gap-1.5 p-1 bg-white/5 rounded-xl border border-white/5">
                                <button
                                    onClick={() => setMetode('TUNAI')}
                                    className={`py-2 rounded-lg text-[10px] font-black flex items-center justify-center gap-1.5 transition-all uppercase tracking-widest ${metode === 'TUNAI' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
                                >
                                    <Wallet size={12} /> CASH
                                </button>
                                <button
                                    onClick={() => setMetode('TRANSFER')}
                                    className={`py-2 rounded-lg text-[10px] font-black flex items-center justify-center gap-1.5 transition-all uppercase tracking-widest ${metode === 'TRANSFER' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
                                >
                                    <CreditCard size={12} /> BANK
                                </button>
                            </div>

                            <div className="space-y-3 pt-2">
                                <div className="flex justify-between items-center text-slate-400 text-[10px] font-black uppercase tracking-widest leading-none">
                                    <span>Subtotal</span>
                                    <span className="text-white font-mono">{formatCurrency(paymentAmount)}</span>
                                </div>
                                <div className="h-px bg-white/10" />
                                <div className="flex justify-between items-center py-1">
                                    <span className="text-xs font-black text-slate-300 uppercase tracking-widest">Total Akhir</span>
                                    <span className="text-xl font-black text-blue-400 font-mono">{formatCurrency(paymentAmount)}</span>
                                </div>
                            </div>
                        </div>

                        <button
                            onClick={handleOpenConfirm}
                            disabled={!selectedSiswaId || paymentAmount <= 0 || createMutation.isPending}
                            className="w-full py-3.5 bg-blue-600 text-white font-black rounded-xl hover:bg-blue-700 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2.5 shadow-2xl shadow-blue-900/40 disabled:opacity-30 disabled:grayscale disabled:cursor-not-allowed group text-xs uppercase tracking-[0.2em]"
                        >
                            {createMutation.isPending ? (
                                <div className="w-5 h-5 border-3 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : (
                                <>
                                    PROSES BAYAR <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
                                </>
                            )}
                        </button>
                    </div>

                    <div className="bg-amber-50 p-4 rounded-xl border border-amber-100 flex gap-3 animate-in slide-in-from-right-4 duration-700">
                        <div className="p-1.5 bg-white rounded-lg text-amber-600 shadow-sm shrink-0 h-fit mt-0.5">
                            <FileText size={16} />
                        </div>
                        <div>
                            <p className="text-[9px] font-black text-amber-900 uppercase tracking-widest mb-0.5 leading-none">FIFO ALLOCATION</p>
                            <p className="text-[10px] text-amber-800 leading-normal font-black italic">
                                Sesuai urutan tagihan tertua.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
