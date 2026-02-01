
import { BillingSummary } from '../hooks/useBillingList';
import { formatCurrency } from '@alizzah/shared';
import {
    Calendar,
    Users,
    CheckCircle2,
    Clock,
    ChevronRight,
    TrendingUp
} from 'lucide-react';

interface BillingHistoryTableProps {
    data: BillingSummary[] | undefined;
    isLoading: boolean;
    onViewDetail?: (periode: string) => void;
}

export function BillingHistoryTable({ data, isLoading, onViewDetail }: BillingHistoryTableProps) {
    if (isLoading) {
        return (
            <div className="space-y-4">
                {[...Array(3)].map((_, i) => (
                    <div key={i} className="h-24 bg-slate-100 animate-pulse rounded-3xl" />
                ))}
            </div>
        );
    }

    if (!data || data.length === 0) {
        return (
            <div className="p-12 text-center bg-slate-50 rounded-[2.5rem] border border-slate-100">
                <Calendar className="mx-auto text-slate-300 mb-4" size={48} />
                <p className="text-slate-500 font-bold">Belum Ada Riwayat Generate</p>
                <p className="text-slate-400 text-xs mt-1">Silakan mulai melalui panel di atas.</p>
            </div>
        );
    }

    const getMonthName = (periode: string) => {
        const [year, month] = periode.split('-');
        const date = new Date(parseInt(year), parseInt(month) - 1);
        return date.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
    };

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between px-4">
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-widest flex items-center gap-2">
                    <TrendingUp size={16} className="text-blue-600" /> Riwayat Terakhir
                </h3>
            </div>

            <div className="grid grid-cols-1 gap-4">
                {data.map((item) => (
                    <div
                        key={item.periode}
                        className="group bg-white p-6 rounded-4xl border border-slate-200 hover:border-blue-500/50 hover:shadow-xl hover:shadow-blue-500/5 transition-all relative overflow-hidden"
                    >
                        {/* Status Stripe */}
                        <div className={`absolute top-0 left-0 bottom-0 w-1.5 ${item.isCompleted ? 'bg-emerald-500' : 'bg-orange-500'}`} />

                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                            <div className="flex items-start gap-4">
                                <div className={`p-3 rounded-2xl ${item.isCompleted ? 'bg-emerald-50 text-emerald-600' : 'bg-orange-50 text-orange-600'}`}>
                                    <Calendar size={24} />
                                </div>
                                <div>
                                    <div className="text-lg font-bold text-slate-900 leading-tight">
                                        {getMonthName(item.periode)}
                                    </div>
                                    <div className="flex items-center gap-2 mt-1">
                                        <div className="flex items-center gap-1 text-[10px] font-bold text-slate-400 uppercase tracking-tighter bg-slate-100 px-2 py-0.5 rounded-full">
                                            <Users size={10} /> {item.totalStudents} Siswa
                                        </div>
                                        {item.isCompleted ? (
                                            <div className="flex items-center gap-1 text-[10px] font-bold text-emerald-600 uppercase tracking-tighter bg-emerald-50 px-2 py-0.5 rounded-full">
                                                <CheckCircle2 size={10} /> Lunas
                                            </div>
                                        ) : (
                                            <div className="flex items-center gap-1 text-[10px] font-bold text-orange-600 uppercase tracking-tighter bg-orange-50 px-2 py-0.5 rounded-full">
                                                <Clock size={10} /> {item.unpaidCount} Tertunda
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 md:grid-cols-3 gap-6 md:gap-12 flex-1 md:justify-end">
                                <div className="space-y-1">
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Total Tagihan</p>
                                    <p className="text-sm font-bold text-slate-900">{formatCurrency(item.totalBilled)}</p>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Terbayar</p>
                                    <p className="text-sm font-bold text-emerald-600">{formatCurrency(item.totalPaid)}</p>
                                </div>
                                <div className="space-y-1 hidden md:block">
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Sisa</p>
                                    <p className="text-sm font-bold text-rose-600">{formatCurrency(item.totalOutstanding)}</p>
                                </div>
                            </div>

                            <button
                                onClick={() => onViewDetail?.(item.periode)}
                                className="p-3 bg-slate-50 text-slate-400 rounded-2xl hover:bg-blue-600 hover:text-white transition-all group-hover:translate-x-1"
                            >
                                <ChevronRight size={20} />
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
