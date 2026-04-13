import { createFileRoute, Outlet, Link, useLocation } from '@tanstack/react-router'
import { CreditCard, History } from 'lucide-react'
import { Toaster } from 'sonner'

export const Route = createFileRoute('/keuangan/pembayaran')({
    component: PembayaranLayout,
    validateSearch: (search: Record<string, unknown>): { siswaId?: string } => {
        return {
            siswaId: search.siswaId as string | undefined
        }
    }
})

function PembayaranLayout() {
    const location = useLocation();
    const isHistory = location.pathname.includes('/history');

    return (
        <div className="p-0 sm:p-0 max-w-[1400px] mx-auto space-y-3 pb-20">
            <Toaster position="top-right" richColors />

            {/* Page Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div className="p-1.5 bg-blue-600 text-white rounded-lg shadow-xl shadow-blue-100">
                        <CreditCard size={16} />
                    </div>
                    <div>
                        <h1 className="text-lg font-black text-slate-900 tracking-tight uppercase italic leading-none">Pembayaran & Kasir</h1>
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest leading-none mt-1 italic">Kelola transaksi pembayaran SPP & Biaya Pendidikan.</p>
                    </div>
                </div>

                <div className="flex bg-slate-100 p-0.5 rounded-lg w-full sm:w-fit shadow-sm border border-slate-200 overflow-x-auto no-scrollbar">
                    <Link
                        to="/keuangan/pembayaran"
                        className={`flex-1 sm:flex-none px-3 py-1 rounded-md text-[9px] font-black transition-all flex items-center justify-center gap-2 uppercase tracking-widest italic ${!isHistory ? 'bg-white text-blue-600 shadow-md' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        <CreditCard size={14} /> <span className="whitespace-nowrap">Kasir</span>
                    </Link>
                    <Link
                        to="/keuangan/pembayaran/history"
                        className={`flex-1 sm:flex-none px-3 py-1 rounded-md text-[9px] font-black transition-all flex items-center justify-center gap-2 uppercase tracking-widest italic ${isHistory ? 'bg-white text-blue-600 shadow-md' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        <History size={14} /> <span className="whitespace-nowrap">Riwayat</span>
                    </Link>
                </div>
            </div>

            <Outlet />
        </div>
    )
}
