import { useRef, useEffect } from 'react';
import { formatCurrency } from '@alizzah/shared';
import {
    Search,
    ArrowLeft,
    Download,
    Eye,
    CheckCircle,
    Clock
} from 'lucide-react';

interface TagihanListTableProps {
    data: any[] | undefined;
    isLoading: boolean;
    onBack: () => void;
    periode: string;
    search?: string;
    onSearchChange?: (val: string) => void;
    status?: string | null;
    onStatusChange?: (val: string | null) => void;
    selectedRombel?: string | null;
    onRombelChange?: (val: string | null) => void;
    rombelList?: any[];
    onViewInvoice?: (item: any) => void;
    onDownload?: () => void;
    hasNextPage?: boolean;
    onLoadMore?: () => void;
    isFetchingNextPage?: boolean;
}

export function TagihanListTable({
    data,
    isLoading,
    onBack,
    periode,
    search,
    onSearchChange,
    status,
    onStatusChange,
    selectedRombel,
    onRombelChange,
    rombelList,
    onViewInvoice,
    onDownload,
    hasNextPage,
    onLoadMore,
    isFetchingNextPage
}: TagihanListTableProps) {
    const getMonthName = (p: string) => {
        const [year, month] = p.split('-');
        return new Date(parseInt(year), parseInt(month) - 1).toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
    };

    const statusBadge = (status: string) => {
        switch (status) {
            case 'PAID':
                return <span className="px-2.5 py-1 bg-emerald-50 text-emerald-600 text-[10px] font-bold rounded-full border border-emerald-100 uppercase tracking-tight flex items-center gap-1 w-fit"><CheckCircle size={10} /> Lunas</span>;
            case 'PARTIAL':
                return <span className="px-2.5 py-1 bg-blue-50 text-blue-600 text-[10px] font-bold rounded-full border border-blue-100 uppercase tracking-tight flex items-center gap-1 w-fit"><Clock size={10} /> Dicicil</span>;
            default:
                return <span className="px-2.5 py-1 bg-slate-100 text-slate-500 text-[10px] font-bold rounded-full border border-slate-200 uppercase tracking-tight flex items-center gap-1 w-fit"><Clock size={10} /> Belum Bayar</span>;
        }
    };

    const sentinelRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!hasNextPage || isFetchingNextPage) return;

        const observer = new IntersectionObserver((entries) => {
            if (entries[0].isIntersecting) {
                onLoadMore?.();
            }
        }, { threshold: 0.1 });

        const currentSentinel = sentinelRef.current;
        if (currentSentinel) {
            observer.observe(currentSentinel);
        }

        return () => {
            if (currentSentinel) {
                observer.unobserve(currentSentinel);
            }
        };
    }, [hasNextPage, isFetchingNextPage, onLoadMore]);

    return (
        <div className="space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <button
                        onClick={onBack}
                        className="p-2 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-all text-slate-600"
                    >
                        <ArrowLeft size={18} />
                    </button>
                    <div>
                        <h2 className="text-lg font-bold text-slate-900 leading-none">Rincian Tagihan</h2>
                        <p className="text-[10px] text-slate-500 font-medium italic mt-1 uppercase tracking-tight">Periode {getMonthName(periode)}</p>
                    </div>
                </div>

                <div className="flex flex-wrap gap-2 text-slate-900">
                    {/* Status Filter */}
                    <div className="flex-1 md:flex-none">
                        <select
                            value={status || ''}
                            onChange={(e) => onStatusChange?.(e.target.value || null)}
                            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-xs font-bold"
                        >
                            <option value="">Status</option>
                            <option value="UNPAID">Belum Bayar</option>
                            <option value="PARTIAL">Dicicil</option>
                            <option value="PAID">Lunas</option>
                        </select>
                    </div>

                    {/* Rombel Filter */}
                    <div className="flex-1 md:flex-none">
                        <select
                            value={selectedRombel || ''}
                            onChange={(e) => onRombelChange?.(e.target.value || null)}
                            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-xs font-bold"
                        >
                            <option value="">Kelas</option>
                            {rombelList?.map((r) => (
                                <option key={r.id} value={r.id}>{r.nama}</option>
                            ))}
                        </select>
                    </div>

                    <div className="relative flex-1 md:flex-none">
                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                        <input
                            type="text"
                            placeholder="Cari Siswa / Invoice..."
                            value={search || ''}
                            onChange={(e) => onSearchChange?.(e.target.value)}
                            className="pl-10 pr-3 py-2 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-xs font-bold w-full md:w-56"
                        />
                    </div>
                    <button
                        onClick={onDownload}
                        className="p-2 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-all text-slate-600 shrink-0"
                    >
                        <Download size={18} />
                    </button>
                </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="overflow-x-auto custom-scrollbar">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50/50">
                                <th className="px-4 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">Siswa</th>
                                <th className="px-3 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">Invoice</th>
                                <th className="px-3 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">Total</th>
                                <th className="px-3 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</th>
                                <th className="px-4 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Aksi</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {isLoading && data?.length === 0 ? (
                                [...Array(5)].map((_, i) => (
                                    <tr key={i} className="animate-pulse">
                                        <td colSpan={5} className="px-4 py-4 h-12 bg-slate-50/20" />
                                    </tr>
                                ))
                            ) : data?.map((item) => (
                                <tr key={item.id} className="hover:bg-slate-50/50 transition-colors group">
                                    <td className="px-4 py-2.5">
                                        <div className="flex items-center gap-3">
                                            <div className="w-9 h-9 bg-indigo-50 text-indigo-600 rounded-lg flex items-center justify-center font-black text-sm border border-indigo-100">
                                                {(item.siswa?.namaLengkap || item.pesertaDaycare?.namaLengkap || '?').charAt(0)}
                                            </div>
                                            <div>
                                                <div className="text-xs font-extrabold text-slate-900 group-hover:text-blue-600 transition-colors uppercase tracking-tight">
                                                    {item.siswa?.namaLengkap || item.pesertaDaycare?.namaLengkap || 'PESERTA'}
                                                </div>
                                                <div className="text-[9px] text-slate-400 font-mono tracking-tighter uppercase font-medium">
                                                    {item.siswa?.nis || 'DAYCARE'} • {item.rombelSnapshot}
                                                </div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-3 py-2.5">
                                        <div className="text-[10px] font-mono font-black text-slate-500 lowercase tracking-tighter leading-none">{item.kode}</div>
                                        <div className="text-[9px] text-slate-400 font-medium italic mt-0.5">{new Date(item.jatuhTempo).toLocaleDateString('id-ID')}</div>
                                    </td>
                                    <td className="px-3 py-2.5">
                                        <div className="text-xs font-black text-slate-900 font-mono">{formatCurrency(item.sisaTagihan)}</div>
                                        {item.totalDiskon > 0 && <div className="text-[9px] text-emerald-600 font-black italic tracking-tighter leading-none mt-0.5">-{formatCurrency(item.totalDiskon)}</div>}
                                    </td>
                                    <td className="px-3 py-2.5">
                                        {statusBadge(item.status)}
                                    </td>
                                    <td className="px-4 py-2.5 text-right">
                                        <button
                                            onClick={() => onViewInvoice?.(item)}
                                            className="p-1.5 text-slate-300 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                                        >
                                            <Eye size={16} />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {hasNextPage && (
                    <div ref={sentinelRef} className="p-8 border-t border-slate-100 bg-slate-50/20 flex justify-center items-center gap-3">
                        <div className="w-4 h-4 border-2 border-blue-600/20 border-t-blue-600 rounded-full animate-spin" />
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Memuat...</p>
                    </div>
                )}
            </div>
        </div>
    );
}
