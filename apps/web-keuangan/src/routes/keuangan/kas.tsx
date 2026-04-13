import { createFileRoute, Link, Outlet, useLocation } from '@tanstack/react-router';
import { Wallet, History } from 'lucide-react';
import { Toaster } from 'sonner';

export const Route = createFileRoute('/keuangan/kas')({
    component: KasLayout,
});

function KasLayout() {
    const location = useLocation();
    const isMutasi = location.pathname.includes('/mutasi');
    const isRekonsiliasi = location.pathname.includes('/rekonsiliasi');

    return (
        <div className="p-0 sm:p-0 max-w-[1400px] mx-auto space-y-3 pb-16 animate-in fade-in duration-700">
            <Toaster position="top-right" richColors />

            {/* Header Area */}
            <div className="px-4 sm:px-0 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-lg font-black text-slate-900 tracking-tight uppercase italic">Management Kas</h1>
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest leading-none mt-1 italic">Kelola arus kas fisik, brankas, dan mutasi dana sekolah.</p>
                </div>

                {!isRekonsiliasi && (
                    <div className="flex bg-slate-100 p-0.5 rounded-lg w-full sm:w-fit shadow-sm border border-slate-200">
                        <Link
                            to="/keuangan/kas"
                            className={`flex-1 sm:flex-none px-3 py-1 rounded-md text-[9px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 italic ${!isMutasi ? 'bg-white text-blue-600 shadow-md' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            <Wallet size={14} /> <span className="whitespace-nowrap">Overview</span>
                        </Link>
                        <Link
                            to="/keuangan/kas/mutasi"
                            className={`flex-1 sm:flex-none px-3 py-1 rounded-md text-[9px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 italic ${isMutasi ? 'bg-white text-blue-600 shadow-md' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            <History size={14} /> <span className="whitespace-nowrap">Riwayat Mutasi</span>
                        </Link>
                    </div>
                )}
            </div>

            <Outlet />
        </div>
    );
}
