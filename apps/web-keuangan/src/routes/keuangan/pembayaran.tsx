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
        <div className="p-8 max-w-[1400px] mx-auto space-y-8 pb-32">
            <Toaster position="top-right" richColors />

            {/* Page Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="flex items-center gap-4">
                    <div className="p-4 bg-blue-600 text-white rounded-3xl shadow-xl shadow-blue-100">
                        <CreditCard className="h-8 w-8" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-black text-slate-900 tracking-tight">Pembayaran Siswa</h1>
                        <p className="text-slate-500 font-medium mt-1">Kelola transaksi pembayaran SPP & Biaya Pendidikan lainnya.</p>
                    </div>
                </div>

                <div className="flex bg-slate-100 p-1.5 rounded-2xl w-fit shadow-sm border border-slate-200">
                    <Link
                        to="/keuangan/pembayaran"
                        className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${!isHistory ? 'bg-white text-blue-600 shadow-md' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        <CreditCard size={18} /> Kasir Pembayaran
                    </Link>
                    <Link
                        to="/keuangan/pembayaran/history"
                        className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${isHistory ? 'bg-white text-blue-600 shadow-md' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        <History size={18} /> Jurnal & Riwayat
                    </Link>
                </div>
            </div>

            <Outlet />
        </div>
    )
}
