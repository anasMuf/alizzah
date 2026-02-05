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
        <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                <div className="flex items-center gap-3">
                    <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl">
                        <History size={24} />
                    </div>
                    <h2 className="text-2xl font-black text-slate-900">Jurnal Mutasi Kas</h2>
                </div>

                <div className="flex items-center gap-3 w-full md:w-auto">
                    <div className="relative flex-1 md:w-64">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                        <input
                            type="text"
                            placeholder="Cari transaksi..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-100 rounded-xl focus:outline-none focus:ring-4 focus:ring-blue-500/10 text-sm font-medium"
                        />
                    </div>
                    <button className="p-2.5 bg-white border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 transition-all shadow-sm">
                        <Download size={20} />
                    </button>
                </div>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full text-left border-separate border-spacing-y-2">
                    <thead>
                        <tr className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                            <th className="px-4 py-2">Tanggal</th>
                            <th className="px-4 py-2">Akun Kas</th>
                            <th className="px-4 py-2">Keterangan / Pos</th>
                            <th className="px-4 py-2 text-right">Nominal</th>
                            <th className="px-4 py-2">Oleh</th>
                        </tr>
                    </thead>
                    <tbody>
                        {isLoadingTransactions ? (
                            Array(5).fill(0).map((_, i) => (
                                <tr key={i} className="animate-pulse">
                                    <td colSpan={5} className="px-4 py-6 bg-slate-50 rounded-2xl" />
                                </tr>
                            ))
                        ) : transactions?.data?.length === 0 ? (
                            <tr>
                                <td colSpan={5} className="py-20 text-center text-slate-400 font-medium">
                                    Tidak ada data transaksi yang ditemukan.
                                </td>
                            </tr>
                        ) : transactions?.data?.map((trx: any) => (
                            <tr key={trx.id} className="group hover:bg-slate-50 transition-all rounded-2xl overflow-hidden shadow-sm">
                                <td className="px-4 py-4 bg-slate-50/50 group-hover:bg-slate-100/50 rounded-l-2xl border-y border-l border-slate-100 group-hover:border-slate-200">
                                    <p className="font-bold text-slate-900 text-sm">{new Date(trx.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}</p>
                                    <p className="text-[10px] text-slate-400 font-bold tracking-tight">{new Date(trx.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                                </td>
                                <td className="px-4 py-4 bg-slate-50/50 group-hover:bg-slate-100/50 border-y border-slate-100 group-hover:border-slate-200">
                                    <span className="px-3 py-1 bg-white border border-slate-200 rounded-lg text-[10px] font-black text-slate-600">
                                        {trx.kas?.nama}
                                    </span>
                                </td>
                                <td className="px-4 py-4 bg-slate-50/50 group-hover:bg-slate-100/50 border-y border-slate-100 group-hover:border-slate-200">
                                    <p className="text-sm font-bold text-slate-800">{trx.keterangan || '-'}</p>
                                    <div className="flex items-center gap-2 mt-1">
                                        <div className={`p-1 rounded-md ${trx.tipeTransaksi === 'MASUK' ? 'bg-emerald-100 text-emerald-700' :
                                            trx.tipeTransaksi === 'KELUAR' ? 'bg-rose-100 text-rose-700' :
                                                'bg-blue-100 text-blue-700'
                                            }`}>
                                            {trx.tipeTransaksi === 'MASUK' ? <ArrowDownLeft size={10} /> :
                                                trx.tipeTransaksi === 'KELUAR' ? <ArrowUpRight size={10} /> :
                                                    <ArrowRightLeft size={10} />}
                                        </div>
                                        <p className="text-[10px] text-blue-600 font-bold uppercase tracking-tight">
                                            {trx.posPengeluaran?.nama || trx.sumberDana?.nama || trx.tipeTransaksi}
                                        </p>
                                    </div>
                                </td>
                                <td className="px-4 py-4 bg-slate-50/50 group-hover:bg-slate-100/50 border-y border-slate-100 group-hover:border-slate-200 text-right">
                                    <p className={`font-black text-lg ${trx.tipeTransaksi === 'MASUK' ? 'text-emerald-600' :
                                        trx.tipeTransaksi === 'KELUAR' ? 'text-rose-600' :
                                            'text-slate-900'
                                        }`}>
                                        {trx.tipeTransaksi === 'KELUAR' ? '-' : ''}{formatCurrency(trx.nominal)}
                                    </p>
                                </td>
                                <td className="px-4 py-4 bg-slate-50/50 group-hover:bg-slate-100/50 border-y border-r border-slate-100 group-hover:border-slate-200 rounded-r-2xl">
                                    <div className="flex items-center gap-2">
                                        <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center text-[10px] font-bold text-blue-600">
                                            {trx.createdByUser?.namaLengkap?.charAt(0) || 'A'}
                                        </div>
                                        <span className="text-xs font-medium text-slate-600">{trx.createdByUser?.namaLengkap || 'Admin'}</span>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Pagination Controls */}
            {transactions?.totalPages > 1 && (
                <div className="mt-8 flex justify-center items-center gap-4 py-4 border-t border-slate-100">
                    <button
                        onClick={() => setPage(p => Math.max(1, p - 1))}
                        disabled={page === 1}
                        className="px-4 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-600 disabled:opacity-50"
                    >
                        Prev
                    </button>
                    <span className="text-xs font-black text-slate-400 uppercase tracking-widest">
                        Page {page} of {transactions.totalPages}
                    </span>
                    <button
                        onClick={() => setPage(p => Math.min(transactions.totalPages, p + 1))}
                        disabled={page === transactions.totalPages}
                        className="px-4 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-600 disabled:opacity-50"
                    >
                        Next
                    </button>
                </div>
            )}
        </div>
    );
}
