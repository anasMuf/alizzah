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
        <div className="p-8 max-w-[1400px] mx-auto space-y-8 pb-32 animate-in fade-in duration-700">
            <Toaster position="top-right" richColors />

            {/* Header Area */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <h1 className="text-4xl font-black text-slate-900 tracking-tight">Management Kas</h1>
                    <p className="text-slate-500 font-medium mt-1">Kelola arus kas fisik, brankas, dan mutasi dana sekolah.</p>
                </div>

                {!isRekonsiliasi && (
                    <div className="flex bg-slate-100 p-1.5 rounded-2xl w-fit shadow-sm border border-slate-200">
                        <Link
                            to="/keuangan/kas"
                            className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${!isMutasi ? 'bg-white text-blue-600 shadow-md' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            <Wallet size={18} /> Overview Saldo
                        </Link>
                        <Link
                            to="/keuangan/kas/mutasi"
                            className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${isMutasi ? 'bg-white text-blue-600 shadow-md' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            <History size={18} /> Riwayat Mutasi
                        </Link>
                    </div>
                )}
            </div>

            <Outlet />
        </div>
    );
}
