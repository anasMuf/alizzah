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
        <div className="p-0 sm:p-6 md:p-8 max-w-[1400px] mx-auto space-y-6 sm:space-y-8 pb-32 animate-in fade-in duration-700">
            <Toaster position="top-right" richColors />

            {/* Header Area */}
            <div className="px-4 sm:px-0 flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <h1 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">Management Kas</h1>
                    <p className="text-sm sm:text-base text-slate-500 font-medium mt-0.5 sm:mt-1">Kelola arus kas fisik, brankas, dan mutasi dana sekolah.</p>
                </div>

                {!isRekonsiliasi && (
                    <div className="flex bg-slate-100 p-1 rounded-xl sm:p-1.5 sm:rounded-2xl w-full sm:w-fit shadow-sm border border-slate-200">
                        <Link
                            to="/keuangan/kas"
                            className={`flex-1 sm:flex-none px-4 sm:px-6 py-2 sm:py-2.5 rounded-lg sm:rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center justify-center gap-2 ${!isMutasi ? 'bg-white text-blue-600 shadow-md' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            <Wallet size={16} className="sm:w-[18px] sm:h-[18px]" /> Overview
                        </Link>
                        <Link
                            to="/keuangan/kas/mutasi"
                            className={`flex-1 sm:flex-none px-4 sm:px-6 py-2 sm:py-2.5 rounded-lg sm:rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center justify-center gap-2 ${isMutasi ? 'bg-white text-blue-600 shadow-md' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            <History size={16} className="sm:w-[18px] sm:h-[18px]" /> <span className="whitespace-nowrap">Riwayat Mutasi</span>
                        </Link>
                    </div>
                )}
            </div>

            <Outlet />
        </div>
    );
}
