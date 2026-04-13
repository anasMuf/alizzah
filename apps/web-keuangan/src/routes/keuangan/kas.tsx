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
        <div className="p-0 sm:p-4 max-w-[1400px] mx-auto space-y-5 pb-16 animate-in fade-in duration-700">
            <Toaster position="top-right" richColors />

            {/* Header Area */}
            <div className="px-4 sm:px-0 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-xl font-extrabold text-slate-900 tracking-tight uppercase">Management Kas</h1>
                    <p className="text-xs text-slate-500 font-medium mt-0.5">Kelola arus kas fisik, brankas, dan mutasi dana sekolah.</p>
                </div>

                {!isRekonsiliasi && (
                    <div className="flex bg-slate-100 p-1 rounded-lg w-full sm:w-fit shadow-sm border border-slate-200">
                        <Link
                            to="/keuangan/kas"
                            className={`flex-1 sm:flex-none px-3 sm:px-4 py-1.5 rounded-md text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${!isMutasi ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            <Wallet size={14} /> Overview
                        </Link>
                        <Link
                            to="/keuangan/kas/mutasi"
                            className={`flex-1 sm:flex-none px-3 sm:px-4 py-1.5 rounded-md text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${isMutasi ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
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
