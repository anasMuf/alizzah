import { createFileRoute, Outlet, Link, useLocation } from '@tanstack/react-router';
import { Toaster } from 'sonner';
import { Zap, Calendar } from 'lucide-react';

export const Route = createFileRoute('/keuangan/billing')({
    component: BillingLayout,
});

function BillingLayout() {
    const location = useLocation();
    const isHistoryPath = location.pathname.includes('/history');

    return (
        <div className="p-0 sm:p-0 max-w-[1400px] mx-auto space-y-3 pb-20">
            <Toaster position="top-right" richColors />

            {/* Shared View Switching Header */}
            <div className="px-4 sm:px-0 flex">
                <div className="flex bg-slate-100 p-0.5 rounded-lg w-full sm:w-fit mx-auto shadow-sm border border-slate-200">
                    <Link
                        to="/keuangan/billing"
                        className={`flex-1 sm:flex-none px-3 py-1 rounded-md text-[9px] font-black transition-all flex items-center justify-center gap-2 uppercase tracking-widest italic ${!isHistoryPath ? 'bg-white text-blue-600 shadow-md' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        <Zap size={14} /> <span>Generate Baru</span>
                    </Link>
                    <Link
                        to="/keuangan/billing/history"
                        className={`flex-1 sm:flex-none px-3 py-1 rounded-md text-[9px] font-black transition-all flex items-center justify-center gap-2 uppercase tracking-widest italic ${isHistoryPath ? 'bg-white text-blue-600 shadow-md' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        <Calendar size={14} /> <span>Riwayat</span>
                    </Link>
                </div>
            </div>

            <Outlet />
        </div>
    );
}
