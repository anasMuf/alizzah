import { ChevronRight } from 'lucide-react'

export function DashboardHero() {
    return (
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-64 h-64 bg-blue-50/50 rounded-full blur-3xl -mr-20 -mt-20 group-hover:bg-blue-100/50 transition-colors"></div>
            <div className="relative z-10">
                <h2 className="text-lg font-bold text-slate-900 mb-1.5">Kelola Pembayaran Siswa</h2>
                <p className="text-xs text-slate-500 mb-4 max-w-lg leading-relaxed">
                    Catat pembayaran masuk dari orang tua siswa dengan cepat. Sistem akan otomatis memproses alokasi tagihan dan mencatat laporan keuangan secara terpadu.
                </p>
                <button className="bg-slate-900 text-white px-5 py-2.5 rounded-xl hover:bg-slate-800 transition-all font-bold group flex items-center gap-2.5 shadow-xl shadow-slate-200 text-xs">
                    Mulai Pembayaran Baru
                    <ChevronRight size={16} className="group-hover:translate-x-1 transition-transform" />
                </button>
            </div>
        </div>
    )
}
