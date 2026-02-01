
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
    onDownload
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

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <button
                        onClick={onBack}
                        className="p-3 bg-white border border-slate-200 rounded-2xl hover:bg-slate-50 transition-all text-slate-600"
                    >
                        <ArrowLeft size={20} />
                    </button>
                    <div>
                        <h2 className="text-xl font-bold text-slate-900 leading-none">Rincian Tagihan</h2>
                        <p className="text-sm text-slate-500 font-medium mt-1">Periode {getMonthName(periode)}</p>
                    </div>
                </div>

                <div className="flex flex-wrap gap-2">
                    {/* Status Filter */}
                    <div className="flex-1 md:flex-none">
                        <select
                            value={status || ''}
                            onChange={(e) => onStatusChange?.(e.target.value || null)}
                            className="w-full px-4 py-3 bg-white border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-sm font-medium"
                        >
                            <option value="">Semua Status</option>
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
                            className="w-full px-4 py-3 bg-white border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-sm font-medium"
                        >
                            <option value="">Semua Kelas</option>
                            {rombelList?.map((r) => (
                                <option key={r.id} value={r.id}>{r.nama}</option>
                            ))}
                        </select>
                    </div>

                    <div className="relative flex-1 md:flex-none">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input
                            type="text"
                            placeholder="Cari Siswa / NIS / Invoice..."
                            value={search || ''}
                            onChange={(e) => onSearchChange?.(e.target.value)}
                            className="pl-11 pr-4 py-3 bg-white border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-sm font-medium w-full md:w-64"
                        />
                    </div>
                    <button
                        onClick={onDownload}
                        className="p-3 bg-white border border-slate-200 rounded-2xl hover:bg-slate-50 transition-all text-slate-600 shrink-0"
                    >
                        <Download size={20} />
                    </button>
                </div>
            </div>

            <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50/50">
                                <th className="px-8 py-5 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Siswa</th>
                                <th className="px-6 py-5 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Invoice</th>
                                <th className="px-6 py-5 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Total</th>
                                <th className="px-6 py-5 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Status</th>
                                <th className="px-8 py-5 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-right">Aksi</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {isLoading ? (
                                [...Array(5)].map((_, i) => (
                                    <tr key={i} className="animate-pulse">
                                        <td colSpan={5} className="px-8 py-6 h-16 bg-slate-50/20" />
                                    </tr>
                                ))
                            ) : data?.map((item) => (
                                <tr key={item.id} className="hover:bg-slate-50/50 transition-colors group">
                                    <td className="px-8 py-5">
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center font-bold text-sm">
                                                {item.siswa.namaLengkap.charAt(0)}
                                            </div>
                                            <div>
                                                <div className="text-sm font-bold text-slate-900 group-hover:text-blue-600 transition-colors">{item.siswa.namaLengkap}</div>
                                                <div className="text-[10px] text-slate-400 font-mono tracking-tighter uppercase">{item.siswa.nis} • {item.rombelSnapshot}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-5">
                                        <div className="text-xs font-mono font-bold text-slate-500 lowercase tracking-tighter">{item.kode}</div>
                                        <div className="text-[10px] text-slate-400">Jatuh Tempo: {new Date(item.jatuhTempo).toLocaleDateString('id-ID')}</div>
                                    </td>
                                    <td className="px-6 py-5">
                                        <div className="text-sm font-bold text-slate-900">{formatCurrency(item.sisaTagihan)}</div>
                                        {item.totalDiskon > 0 && <div className="text-[10px] text-emerald-600 font-bold italic">Hemat {formatCurrency(item.totalDiskon)}</div>}
                                    </td>
                                    <td className="px-6 py-5">
                                        {statusBadge(item.status)}
                                    </td>
                                    <td className="px-8 py-5 text-right">
                                        <button
                                            onClick={() => onViewInvoice?.(item)}
                                            className="p-2 text-slate-300 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all"
                                        >
                                            <Eye size={18} />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
