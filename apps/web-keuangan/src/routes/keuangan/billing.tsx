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
        <div className="p-0 sm:p-6 md:p-8 max-w-[1400px] mx-auto space-y-6 sm:space-y-8 pb-20">
            <Toaster position="top-right" richColors />

            {/* Shared View Switching Header */}
            <div className="px-4 sm:px-0 flex">
                <div className="flex bg-slate-100 p-1 rounded-xl sm:p-1.5 sm:rounded-2xl w-full sm:w-fit mx-auto shadow-sm border border-slate-200">
                    <Link
                        to="/keuangan/billing"
                        className={`flex-1 sm:flex-none px-4 sm:px-6 py-2 sm:py-2.5 rounded-lg sm:rounded-xl text-[10px] sm:text-sm font-bold transition-all flex items-center justify-center gap-2 ${!isHistoryPath ? 'bg-white text-blue-600 shadow-md' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        <Zap size={16} className="sm:w-[18px] sm:h-[18px]" /> <span className="whitespace-nowrap">Generate Baru</span>
                    </Link>
                    <Link
                        to="/keuangan/billing/history"
                        className={`flex-1 sm:flex-none px-4 sm:px-6 py-2 sm:py-2.5 rounded-lg sm:rounded-xl text-[10px] sm:text-sm font-bold transition-all flex items-center justify-center gap-2 ${isHistoryPath ? 'bg-white text-blue-600 shadow-md' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        <Calendar size={16} className="sm:w-[18px] sm:h-[18px]" /> <span className="whitespace-nowrap">Riwayat & Detail</span>
                    </Link>
                </div>
            </div>

            <Outlet />
        </div>
    );
}
