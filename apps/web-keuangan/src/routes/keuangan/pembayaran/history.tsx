import { useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { useAtomValue } from 'jotai'
import { tokenAtom } from '~/stores/auth'
import { Search, Download } from 'lucide-react'
import { usePembayaranList } from '~/modules/keuangan/pembayaran/hooks/usePembayaranList'
import { PembayaranHistoryTable } from '~/modules/keuangan/pembayaran/components/PembayaranHistoryTable'

export const Route = createFileRoute('/keuangan/pembayaran/history')({
    component: PembayaranHistoryPage,
})

function PembayaranHistoryPage() {
    const token = useAtomValue(tokenAtom)
    const [searchHistory, setSearchHistory] = useState('')

    const { data: history, isLoading: loadingHistory } = usePembayaranList(token, { search: searchHistory })

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
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
    )
}
