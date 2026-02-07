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
        <div className="space-y-8 animate-in fade-in duration-500">
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-linear-to-br from-emerald-600 to-teal-700 rounded-[2.5rem] p-5 sm:p-6 md:p-8 text-white shadow-xl shadow-emerald-200/50 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 blur-3xl rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-700" />
                    <div className="flex items-center justify-between relative z-10">
                        <div className="space-y-2">
                            <p className="text-emerald-100/80 text-xs font-black uppercase tracking-[0.2em]">Tabungan Umum</p>
                            <p className="text-4xl font-black tracking-tight mt-1">
                                {summaryLoading ? '...' : formatCurrency(summary?.tabunganUmum?.totalSaldo)}
                            </p>
                            <p className="text-emerald-100 text-xs font-bold bg-white/10 w-fit px-3 py-1 rounded-full backdrop-blur-sm">
                                {summary?.tabunganUmum?.jumlahAkun || 0} Akun Aktif
                            </p>
                        </div>
                        <div className="p-5 bg-white/10 rounded-3xl backdrop-blur-md border border-white/20 shadow-inner">
                            <Wallet className="h-10 w-10 text-white" />
                        </div>
                    </div>
                </div>

                <div className="bg-linear-to-br from-amber-500 to-orange-600 rounded-[2.5rem] p-5 sm:p-6 md:p-8 text-white shadow-xl shadow-amber-200/50 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 blur-3xl rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-700" />
                    <div className="flex items-center justify-between relative z-10">
                        <div className="space-y-2">
                            <p className="text-amber-100/80 text-xs font-black uppercase tracking-[0.2em]">Mandatory (Wajib)</p>
                            <p className="text-4xl font-black tracking-tight mt-1">
                                {summaryLoading ? '...' : formatCurrency(summary?.tabunganWajib?.totalSaldo)}
                            </p>
                            <p className="text-amber-100 text-xs font-bold bg-white/10 w-fit px-3 py-1 rounded-full backdrop-blur-sm">
                                {summary?.tabunganWajib?.jumlahAkun || 0} Siswa TK-B
                            </p>
                        </div>
                        <div className="p-5 bg-white/10 rounded-3xl backdrop-blur-md border border-white/20 shadow-inner">
                            <PiggyBank className="h-10 w-10 text-white" />
                        </div>
                    </div>
                </div>
            </div>

            {/* Content Card */}
            <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden">
                {/* Filters Header */}
                <div className="p-5 sm:p-8 border-b border-slate-100 bg-slate-50/50">
                    <div className="flex flex-col md:flex-row gap-4">
                        <div className="flex-1 relative">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                            <input
                                type="text"
                                placeholder="Cari nama atau NIS siswa..."
                                value={search}
                                onChange={(e) => {
                                    setSearch(e.target.value);
                                    setPage(1);
                                }}
                                className="w-full pl-12 pr-4 py-3.5 rounded-2xl border border-slate-200 focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all font-medium text-slate-900 bg-white"
                            />
                        </div>
                        <select
                            value={jenisFilter}
                            onChange={(e) => {
                                setJenisFilter(e.target.value as any);
                                setPage(1);
                            }}
                            className="px-6 py-3.5 rounded-2xl border border-slate-200 focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all font-bold text-slate-700 bg-white appearance-none cursor-pointer"
                        >
                            <option value="">Semua Jenis Tabungan</option>
                            <option value="UMUM">Tabungan Umum</option>
                            <option value="WAJIB_BERLIAN">Tabungan Wajib Berlian</option>
                        </select>
                    </div>
                </div>

                {/* Table Section */}
                {isLoading ? (
                    <div className="p-20 text-center">
                        <div className="animate-spin h-10 w-10 border-4 border-emerald-500 border-t-transparent rounded-full mx-auto" />
                        <p className="mt-4 text-slate-500 font-bold uppercase tracking-widest text-xs">Memvalidasi Data...</p>
                    </div>
                ) : error ? (
                    <div className="p-20 text-center text-rose-500 font-bold">
                        Gagal memuat data: {(error as Error).message}
                    </div>
                ) : (
                    <>
                        <div className="overflow-x-auto px-4 pb-4">
                            <table className="w-full border-separate border-spacing-y-2">
                                <thead>
                                    <tr>
                                        <th className="px-6 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Siswa & NIS</th>
                                        <th className="px-6 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Kelas / Jenjang</th>
                                        <th className="px-6 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Jenis Akun</th>
                                        <th className="px-6 py-4 text-right text-[10px] font-black text-slate-400 uppercase tracking-widest">Saldo Saat Ini</th>
                                    </tr>
                                </thead>
                                <tbody className="space-y-4">
                                    {tabunganData?.data?.length === 0 ? (
                                        <tr>
                                            <td colSpan={4} className="px-6 py-20 text-center">
                                                <PiggyBank size={48} className="mx-auto text-slate-200 mb-4" />
                                                <p className="text-slate-400 font-bold tracking-widest uppercase text-xs">Data tabungan kosong</p>
                                            </td>
                                        </tr>
                                    ) : (
                                        tabunganData?.data?.map((item: any) => (
                                            <tr
                                                key={item.id}
                                                className="group hover:scale-[1.01] transition-all cursor-pointer"
                                                onClick={() => onSelectTabungan?.(item)}
                                            >
                                                <td className="px-6 py-5 bg-white border-y border-l border-slate-100 rounded-l-3xl group-hover:border-emerald-200 group-hover:bg-emerald-50/30">
                                                    <div>
                                                        <p className="font-black text-slate-900 leading-tight">{item.siswa?.namaLengkap}</p>
                                                        <p className="text-[11px] font-bold text-slate-400 mt-0.5 tracking-wider">{item.siswa?.nis}</p>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-5 bg-white border-y border-slate-100 group-hover:border-emerald-200 group-hover:bg-emerald-50/30">
                                                    <div>
                                                        <p className="font-bold text-slate-700">{item.siswa?.rombel?.nama || '-'}</p>
                                                        <p className="text-[10px] font-black text-emerald-600 tracking-tighter uppercase">{item.siswa?.rombel?.jenjang?.kode || ''}</p>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-5 bg-white border-y border-slate-100 group-hover:border-emerald-200 group-hover:bg-emerald-50/30">
                                                    <span className={`px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest ${item.jenis === 'UMUM'
                                                        ? 'bg-emerald-100 text-emerald-700'
                                                        : 'bg-amber-100 text-amber-700'
                                                        }`}>
                                                        {item.jenis === 'UMUM' ? 'Tabungan Umum' : 'Wajib Berlian'}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-5 bg-white border-y border-r border-slate-100 rounded-r-3xl text-right group-hover:border-emerald-200 group-hover:bg-emerald-50/30">
                                                    <p className="font-black text-slate-900 text-lg tracking-tight">
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
                            <div className="p-5 sm:p-8 border-t border-slate-100 bg-slate-50/30 flex flex-col md:flex-row items-center justify-between gap-4">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest bg-white px-4 py-2 rounded-full border border-slate-100 shadow-sm">
                                    Records {((page - 1) * 20) + 1} - {Math.min(page * 20, tabunganData.meta.total)} <span className="text-slate-200 mx-2">/</span> Total {tabunganData.meta.total}
                                </p>
                                <div className="flex gap-3">
                                    <button
                                        onClick={() => setPage(p => Math.max(1, p - 1))}
                                        disabled={page === 1}
                                        className="px-6 py-2.5 rounded-xl border border-slate-200 bg-white text-[10px] font-black uppercase tracking-widest text-slate-600 disabled:opacity-30 disabled:grayscale transition-all hover:bg-slate-50 active:scale-95 shadow-sm"
                                    >
                                        Prev
                                    </button>
                                    <div className="flex items-center px-4 bg-white border border-slate-200 rounded-xl text-[10px] font-black text-emerald-600 shadow-sm">
                                        Page {page} of {tabunganData.meta.totalPages}
                                    </div>
                                    <button
                                        onClick={() => setPage(p => p + 1)}
                                        disabled={page >= tabunganData.meta.totalPages}
                                        className="px-6 py-2.5 rounded-xl border border-slate-200 bg-white text-[10px] font-black uppercase tracking-widest text-slate-600 disabled:opacity-30 disabled:grayscale transition-all hover:bg-slate-50 active:scale-95 shadow-sm"
                                    >
                                        Next
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
