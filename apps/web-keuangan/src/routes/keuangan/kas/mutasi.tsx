import { createFileRoute } from '@tanstack/react-router';
import { useAtomValue } from 'jotai';
import { tokenAtom } from '~/stores/auth';
import {
    History,
    Search,
    Download,
    ArrowDownLeft,
    ArrowUpRight,
    ArrowRightLeft
} from 'lucide-react';
import { useState } from 'react';
import { formatCurrency } from '@alizzah/shared';
import { useKasTransaksi } from '~/modules/keuangan/kas/hooks/useKasQueries';

export const Route = createFileRoute('/keuangan/kas/mutasi')({
    component: KasMutasiPage,
});

function KasMutasiPage() {
    const token = useAtomValue(tokenAtom);
    const [search, setSearch] = useState('');
    const [page, setPage] = useState(1);

    const { data: transactions, isLoading: isLoadingTransactions } = useKasTransaksi(token, {
        search,
        page,
        limit: 20
    });

    return (
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-5 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-2.5">
                    <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
                        <History size={20} />
                    </div>
                    <h2 className="text-lg font-black text-slate-900 uppercase tracking-tight leading-none">Jurnal Mutasi Kas</h2>
                </div>

                <div className="flex items-center gap-2.5 w-full md:w-auto">
                    <div className="relative flex-1 md:w-64">
                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                        <input
                            type="text"
                            placeholder="Cari transaksi..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full pl-9 pr-3.5 py-2 bg-slate-50 border border-slate-100 rounded-lg focus:outline-none focus:ring-4 focus:ring-blue-500/10 text-xs font-bold font-mono placeholder:font-sans placeholder:italic"
                        />
                    </div>
                    <button className="p-2 bg-white border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 transition-all shadow-sm active:scale-95">
                        <Download size={16} />
                    </button>
                </div>
            </div>

            <div className="overflow-x-auto px-1">
                <table className="w-full text-left border-separate border-spacing-y-1.5">
                    <thead>
                        <tr className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none italic">
                            <th className="px-3 py-2">Tanggal</th>
                            <th className="px-3 py-2">Akun Kas</th>
                            <th className="px-3 py-2">Keterangan / Pos</th>
                            <th className="px-3 py-2 text-right">Nominal</th>
                            <th className="px-3 py-2">Oleh</th>
                        </tr>
                    </thead>
                    <tbody>
                        {isLoadingTransactions ? (
                            Array(5).fill(0).map((_, i) => (
                                <tr key={i} className="animate-pulse">
                                    <td colSpan={5} className="px-3 py-5 bg-slate-50 rounded-xl" />
                                </tr>
                            ))
                        ) : transactions?.data?.length === 0 ? (
                            <tr>
                                <td colSpan={5} className="py-16 text-center text-slate-400 font-extrabold uppercase text-[10px] tracking-widest italic">
                                    Tidak ada data transaksi yang ditemukan.
                                </td>
                            </tr>
                        ) : transactions?.data?.map((trx: any) => (
                            <tr key={trx.id} className="group hover:scale-[1.002] transition-all">
                                <td className="px-3 py-3 bg-slate-50/50 group-hover:bg-slate-100/50 rounded-l-xl border-y border-l border-slate-100 group-hover:border-slate-200">
                                    <p className="font-extrabold text-slate-900 text-xs leading-none mb-1 uppercase tracking-tighter">
                                        {new Date(trx.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}
                                    </p>
                                    <p className="text-[8px] text-slate-400 font-black uppercase tracking-widest leading-none font-mono">
                                        {new Date(trx.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </p>
                                </td>
                                <td className="px-3 py-3 bg-slate-50/50 group-hover:bg-slate-100/50 border-y border-slate-100 group-hover:border-slate-200">
                                    <span className="px-2 py-0.5 bg-white border border-slate-200 rounded-md text-[8px] font-black uppercase tracking-widest text-slate-500 italic">
                                        {trx.kas?.nama}
                                    </span>
                                </td>
                                <td className="px-3 py-3 bg-slate-50/50 group-hover:bg-slate-100/50 border-y border-slate-100 group-hover:border-slate-200">
                                    <p className="text-xs font-extrabold text-slate-800 leading-none uppercase tracking-tight mb-1">{trx.keterangan || '-'}</p>
                                    <div className="flex items-center gap-1.5 leading-none">
                                        <div className={`p-0.5 rounded-md ${trx.tipeTransaksi === 'MASUK' ? 'bg-emerald-100 text-emerald-700' :
                                            trx.tipeTransaksi === 'KELUAR' ? 'bg-rose-100 text-rose-700' :
                                                'bg-blue-100 text-blue-700'
                                            }`}>
                                            {trx.tipeTransaksi === 'MASUK' ? <ArrowDownLeft size={10} /> :
                                                trx.tipeTransaksi === 'KELUAR' ? <ArrowUpRight size={10} /> :
                                                    <ArrowRightLeft size={10} />}
                                        </div>
                                        <p className="text-[8px] text-blue-600 font-black uppercase tracking-widest italic truncate max-w-[120px]">
                                            {trx.posPengeluaran?.nama || trx.sumberDana?.nama || trx.tipeTransaksi}
                                        </p>
                                    </div>
                                </td>
                                <td className="px-3 py-3 bg-slate-50/50 group-hover:bg-slate-100/50 border-y border-slate-100 group-hover:border-slate-200 text-right">
                                    <p className={`font-black text-sm font-mono tracking-tight leading-none ${trx.tipeTransaksi === 'MASUK' ? 'text-emerald-600' :
                                        trx.tipeTransaksi === 'KELUAR' ? 'text-rose-600' :
                                            'text-slate-900'
                                        }`}>
                                        {trx.tipeTransaksi === 'KELUAR' ? '-' : ''}{formatCurrency(trx.nominal)}
                                    </p>
                                </td>
                                <td className="px-3 py-3 bg-slate-50/50 group-hover:bg-slate-100/50 border-y border-r border-slate-100 group-hover:border-slate-200 rounded-r-xl">
                                    <div className="flex items-center gap-1.5 leading-none">
                                        <div className="w-5 h-5 bg-blue-100 rounded-full flex items-center justify-center text-[9px] font-black text-blue-600 uppercase border border-blue-200/50">
                                            {trx.createdByUser?.namaLengkap?.charAt(0) || 'A'}
                                        </div>
                                        <span className="text-[9px] font-black uppercase tracking-tighter text-slate-500 italic max-w-[80px] truncate">
                                            {trx.createdByUser?.namaLengkap?.split(' ')[0] || 'Admin'}
                                        </span>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Pagination Controls */}
            {transactions?.totalPages > 1 && (
                <div className="mt-5 flex justify-center items-center gap-3 py-3 border-t border-slate-100">
                    <button
                        onClick={() => setPage(p => Math.max(1, p - 1))}
                        disabled={page === 1}
                        className="px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-[10px] font-black uppercase tracking-widest text-slate-600 disabled:opacity-30 active:scale-95 shadow-xs transition-all"
                    >
                        Prev
                    </button>
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] italic">
                        Page {page} / {transactions.totalPages}
                    </span>
                    <button
                        onClick={() => setPage(p => Math.min(transactions.totalPages, p + 1))}
                        disabled={page === transactions.totalPages}
                        className="px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-[10px] font-black uppercase tracking-widest text-slate-600 disabled:opacity-30 active:scale-95 shadow-xs transition-all"
                    >
                        Next
                    </button>
                </div>
            )}
        </div>
    );
}
