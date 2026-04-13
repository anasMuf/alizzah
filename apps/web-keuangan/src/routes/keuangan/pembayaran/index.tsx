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
                initial={{ opacity: 0, scale: 0.9, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 10 }}
                className="relative w-full max-w-md bg-white rounded-xl shadow-2xl overflow-hidden border border-slate-200 flex flex-col max-h-[95vh]"
            >
                {/* Header */}
                <div className="px-4 py-3 border-b border-slate-100 flex justify-between items-center bg-indigo-50/30">
                    <div className="flex items-center gap-3">
                        <div className="p-1.5 bg-indigo-600 text-white rounded-lg">
                            <AlertTriangle size={16} />
                        </div>
                        <div>
                            <h2 className="text-base font-black text-slate-900 leading-tight uppercase tracking-tight italic">Konfirmasi Pembayaran</h2>
                            <p className="text-[9px] text-indigo-600 font-black uppercase tracking-widest italic">PREVIEW TRANSAKSI</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-1 hover:bg-white rounded-full transition-all text-slate-400">
                        <X size={16} />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
                    {/* Student Info Summary */}
                    <div className="p-2 bg-slate-50 rounded-lg border border-slate-100 flex items-center gap-3">
                        <div className="w-8 h-8 bg-indigo-100 text-indigo-600 rounded flex items-center justify-center font-black text-xs">
                            {data.siswa?.namaLengkap?.charAt(0)}
                        </div>
                        <div>
                            <div className="text-xs font-black text-slate-900 leading-none mb-1 uppercase tracking-tight italic">{data.siswa?.namaLengkap}</div>
                            <div className="text-[9px] text-slate-400 font-black uppercase tracking-widest italic leading-none">
                                {data.siswa?.nis} • {data.siswa?.rombel?.nama}
                            </div>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div className="flex justify-between items-center">
                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest italic">METODE BAYAR</span>
                            <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest border ${data.metode === 'TUNAI' ? 'bg-emerald-50 border-emerald-100 text-emerald-600' : 'bg-blue-50 border-blue-100 text-blue-600'}`}>
                                {data.metode}
                            </span>
                        </div>

                        {/* Mandatory Items Preview */}
                        <div className="space-y-2">
                            <span className="text-[9px] font-black text-indigo-600 uppercase tracking-widest flex items-center gap-1.5 leading-none italic">
                                <div className="w-1 h-1 rounded-full bg-indigo-600" /> TAGIHAN UTAMA
                            </span>
                            <div className="bg-slate-50/50 rounded-lg border border-slate-100 divide-y divide-slate-100 overflow-hidden text-[10px]">
                                {data.unpaidTagihan.length === 0 ? (
                                    <div className="p-2 text-center text-[9px] text-slate-400 font-black uppercase italic">TIDAK ADA TUNGGAKAN</div>
                                ) : (
                                    data.unpaidTagihan.map((tagihan, idx) => (
                                        <div key={idx} className="flex flex-col">
                                            <button
                                                onClick={() => setOpenTagihanId(openTagihanId === tagihan.id ? null : tagihan.id)}
                                                className="p-2 flex justify-between items-center hover:bg-white transition-all text-left w-full group"
                                            >
                                                <div className="flex items-center gap-2">
                                                    <ChevronRight size={10} className={`text-slate-400 transition-transform ${openTagihanId === tagihan.id ? 'rotate-90 text-indigo-600' : ''}`} />
                                                    <div className="flex flex-col">
                                                        <span className={`font-black uppercase tracking-tight italic transition-colors ${openTagihanId === tagihan.id ? 'text-indigo-600' : 'text-slate-700'}`}>TAGIHAN {new Date(tagihan.periode).toLocaleDateString('id-ID', { month: 'short', year: 'numeric' }).toUpperCase()}</span>
                                                        <span className="text-[8px] text-slate-400 font-black font-mono italic leading-none">{tagihan.kode}</span>
                                                    </div>
                                                </div>
                                                <span className="font-black text-slate-900 italic font-mono">{formatCurrency(tagihan.sisaTagihan)}</span>
                                            </button>

                                            <AnimatePresence>
                                                {openTagihanId === tagihan.id && (
                                                    <motion.div
                                                        initial={{ height: 0, opacity: 0 }}
                                                        animate={{ height: 'auto', opacity: 1 }}
                                                        exit={{ height: 0, opacity: 0 }}
                                                        className="overflow-hidden bg-white/60 border-t border-slate-100"
                                                    >
                                                        <div className="px-6 py-1.5 space-y-0.5">
                                                            {tagihan.tagihanItems?.map((item: any) => (
                                                                <div key={item.id} className="flex justify-between items-center text-[8px]">
                                                                    <span className="text-slate-400 font-black italic uppercase tracking-tight">• {item.namaItem}</span>
                                                                    <span className="font-black text-slate-600 font-mono tracking-tighter">{formatCurrency(item.nominalAkhir)}</span>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </motion.div>
                                                )}
                                            </AnimatePresence>
                                        </div>
                                    ))
                                )}
                                <div className="p-2 bg-indigo-50/50 flex justify-between items-center text-[9px] font-black border-t border-indigo-100">
                                    <span className="text-indigo-600 uppercase tracking-widest leading-none italic">ALOKASI TAGIHAN</span>
                                    <span className="text-indigo-700 font-mono italic">{formatCurrency(amountForTagihan)}</span>
                                </div>
                            </div>
                        </div>

                        {/* Additional Items Preview */}
                        {data.additionalItems.length > 0 && (
                            <div className="space-y-2">
                                <span className="text-[9px] font-black text-emerald-600 uppercase tracking-widest flex items-center gap-1.5 leading-none italic">
                                    <div className="w-1 h-1 rounded-full bg-emerald-600" /> ITEM TAMBAHAN
                                </span>
                                <div className="bg-emerald-50/30 rounded-lg border border-emerald-100/50 divide-y divide-emerald-100/50 text-[10px]">
                                    {data.additionalItems.map((item, idx) => (
                                        <div key={idx} className="p-2 flex justify-between items-center">
                                            <span className="text-emerald-700 font-black italic uppercase tracking-tight">• {item.catatan || 'BIAYA TAMBAHAN'}</span>
                                            <span className="font-black text-emerald-900 font-mono tracking-tighter italic">{formatCurrency(item.nominal)}</span>
                                        </div>
                                    ))}
                                    <div className="p-2 bg-emerald-100/30 flex justify-between items-center text-[9px] font-black border-t border-emerald-200/50">
                                        <span className="text-emerald-600 uppercase tracking-widest text-[8px] leading-none italic">SUBTOTAL TAMBAHAN</span>
                                        <span className="text-emerald-700 font-mono italic">{formatCurrency(totalIncidental)}</span>
                                    </div>
                                </div>
                            </div>
                        )}

                        <div className="p-3 bg-slate-900 rounded-xl text-white space-y-0.5 text-center relative overflow-hidden shadow-xl">
                            <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/10 blur-2xl rounded-full -mr-12 -mt-12" />
                            <p className="text-[9px] font-black text-indigo-400 uppercase tracking-widest relative z-10 leading-none">NOMINAL DITERIMA</p>
                            <p className="text-xl font-black tracking-tight relative z-10 font-mono italic">{formatCurrency(data.paymentAmount)}</p>
                        </div>
                    </div>

                    <div className="bg-amber-50 p-2.5 rounded-lg border border-amber-100 flex gap-2">
                        <Info size={12} className="text-amber-600 shrink-0 mt-0.5" />
                        <p className="text-[8px] text-amber-800 leading-tight font-black uppercase italic mb-0.5 tracking-tight">
                            Sistem mendahulukan Item Tambahan, kemudian sisa dana ke Tagihan Utama (FIFO).
                        </p>
                    </div>
                </div>

                <div className="px-4 py-3 bg-slate-50 border-t border-slate-100 flex gap-2 shrink-0">
                    <button
                        onClick={onClose}
                        disabled={data.isPending}
                        className="flex-1 py-1.5 bg-white border border-slate-200 text-slate-400 font-black rounded hover:bg-slate-50 transition-all text-[10px] uppercase tracking-widest italic"
                    >
                        PERBAIKI
                    </button>
                    <button
                        onClick={onConfirm}
                        disabled={data.isPending}
                        className="flex-1 py-1.5 bg-indigo-600 text-white font-black rounded hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 flex items-center justify-center gap-2 active:scale-95 text-[10px] uppercase tracking-widest italic disabled:opacity-50"
                    >
                        {data.isPending ? <Loader2 className="animate-spin" size={14} /> : <CheckCircle size={14} />}
                        <span>FINAL SUBMIT</span>
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
        <div className="space-y-3 animate-in fade-in duration-500">
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

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
                {/* Input Area */}
                <div className="lg:col-span-2 space-y-3">
                    <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm space-y-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <div className="p-1.5 bg-blue-50 text-blue-600 rounded">
                                    <Search size={16} />
                                </div>
                                <h2 className="text-base font-black text-slate-900 uppercase tracking-tight italic">Input Kasir</h2>
                            </div>
                            {selectedSiswaId && (
                                <button
                                    onClick={handleClearSiswa}
                                    className="text-[9px] font-black text-rose-500 hover:text-rose-700 uppercase tracking-widest italic"
                                >
                                    GANTI SISWA
                                </button>
                            )}
                        </div>

                        {!selectedSiswaId ? (
                            <StudentSearch onSelect={(s) => handleSelectSiswa(s.id)} />
                        ) : (
                            <div className="space-y-4 animate-in fade-in duration-500">
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
                        <div className="bg-blue-600 p-4 rounded-xl text-white shadow-xl shadow-blue-200 flex flex-col md:flex-row items-center justify-between gap-3 animate-in zoom-in-95 duration-500 overflow-hidden relative">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 blur-3xl rounded-full -mr-16 -mt-16" />
                            <div className="space-y-1 relative z-10 text-center md:text-left">
                                <p className="text-blue-100/60 font-black uppercase tracking-widest text-[8px] leading-none mb-1">Total Estimasi Pembayaran</p>
                                <p className="text-xl font-black font-mono tracking-tighter italic">{formatCurrency(suggestedTotal)}</p>
                                {totalIncidental > 0 && (
                                    <p className="text-[8px] text-blue-200 font-black uppercase tracking-tight italic mt-1 leading-none">Termasuk {incidentalItems.length} tambahan: {formatCurrency(totalIncidental)}</p>
                                )}
                            </div>
                            <button
                                onClick={() => setPaymentAmount(suggestedTotal)}
                                className="px-4 py-2 bg-white text-blue-600 font-black rounded-lg hover:bg-blue-50 transition-all shadow-lg active:scale-95 flex items-center gap-2 text-[9px] uppercase tracking-widest relative z-10 italic"
                            >
                                <CheckCircle size={14} /> Gunakan Nominal Ini
                            </button>
                        </div>
                    )}
                </div>

                {/* Order Sidebar */}
                <div className="space-y-3 h-fit lg:sticky lg:top-2">
                    <div className="bg-slate-900 p-4 rounded-xl text-white shadow-2xl space-y-4 relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 blur-3xl rounded-full -mr-16 -mt-16" />

                        <h3 className="text-xs font-black flex items-center gap-2 relative z-10 uppercase tracking-widest italic">
                            <Banknote className="text-blue-400" size={16} /> Kasir Pembayaran
                        </h3>

                        <div className="space-y-4 relative z-10">
                            {/* Amount Input */}
                            <div className="space-y-1.5">
                                <label className="text-[8px] font-black text-blue-400 uppercase tracking-[0.2em] ml-1">BAYAR DITERIMA</label>
                                <div className="relative group">
                                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-black text-slate-500 group-focus-within:text-blue-400 transition-colors text-base italic leading-none">Rp</span>
                                    <input
                                        type="number"
                                        value={paymentAmount || ''}
                                        onChange={(e) => setPaymentAmount(Number(e.target.value))}
                                        className="w-full pl-10 pr-3 py-3 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500/50 font-black text-lg text-white transition-all placeholder:text-white/10 font-mono italic"
                                        placeholder="0"
                                    />
                                </div>
                            </div>

                            {/* Toggle Method */}
                            <div className="grid grid-cols-2 gap-1 p-0.5 bg-white/5 rounded-lg border border-white/5">
                                <button
                                    onClick={() => setMetode('TUNAI')}
                                    className={`py-1.5 rounded text-[9px] font-black flex items-center justify-center gap-1 transition-all uppercase tracking-widest italic ${metode === 'TUNAI' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
                                >
                                    <Wallet size={10} /> CASH
                                </button>
                                <button
                                    onClick={() => setMetode('TRANSFER')}
                                    className={`py-1.5 rounded text-[9px] font-black flex items-center justify-center gap-1 transition-all uppercase tracking-widest italic ${metode === 'TRANSFER' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
                                >
                                    <CreditCard size={10} /> BANK
                                </button>
                            </div>

                            <div className="space-y-2 pt-1">
                                <div className="flex justify-between items-center text-slate-400 text-[9px] font-black uppercase tracking-widest leading-none italic">
                                    <span>Subtotal</span>
                                    <span className="text-white font-mono italic">{formatCurrency(paymentAmount)}</span>
                                </div>
                                <div className="h-px bg-white/10" />
                                <div className="flex justify-between items-center py-1">
                                    <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest italic">TOTAL AKHIR</span>
                                    <span className="text-xl font-black text-blue-400 font-mono italic tracking-tighter">{formatCurrency(paymentAmount)}</span>
                                </div>
                            </div>
                        </div>

                        <button
                            onClick={handleOpenConfirm}
                            disabled={!selectedSiswaId || paymentAmount <= 0 || createMutation.isPending}
                            className="w-full py-3 bg-blue-600 text-white font-black rounded-lg hover:bg-black hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2 shadow-2xl shadow-blue-900/40 disabled:opacity-30 disabled:grayscale disabled:cursor-not-allowed group text-[11px] uppercase tracking-[0.2em] italic"
                        >
                            {createMutation.isPending ? (
                                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : (
                                <>
                                    PROSES BAYAR <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
                                </>
                            )}
                        </button>
                    </div>

                    <div className="bg-amber-50 p-3 rounded-lg border border-amber-100 flex gap-2 animate-in slide-in-from-right-4 duration-700">
                        <div className="p-1 bg-white rounded text-amber-600 shadow-sm shrink-0 h-fit mt-0.5">
                            <FileText size={14} />
                        </div>
                        <div>
                            <p className="text-[8px] font-black text-amber-900 uppercase tracking-[0.2em] mb-0.5 leading-none italic">FIFO ALLOCATION</p>
                            <p className="text-[9px] text-amber-800 leading-normal font-black italic uppercase tracking-tight">
                                Sesuai urutan tagihan tertua.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
