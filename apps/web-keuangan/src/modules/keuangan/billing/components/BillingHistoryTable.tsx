
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
                    <div key={i} className="h-20 bg-slate-100 animate-pulse rounded-xl" />
                ))}
            </div>
        );
    }

    if (!data || data.length === 0) {
        return (
            <div className="p-10 text-center bg-slate-50 rounded-2xl border border-slate-100">
                <Calendar className="mx-auto text-slate-300 mb-3" size={40} />
                <p className="text-slate-500 font-bold uppercase tracking-tight text-sm">Belum Ada Riwayat Generate</p>
                <p className="text-slate-400 text-[10px] font-medium italic uppercase tracking-widest mt-1">Silakan mulai melalui panel di atas.</p>
            </div>
        );
    }

    const getMonthName = (periode: string) => {
        const [year, month] = periode.split('-');
        const date = new Date(parseInt(year), parseInt(month) - 1);
        return date.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
    };

    return (
        <div className="space-y-3.5">
            <div className="flex items-center justify-between px-2">
                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
                    <TrendingUp size={14} className="text-blue-600" /> Riwayat Terakhir
                </h3>
            </div>

            <div className="grid grid-cols-1 gap-3">
                {data.map((item) => (
                    <div
                        key={item.periode}
                        className="group bg-white p-4 rounded-2xl border border-slate-200 hover:border-blue-500/50 hover:shadow-xl hover:shadow-blue-500/5 transition-all relative overflow-hidden"
                    >
                        {/* Status Stripe */}
                        <div className={`absolute top-0 left-0 bottom-0 w-1 ${item.isCompleted ? 'bg-emerald-500' : 'bg-orange-500'}`} />

                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <div className="flex items-start gap-3.5">
                                <div className={`p-2.5 rounded-xl ${item.isCompleted ? 'bg-emerald-50 text-emerald-600' : 'bg-orange-50 text-orange-600'}`}>
                                    <Calendar size={20} />
                                </div>
                                <div className="space-y-0.5">
                                    <div className="text-base font-extrabold text-slate-900 leading-tight uppercase tracking-tight">
                                        {getMonthName(item.periode)}
                                    </div>
                                    <div className="flex items-center gap-1.5 mt-0.5">
                                        <div className="flex items-center gap-1 text-[9px] font-black text-slate-400 uppercase tracking-tighter bg-slate-100 px-2 py-0.5 rounded-full">
                                            <Users size={9} /> {item.totalStudents} Siswa
                                        </div>
                                        {item.isCompleted ? (
                                            <div className="flex items-center gap-1 text-[9px] font-black text-emerald-600 uppercase tracking-tighter bg-emerald-50 px-2 py-0.5 rounded-full">
                                                <CheckCircle2 size={9} /> Lunas
                                            </div>
                                        ) : (
                                            <div className="flex items-center gap-1 text-[9px] font-black text-orange-600 uppercase tracking-tighter bg-orange-50 px-2 py-0.5 rounded-full">
                                                <Clock size={9} /> {item.unpaidCount} Tertunda
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-8 flex-1 md:justify-end">
                                <div className="space-y-0.5">
                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none">Total Tagihan</p>
                                    <p className="text-xs font-black text-slate-900 font-mono">{formatCurrency(item.totalBilled)}</p>
                                </div>
                                <div className="space-y-0.5">
                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none">Terbayar</p>
                                    <p className="text-xs font-black text-emerald-600 font-mono">{formatCurrency(item.totalPaid)}</p>
                                </div>
                                <div className="space-y-0.5 hidden md:block">
                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none">Sisa</p>
                                    <p className="text-xs font-black text-rose-600 font-mono">{formatCurrency(item.totalOutstanding)}</p>
                                </div>
                            </div>

                            <button
                                onClick={() => onViewDetail?.(item.periode)}
                                className="p-2 bg-slate-50 text-slate-400 rounded-xl hover:bg-blue-600 hover:text-white transition-all group-hover:translate-x-1"
                            >
                                <ChevronRight size={18} />
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
