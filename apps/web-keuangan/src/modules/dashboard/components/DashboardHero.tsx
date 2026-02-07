import { ChevronRight } from 'lucide-react'

export function DashboardHero() {
    return (
        <div className="bg-white p-5 sm:p-6 md:p-8 rounded-[32px] border border-slate-200 shadow-sm relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-64 h-64 bg-blue-50/50 rounded-full blur-3xl -mr-20 -mt-20 group-hover:bg-blue-100/50 transition-colors"></div>
            <div className="relative z-10">
                <h2 className="text-2xl font-bold text-slate-900 mb-2">Kelola Pembayaran SPP</h2>
                <p className="text-slate-500 mb-8 max-w-lg leading-relaxed">
                    Catat pembayaran masuk dari orang tua siswa dengan cepat. Sistem akan otomatis memproses alokasi tagihan dan mengirim notifikasi WhatsApp.
                </p>
                <button className="bg-slate-900 text-white px-8 py-3.5 rounded-2xl hover:bg-slate-800 transition-all font-bold group flex items-center gap-3 shadow-xl shadow-slate-200">
                    Mulai Pembayaran Baru
                    <ChevronRight size={20} className="group-hover:translate-x-1 transition-transform" />
                </button>
            </div>
        </div>
    )
}
