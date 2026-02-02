
import { createFileRoute } from '@tanstack/react-router'
import { useState, useEffect } from 'react'
import { useAtomValue } from 'jotai'
import { tokenAtom } from '~/stores/auth'
import {
    CreditCard,
    History,
    FileText,
    ArrowRight,
    Search,
    Download,
    CheckCircle,
    Banknote,
    Wallet
} from 'lucide-react'
import { AnimatePresence } from 'framer-motion'
import { formatCurrency, parseCurrency } from '@alizzah/shared'

// Hooks & Components
import { useStudentFinancialSummary } from '~/modules/keuangan/pembayaran/hooks/useStudentFinancialSummary'
import { usePembayaranMutations } from '~/modules/keuangan/pembayaran/hooks/usePembayaranMutations'
import { usePembayaranList } from '~/modules/keuangan/pembayaran/hooks/usePembayaranList'
import { useJenisPembayaranList } from '~/modules/keuangan/pembayaran/hooks/useJenisPembayaranList'
import { StudentSearch } from '~/modules/keuangan/pembayaran/components/StudentSearch'
import { StudentDebtSummary } from '~/modules/keuangan/pembayaran/components/StudentDebtSummary'
import { PembayaranHistoryTable } from '~/modules/keuangan/pembayaran/components/PembayaranHistoryTable'
import { ReceiptModal } from '~/modules/keuangan/pembayaran/components/ReceiptModal'
import { IncidentalItemForm } from '~/modules/keuangan/pembayaran/components/IncidentalItemForm'

export const Route = createFileRoute('/keuangan/pembayaran')({
    component: PembayaranPage,
})

function PembayaranPage() {
    const token = useAtomValue(tokenAtom)
    const [view, setView] = useState<'transaksi' | 'riwayat'>('transaksi')
    const [selectedSiswaId, setSelectedSiswaId] = useState<string | null>(null)
    const [paymentAmount, setPaymentAmount] = useState<number>(0)
    const [metode, setMetode] = useState<'TUNAI' | 'TRANSFER'>('TUNAI')
    const [searchHistory, setSearchHistory] = useState('')
    const [selectedReceipt, setSelectedReceipt] = useState<any | null>(null)
    const [isReceiptOpen, setIsReceiptOpen] = useState(false)
    const [incidentalItems, setIncidentalItems] = useState<any[]>([])

    const { data: summary, isLoading: loadingSummary, refetch: refetchSummary } = useStudentFinancialSummary(token, selectedSiswaId)
    const { createMutation } = usePembayaranMutations(token)
    const { data: history, isLoading: loadingHistory } = usePembayaranList(token, { search: searchHistory })
    const { data: jpList } = useJenisPembayaranList(token)

    // Clear state when student changes
    useEffect(() => {
        setPaymentAmount(0);
        setIncidentalItems([]);
    }, [selectedSiswaId]);

    const handleProcessPayment = async () => {
        if (!selectedSiswaId || paymentAmount <= 0) return;

        try {
            const result = await createMutation.mutateAsync({
                siswaId: selectedSiswaId,
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
        <div className="p-8 max-w-[1400px] mx-auto space-y-8 pb-24">
            <AnimatePresence>
                {isReceiptOpen && (
                    <ReceiptModal
                        isOpen={isReceiptOpen}
                        onClose={() => setIsReceiptOpen(false)}
                        pembayaran={selectedReceipt}
                    />
                )}
            </AnimatePresence>
            {/* Header Area */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <h1 className="text-3xl font-black text-slate-900 tracking-tight">Financial POS</h1>
                    <p className="text-slate-500 font-medium mt-1">Sistem Penerimaan Kas & Alokasi Tagihan Otomatis.</p>
                </div>

                <div className="flex bg-slate-100 p-1.5 rounded-2xl w-fit shadow-sm border border-slate-200">
                    <button
                        onClick={() => setView('transaksi')}
                        className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${view === 'transaksi' ? 'bg-white text-blue-600 shadow-md' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        <CreditCard size={18} /> Kasir Pembayaran
                    </button>
                    <button
                        onClick={() => setView('riwayat')}
                        className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${view === 'riwayat' ? 'bg-white text-blue-600 shadow-md' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        <History size={18} /> jurnal & Riwayat
                    </button>
                </div>
            </div>

            {view === 'transaksi' ? (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Input Area */}
                    <div className="lg:col-span-2 space-y-6">
                        <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm space-y-8">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl">
                                        <Search size={24} />
                                    </div>
                                    <h2 className="text-xl font-bold text-slate-900">Input Data Bayar</h2>
                                </div>
                                {selectedSiswaId && (
                                    <button
                                        onClick={() => {
                                            setSelectedSiswaId(null);
                                            setPaymentAmount(0);
                                            setIncidentalItems([]);
                                        }}
                                        className="text-xs font-bold text-rose-500 hover:underline uppercase tracking-widest"
                                    >
                                        Ganti Siswa
                                    </button>
                                )}
                            </div>

                            {!selectedSiswaId ? (
                                <StudentSearch onSelect={(s) => setSelectedSiswaId(s.id)} />
                            ) : (
                                <div className="space-y-8 animate-in fade-in duration-500">
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
                            <div className="bg-blue-600 p-8 rounded-[2.5rem] text-white shadow-xl shadow-blue-200 flex flex-col md:flex-row items-center justify-between gap-6 animate-in zoom-in-95 duration-500">
                                <div className="space-y-1">
                                    <p className="text-blue-100/60 font-bold uppercase tracking-widest text-[10px]">Total Estimasi Pembayaran</p>
                                    <p className="text-4xl font-black">{formatCurrency(suggestedTotal)}</p>
                                    {totalIncidental > 0 && (
                                        <p className="text-[10px] text-blue-200 font-medium">Termasuk {incidentalItems.length} item tambahan: {formatCurrency(totalIncidental)}</p>
                                    )}
                                </div>
                                <button
                                    onClick={() => setPaymentAmount(suggestedTotal)}
                                    className="px-8 py-4 bg-white text-blue-600 font-black rounded-2xl hover:bg-blue-50 transition-all shadow-lg active:scale-95 flex items-center gap-2"
                                >
                                    <CheckCircle size={20} /> GUNAKAN TOTAL INI
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Order Sidebar */}
                    <div className="space-y-6 h-fit sticky top-24">
                        <div className="bg-slate-900 p-8 rounded-[3rem] text-white shadow-2xl space-y-8 relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 blur-3xl rounded-full -mr-16 -mt-16" />

                            <h3 className="text-xl font-bold flex items-center gap-2 relative z-10">
                                <Banknote className="text-blue-400" /> Ringkasan Bayar
                            </h3>

                            <div className="space-y-6 relative z-10">
                                {/* Amount Input */}
                                <div className="space-y-3">
                                    <label className="text-[10px] font-black text-blue-400 uppercase tracking-[0.2em] ml-1">Nominal Yang Diterima</label>
                                    <div className="relative group">
                                        <span className="absolute left-6 top-1/2 -translate-y-1/2 font-black text-slate-500 group-focus-within:text-blue-400 transition-colors text-xl">Rp</span>
                                        <input
                                            type="number"
                                            value={paymentAmount || ''}
                                            onChange={(e) => setPaymentAmount(Number(e.target.value))}
                                            className="w-full pl-16 pr-6 py-6 bg-white/5 border border-white/10 rounded-3xl focus:outline-none focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500/50 font-black text-3xl text-white transition-all placeholder:text-white/10"
                                            placeholder="0"
                                        />
                                    </div>
                                </div>

                                {/* Toggle Method */}
                                <div className="grid grid-cols-2 gap-2 p-1 bg-white/5 rounded-2xl border border-white/5">
                                    <button
                                        onClick={() => setMetode('TUNAI')}
                                        className={`py-3 rounded-xl text-xs font-black flex items-center justify-center gap-2 transition-all ${metode === 'TUNAI' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
                                    >
                                        <Wallet size={14} /> CASH
                                    </button>
                                    <button
                                        onClick={() => setMetode('TRANSFER')}
                                        className={`py-3 rounded-xl text-xs font-black flex items-center justify-center gap-2 transition-all ${metode === 'TRANSFER' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
                                    >
                                        <CreditCard size={14} /> BANK
                                    </button>
                                </div>

                                <div className="space-y-4 pt-4">
                                    <div className="flex justify-between items-center text-slate-400 text-xs font-bold uppercase tracking-widest">
                                        <span>Subtotal Alokasi</span>
                                        <span className="text-white">{formatCurrency(paymentAmount)}</span>
                                    </div>
                                    <div className="flex justify-between items-center text-slate-400 text-xs font-bold uppercase tracking-widest">
                                        <span>Biaya Admin</span>
                                        <span className="text-emerald-400">Gratis</span>
                                    </div>
                                    <div className="h-px bg-white/10" />
                                    <div className="flex justify-between items-center py-2">
                                        <span className="text-sm font-bold text-slate-300">Total Akhir</span>
                                        <span className="text-2xl font-black text-blue-400">{formatCurrency(paymentAmount)}</span>
                                    </div>
                                </div>
                            </div>

                            <button
                                onClick={handleProcessPayment}
                                disabled={!selectedSiswaId || paymentAmount <= 0 || createMutation.isPending}
                                className="w-full py-5 bg-blue-600 text-white font-black rounded-3xl hover:bg-blue-700 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-3 shadow-2xl shadow-blue-900/40 disabled:opacity-30 disabled:grayscale disabled:cursor-not-allowed group"
                            >
                                {createMutation.isPending ? (
                                    <div className="w-6 h-6 border-4 border-white/30 border-t-white rounded-full animate-spin" />
                                ) : (
                                    <>
                                        PROSES BAYAR <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
                                    </>
                                )}
                            </button>
                        </div>

                        <div className="bg-amber-50 p-6 rounded-4xl border border-amber-100 flex gap-4 animate-in slide-in-from-right-4 duration-700">
                            <div className="p-2 bg-white rounded-xl text-amber-600 shadow-sm shrink-0 h-fit">
                                <FileText size={20} />
                            </div>
                            <div>
                                <p className="text-[10px] font-black text-amber-900 uppercase tracking-widest mb-1">FIFO ALLOCATION</p>
                                <p className="text-[11px] text-amber-800 leading-relaxed font-medium">
                                    Pembayaran akan diprioritaskan untuk menutup tagihan yang paling lama terlebih dahulu secara otomatis.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="space-y-6">
                    {/* History Filters */}
                    <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
                        <div className="relative w-full md:w-96">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                            <input
                                type="text"
                                placeholder="Cari Kode Bayar / Nama Siswa..."
                                value={searchHistory}
                                onChange={(e) => setSearchHistory(e.target.value)}
                                className="w-full pl-11 pr-4 py-3 bg-white border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-sm font-medium"
                            />
                        </div>
                        <button className="flex items-center gap-2 px-4 py-3 bg-white border border-slate-200 rounded-2xl text-sm font-bold text-slate-600 hover:bg-slate-50 transition-all">
                            <Download size={18} /> Export Laporan
                        </button>
                    </div>

                    <PembayaranHistoryTable
                        data={history}
                        isLoading={loadingHistory}
                        onViewReceipt={(p) => console.log('Print', p)}
                    />
                </div>
            )}
        </div>
    )
}
