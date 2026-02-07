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
        <div className="p-0 sm:p-6 md:p-8 max-w-[1400px] mx-auto space-y-6 sm:space-y-8 pb-32">
            <Toaster position="top-right" richColors />

            {/* Page Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="flex items-center gap-3 sm:gap-4">
                    <div className="p-3 sm:p-4 bg-blue-600 text-white rounded-2xl sm:rounded-3xl shadow-xl shadow-blue-100">
                        <CreditCard className="h-6 w-6 sm:h-8 sm:w-8" />
                    </div>
                    <div>
                        <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">Pembayaran Siswa</h1>
                        <p className="text-sm sm:text-base text-slate-500 font-medium mt-0.5">Kelola transaksi pembayaran SPP & Biaya Pendidikan lainnya.</p>
                    </div>
                </div>

                <div className="flex bg-slate-100 p-1 rounded-xl sm:p-1.5 sm:rounded-2xl w-full sm:w-fit shadow-sm border border-slate-200 overflow-x-auto no-scrollbar">
                    <Link
                        to="/keuangan/pembayaran"
                        className={`flex-1 sm:flex-none px-4 sm:px-6 py-2 sm:py-2.5 rounded-lg sm:rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center justify-center gap-2 ${!isHistory ? 'bg-white text-blue-600 shadow-md' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        <CreditCard size={16} className="sm:w-[18px] sm:h-[18px]" /> <span className="whitespace-nowrap">Kasir</span>
                    </Link>
                    <Link
                        to="/keuangan/pembayaran/history"
                        className={`flex-1 sm:flex-none px-4 sm:px-6 py-2 sm:py-2.5 rounded-lg sm:rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center justify-center gap-2 ${isHistory ? 'bg-white text-blue-600 shadow-md' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        <History size={16} className="sm:w-[18px] sm:h-[18px]" /> <span className="whitespace-nowrap">Riwayat</span>
                    </Link>
                </div>
            </div>

            <Outlet />
        </div>
    )
}
