
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
            <div className="p-6 text-center bg-slate-50 rounded-xl border border-slate-100">
                <Calendar className="mx-auto text-slate-300 mb-2" size={32} />
                <p className="text-slate-500 font-black uppercase tracking-widest text-[10px] italic">Belum Ada Riwayat Generate</p>
                <p className="text-slate-400 text-[9px] font-bold italic uppercase tracking-widest mt-1">Silakan mulai melalui panel di atas.</p>
            </div>
        );
    }

    const getMonthName = (periode: string) => {
        const [year, month] = periode.split('-');
        const date = new Date(parseInt(year), parseInt(month) - 1);
        return date.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' }).toUpperCase();
    };

    return (
        <div className="space-y-3">
            <div className="flex items-center justify-between px-1">
                <h3 className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2 italic">
                    <TrendingUp size={12} className="text-blue-600" /> RIWAYAT TERAKHIR
                </h3>
            </div>

            <div className="grid grid-cols-1 gap-2">
                {data.map((item) => (
                    <div
                        key={item.periode}
                        className="group bg-white p-2.5 rounded-xl border border-slate-200 hover:border-blue-500/50 hover:shadow-lg hover:shadow-blue-500/5 transition-all relative overflow-hidden"
                    >
                        {/* Status Stripe */}
                        <div className={`absolute top-0 left-0 bottom-0 w-1 ${item.isCompleted ? 'bg-emerald-500' : 'bg-orange-500'}`} />

                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                            <div className="flex items-center gap-3">
                                <div className={`p-1.5 rounded-lg shrink-0 ${item.isCompleted ? 'bg-emerald-50 text-emerald-600' : 'bg-orange-50 text-orange-600'}`}>
                                    <Calendar size={16} />
                                </div>
                                <div className="space-y-1">
                                    <div className="text-xs font-black text-slate-900 leading-tight uppercase tracking-tight italic">
                                        {getMonthName(item.periode)}
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                        <div className="flex items-center gap-1 text-[8px] font-black text-slate-400 uppercase tracking-widest bg-slate-100 px-1.5 py-0.5 rounded leading-none">
                                            <Users size={8} /> {item.totalStudents} SISWA
                                        </div>
                                        {item.isCompleted ? (
                                            <div className="flex items-center gap-1 text-[8px] font-black text-emerald-600 uppercase tracking-widest bg-emerald-50 px-1.5 py-0.5 rounded leading-none">
                                                <CheckCircle2 size={8} /> LUNAS
                                            </div>
                                        ) : (
                                            <div className="flex items-center gap-1 text-[8px] font-black text-orange-600 uppercase tracking-widest bg-orange-50 px-1.5 py-0.5 rounded leading-none">
                                                <Clock size={8} /> {item.unpaidCount} TERTUNDA
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 md:grid-cols-3 gap-2 md:gap-4 flex-1 md:justify-end">
                                <div className="space-y-0.5">
                                    <p className="text-[8px] font-black text-slate-300 uppercase tracking-widest leading-none">TOTAL TAGIHAN</p>
                                    <p className="text-[10px] font-black text-slate-900 font-mono tracking-tighter italic">{formatCurrency(item.totalBilled)}</p>
                                </div>
                                <div className="space-y-0.5">
                                    <p className="text-[8px] font-black text-slate-300 uppercase tracking-widest leading-none">TERBAYAR</p>
                                    <p className="text-[10px] font-black text-emerald-600 font-mono tracking-tighter italic">{formatCurrency(item.totalPaid)}</p>
                                </div>
                                <div className="space-y-0.5 hidden md:block border-l border-slate-100 pl-4">
                                    <p className="text-[8px] font-black text-slate-300 uppercase tracking-widest leading-none">SISA</p>
                                    <p className="text-[10px] font-black text-rose-600 font-mono tracking-tighter italic">{formatCurrency(item.totalOutstanding)}</p>
                                </div>
                            </div>

                            <button
                                onClick={() => onViewDetail?.(item.periode)}
                                className="p-1 px-2 bg-slate-50 text-slate-300 rounded hover:bg-blue-600 hover:text-white transition-all group-hover:translate-x-1 border border-slate-100 shrink-0"
                            >
                                <ChevronRight size={16} />
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
