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
        <div className="space-y-8 pb-20">
            <Toaster position="top-right" richColors />

            {/* Shared View Switching Header */}
            <div className="flex bg-slate-100 p-1.5 rounded-2xl w-fit mx-auto shadow-sm border border-slate-200">
                <Link
                    to="/keuangan/billing"
                    className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${!isHistoryPath ? 'bg-white text-blue-600 shadow-md' : 'text-slate-500 hover:text-slate-700'}`}
                >
                    <Zap size={16} /> Generate Baru
                </Link>
                <Link
                    to="/keuangan/billing/history"
                    className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${isHistoryPath ? 'bg-white text-blue-600 shadow-md' : 'text-slate-500 hover:text-slate-700'}`}
                >
                    <Calendar size={16} /> Riwayat & Detail
                </Link>
            </div>

            <Outlet />
        </div>
    );
}
