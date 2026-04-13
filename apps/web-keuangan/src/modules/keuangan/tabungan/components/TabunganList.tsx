import { useState } from 'react';
import { useAtomValue } from 'jotai';
import { PiggyBank, Wallet, Search } from 'lucide-react';
import { formatCurrency } from '@alizzah/shared';
import { useTabunganList, useTabunganSummary } from '../hooks/useTabunganQueries';
import { tokenAtom } from '~/stores/auth';

interface TabunganListProps {
    onSelectTabungan?: (tabungan: any) => void;
}



export function TabunganList({ onSelectTabungan }: TabunganListProps) {
    const token = useAtomValue(tokenAtom);
    const [search, setSearch] = useState('');
    const [jenisFilter, setJenisFilter] = useState<'WAJIB_BERLIAN' | 'UMUM' | ''>('');
    const [page, setPage] = useState(1);

    const { data: summary, isLoading: summaryLoading } = useTabunganSummary(token);
    const { data: tabunganData, isLoading, error } = useTabunganList(token, {
        search: search || undefined,
        jenis: jenisFilter || undefined,
        page,
        limit: 20
    });

    return (
        <div className="space-y-3 animate-in fade-in duration-500">
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="bg-linear-to-br from-emerald-600 to-teal-700 rounded-xl p-4 text-white shadow-xl shadow-emerald-200/50 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 blur-3xl rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-700" />
                    <div className="flex items-center justify-between relative z-10">
                        <div className="space-y-1">
                            <p className="text-emerald-100/80 text-[8px] font-black uppercase tracking-[0.2em] leading-none mb-1 italic">TABUNGAN UMUM</p>
                            <p className="text-xl font-black tracking-tight font-mono italic">
                                {summaryLoading ? '...' : formatCurrency(summary?.tabunganUmum?.totalSaldo)}
                            </p>
                            <p className="text-emerald-100 text-[8px] font-black uppercase bg-white/10 w-fit px-2 py-0.5 rounded backdrop-blur-sm tracking-widest italic mt-1">
                                {summary?.tabunganUmum?.jumlahAkun || 0} AKUN AKTIF
                            </p>
                        </div>
                        <div className="p-2 bg-white/10 rounded-lg backdrop-blur-md border border-white/20 shadow-inner">
                            <Wallet size={24} className="text-white" />
                        </div>
                    </div>
                </div>

                <div className="bg-linear-to-br from-amber-500 to-orange-600 rounded-xl p-4 text-white shadow-xl shadow-amber-200/50 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 blur-3xl rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-700" />
                    <div className="flex items-center justify-between relative z-10">
                        <div className="space-y-1">
                            <p className="text-amber-100/80 text-[8px] font-black uppercase tracking-[0.2em] leading-none mb-1 italic">TABUNGAN WAJIB</p>
                            <p className="text-xl font-black tracking-tight font-mono italic">
                                {summaryLoading ? '...' : formatCurrency(summary?.tabunganWajib?.totalSaldo)}
                            </p>
                            <p className="text-amber-100 text-[8px] font-black uppercase bg-white/10 w-fit px-2 py-0.5 rounded backdrop-blur-sm tracking-widest italic mt-1">
                                {summary?.tabunganWajib?.jumlahAkun || 0} SISWA TK-B
                            </p>
                        </div>
                        <div className="p-2 bg-white/10 rounded-lg backdrop-blur-md border border-white/20 shadow-inner">
                            <PiggyBank size={24} className="text-white" />
                        </div>
                    </div>
                </div>
            </div>

            {/* Content Card */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                {/* Filters Header */}
                <div className="p-2.5 sm:p-3 border-b border-slate-100 bg-slate-50/50">
                    <div className="flex flex-col md:flex-row gap-2">
                        <div className="flex-1 relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                            <input
                                type="text"
                                placeholder="CARI SISWA ATAU NIS..."
                                value={search}
                                onChange={(e) => {
                                    setSearch(e.target.value);
                                    setPage(1);
                                }}
                                className="w-full pl-9 pr-3 py-1.5 rounded-lg border border-slate-100 focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all font-black text-xs text-slate-900 bg-white placeholder:text-slate-200 placeholder:italic uppercase tracking-tight"
                            />
                        </div>
                        <select
                            value={jenisFilter}
                            onChange={(e) => {
                                setJenisFilter(e.target.value as any);
                                setPage(1);
                            }}
                            className="px-3 py-1.5 rounded-lg border border-slate-100 focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all font-black text-[9px] uppercase tracking-widest text-slate-500 bg-white appearance-none cursor-pointer italic"
                        >
                            <option value="">SEMUA JENIS TABUNGAN</option>
                            <option value="UMUM">TABUNGAN UMUM</option>
                            <option value="WAJIB_BERLIAN">TABUNGAN WAJIB BERLIAN</option>
                        </select>
                    </div>
                </div>

                {/* Table Section */}
                {isLoading ? (
                    <div className="p-12 text-center">
                        <div className="animate-spin h-6 w-6 border-4 border-emerald-500 border-t-transparent rounded-full mx-auto" />
                        <p className="mt-3 text-slate-400 font-black uppercase tracking-[0.2em] text-[10px] italic">MEMVALIDASI DATA...</p>
                    </div>
                ) : error ? (
                    <div className="p-12 text-center text-rose-500 font-bold">
                        Gagal memuat data: {(error as Error).message}
                    </div>
                ) : (
                    <>
                        <div className="overflow-x-auto px-1 pb-1">
                            <table className="w-full border-separate border-spacing-y-1">
                                <thead className="bg-slate-50/50">
                                    <tr>
                                        <th className="px-3 py-2 text-left text-[8px] font-black text-slate-400 uppercase tracking-widest italic">SISWA & NIS</th>
                                        <th className="px-3 py-2 text-left text-[8px] font-black text-slate-400 uppercase tracking-widest italic">KELAS / JENJANG</th>
                                        <th className="px-3 py-2 text-left text-[8px] font-black text-slate-400 uppercase tracking-widest italic">JENIS AKUN</th>
                                        <th className="px-3 py-2 text-right text-[8px] font-black text-slate-400 uppercase tracking-widest italic">SALDO</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {tabunganData?.data?.length === 0 ? (
                                        <tr>
                                            <td colSpan={4} className="px-5 py-12 text-center">
                                                <PiggyBank size={32} className="mx-auto text-slate-200 mb-2" />
                                                <p className="text-slate-400 font-black tracking-[0.2em] uppercase text-[9px] italic">DATA TABUNGAN KOSONG</p>
                                            </td>
                                        </tr>
                                    ) : (
                                        tabunganData?.data?.map((item: any) => (
                                            <tr
                                                key={item.id}
                                                className="group transition-all cursor-pointer"
                                                onClick={() => onSelectTabungan?.(item)}
                                            >
                                                <td className="px-3 py-2.5 bg-slate-50 border-y border-l border-slate-100 rounded-l-lg group-hover:border-emerald-200 group-hover:bg-emerald-50/50">
                                                    <div>
                                                        <p className="font-black text-slate-900 leading-tight text-[10px] uppercase tracking-tight italic">{item.siswa?.namaLengkap}</p>
                                                        <p className="text-[8px] font-black font-mono text-slate-400 mt-0.5 tracking-widest uppercase italic">{item.siswa?.nis}</p>
                                                    </div>
                                                </td>
                                                <td className="px-3 py-2.5 bg-slate-50 border-y border-slate-100 group-hover:border-emerald-200 group-hover:bg-emerald-50/50">
                                                    <div>
                                                        <p className="font-black text-slate-500 text-[9px] uppercase italic">{item.siswa?.rombel?.nama || '-'}</p>
                                                        <p className="text-[7px] font-black text-emerald-600 tracking-tighter uppercase leading-none italic">{item.siswa?.rombel?.jenjang?.kode || ''}</p>
                                                    </div>
                                                </td>
                                                <td className="px-3 py-2.5 bg-slate-50 border-y border-slate-100 group-hover:border-emerald-200 group-hover:bg-emerald-50/50">
                                                    <span className={`px-1.5 py-0.5 rounded-sm text-[8px] font-black uppercase tracking-widest italic border ${item.jenis === 'UMUM'
                                                        ? 'bg-emerald-50 border-emerald-100 text-emerald-700'
                                                        : 'bg-amber-50 border-amber-100 text-amber-700'
                                                        }`}>
                                                        {item.jenis === 'UMUM' ? 'UMUM' : 'WAJIB BERLIAN'}
                                                    </span>
                                                </td>
                                                <td className="px-3 py-2.5 bg-slate-50 border-y border-r border-slate-100 rounded-r-lg text-right group-hover:border-emerald-200 group-hover:bg-emerald-50/50">
                                                    <p className="font-black text-slate-900 text-xs tracking-tighter font-mono italic">
                                                        {formatCurrency(item.saldo)}
                                                    </p>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* Pagination Area */}
                        {tabunganData?.meta && tabunganData.meta.totalPages > 1 && (
                            <div className="p-2.5 sm:p-3 border-t border-slate-100 bg-slate-50/30 flex flex-col md:flex-row items-center justify-between gap-3 shrink-0">
                                <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest bg-white px-2 py-1 rounded-lg border border-slate-100 shadow-sm italic">
                                    RECORDS {((page - 1) * 20) + 1}-{Math.min(page * 20, tabunganData.meta.total)} <span className="text-slate-200 mx-1">/</span> TOTAL {tabunganData.meta.total}
                                </p>
                                <div className="flex gap-1.5">
                                    <button
                                        onClick={() => setPage(p => Math.max(1, p - 1))}
                                        disabled={page === 1}
                                        className="px-3 py-1 rounded bg-white border border-slate-200 text-[9px] font-black uppercase tracking-widest text-slate-400 disabled:opacity-30 disabled:grayscale transition-all hover:bg-slate-50 active:scale-95 shadow-sm"
                                    >
                                        PREV
                                    </button>
                                    <div className="flex items-center px-2 bg-white border border-slate-200 rounded text-[9px] font-black text-emerald-600 shadow-sm italic">
                                        PAGE {page} OF {tabunganData.meta.totalPages}
                                    </div>
                                    <button
                                        onClick={() => setPage(p => p + 1)}
                                        disabled={page >= tabunganData.meta.totalPages}
                                        className="px-3 py-1 rounded bg-white border border-slate-200 text-[9px] font-black uppercase tracking-widest text-slate-400 disabled:opacity-30 disabled:grayscale transition-all hover:bg-slate-50 active:scale-95 shadow-sm"
                                    >
                                        NEXT
                                    </button>
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}
