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
        <div className="space-y-5 animate-in fade-in duration-500">
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-linear-to-br from-emerald-600 to-teal-700 rounded-2xl p-5 text-white shadow-xl shadow-emerald-200/50 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 blur-3xl rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-700" />
                    <div className="flex items-center justify-between relative z-10">
                        <div className="space-y-1.5">
                            <p className="text-emerald-100/80 text-[9px] font-black uppercase tracking-[0.2em] leading-none mb-1">Tabungan Umum</p>
                            <p className="text-2xl font-black tracking-tight font-mono">
                                {summaryLoading ? '...' : formatCurrency(summary?.tabunganUmum?.totalSaldo)}
                            </p>
                            <p className="text-emerald-100 text-[9px] font-black uppercase bg-white/10 w-fit px-2.5 py-1 rounded-md backdrop-blur-sm tracking-widest italic">
                                {summary?.tabunganUmum?.jumlahAkun || 0} Akun Aktif
                            </p>
                        </div>
                        <div className="p-3.5 bg-white/10 rounded-xl backdrop-blur-md border border-white/20 shadow-inner">
                            <Wallet size={32} className="text-white" />
                        </div>
                    </div>
                </div>

                <div className="bg-linear-to-br from-amber-500 to-orange-600 rounded-2xl p-5 text-white shadow-xl shadow-amber-200/50 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 blur-3xl rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-700" />
                    <div className="flex items-center justify-between relative z-10">
                        <div className="space-y-1.5">
                            <p className="text-amber-100/80 text-[9px] font-black uppercase tracking-[0.2em] leading-none mb-1">Mandatory (Wajib)</p>
                            <p className="text-2xl font-black tracking-tight font-mono">
                                {summaryLoading ? '...' : formatCurrency(summary?.tabunganWajib?.totalSaldo)}
                            </p>
                            <p className="text-amber-100 text-[9px] font-black uppercase bg-white/10 w-fit px-2.5 py-1 rounded-md backdrop-blur-sm tracking-widest italic">
                                {summary?.tabunganWajib?.jumlahAkun || 0} Siswa TK-B
                            </p>
                        </div>
                        <div className="p-3.5 bg-white/10 rounded-xl backdrop-blur-md border border-white/20 shadow-inner">
                            <PiggyBank size={32} className="text-white" />
                        </div>
                    </div>
                </div>
            </div>

            {/* Content Card */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                {/* Filters Header */}
                <div className="p-4 sm:p-5 border-b border-slate-100 bg-slate-50/50">
                    <div className="flex flex-col md:flex-row gap-3">
                        <div className="flex-1 relative">
                            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                            <input
                                type="text"
                                placeholder="Cari nama atau NIS siswa..."
                                value={search}
                                onChange={(e) => {
                                    setSearch(e.target.value);
                                    setPage(1);
                                }}
                                className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-200 focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all font-black text-sm text-slate-900 bg-white placeholder:text-slate-300"
                            />
                        </div>
                        <select
                            value={jenisFilter}
                            onChange={(e) => {
                                setJenisFilter(e.target.value as any);
                                setPage(1);
                            }}
                            className="px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all font-black text-[10px] uppercase tracking-widest text-slate-700 bg-white appearance-none cursor-pointer"
                        >
                            <option value="">Semua Jenis Tabungan</option>
                            <option value="UMUM">Tabungan Umum</option>
                            <option value="WAJIB_BERLIAN">Tabungan Wajib Berlian</option>
                        </select>
                    </div>
                </div>

                {/* Table Section */}
                {isLoading ? (
                    <div className="p-16 text-center">
                        <div className="animate-spin h-8 w-8 border-4 border-emerald-500 border-t-transparent rounded-full mx-auto" />
                        <p className="mt-4 text-slate-400 font-extrabold uppercase tracking-[0.2em] text-[10px] italic">Memvalidasi Data...</p>
                    </div>
                ) : error ? (
                    <div className="p-16 text-center text-rose-500 font-bold">
                        Gagal memuat data: {(error as Error).message}
                    </div>
                ) : (
                    <>
                        <div className="overflow-x-auto px-1.5 pb-2">
                            <table className="w-full border-separate border-spacing-y-1.5">
                                <thead>
                                    <tr>
                                        <th className="px-5 py-3 text-left text-[9px] font-black text-slate-400 uppercase tracking-widest">Siswa & NIS</th>
                                        <th className="px-5 py-3 text-left text-[9px] font-black text-slate-400 uppercase tracking-widest">Kelas / Jenjang</th>
                                        <th className="px-5 py-3 text-left text-[9px] font-black text-slate-400 uppercase tracking-widest">Jenis Akun</th>
                                        <th className="px-5 py-3 text-right text-[9px] font-black text-slate-400 uppercase tracking-widest">Saldo</th>
                                    </tr>
                                </thead>
                                <tbody className="space-y-1.5">
                                    {tabunganData?.data?.length === 0 ? (
                                        <tr>
                                            <td colSpan={4} className="px-5 py-16 text-center">
                                                <PiggyBank size={32} className="mx-auto text-slate-200 mb-2" />
                                                <p className="text-slate-400 font-black tracking-[0.2em] uppercase text-[9px] italic">Data tabungan kosong</p>
                                            </td>
                                        </tr>
                                    ) : (
                                        tabunganData?.data?.map((item: any) => (
                                            <tr
                                                key={item.id}
                                                className="group hover:scale-[1.005] transition-all cursor-pointer"
                                                onClick={() => onSelectTabungan?.(item)}
                                            >
                                                <td className="px-5 py-4 bg-slate-50 border-y border-l border-slate-100 rounded-l-xl group-hover:border-emerald-200 group-hover:bg-emerald-50/50">
                                                    <div>
                                                        <p className="font-extrabold text-slate-900 leading-tight text-xs uppercase tracking-tight">{item.siswa?.namaLengkap}</p>
                                                        <p className="text-[9px] font-bold font-mono text-slate-400 mt-0.5 tracking-tighter uppercase">{item.siswa?.nis}</p>
                                                    </div>
                                                </td>
                                                <td className="px-5 py-4 bg-slate-50 border-y border-slate-100 group-hover:border-emerald-200 group-hover:bg-emerald-50/50">
                                                    <div>
                                                        <p className="font-bold text-slate-700 text-xs">{item.siswa?.rombel?.nama || '-'}</p>
                                                        <p className="text-[8px] font-black text-emerald-600 tracking-tighter uppercase leading-none">{item.siswa?.rombel?.jenjang?.kode || ''}</p>
                                                    </div>
                                                </td>
                                                <td className="px-5 py-4 bg-slate-50 border-y border-slate-100 group-hover:border-emerald-200 group-hover:bg-emerald-50/50">
                                                    <span className={`px-2.5 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest italic border ${item.jenis === 'UMUM'
                                                        ? 'bg-emerald-50 border-emerald-100 text-emerald-700'
                                                        : 'bg-amber-50 border-amber-100 text-amber-700'
                                                        }`}>
                                                        {item.jenis === 'UMUM' ? 'Umum' : 'Wajib Berlian'}
                                                    </span>
                                                </td>
                                                <td className="px-5 py-4 bg-slate-50 border-y border-r border-slate-100 rounded-r-xl text-right group-hover:border-emerald-200 group-hover:bg-emerald-50/50">
                                                    <p className="font-black text-slate-900 text-sm tracking-tight font-mono">
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
                            <div className="p-4 sm:p-5 border-t border-slate-100 bg-slate-50/30 flex flex-col md:flex-row items-center justify-between gap-3">
                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest bg-white px-3 py-1.5 rounded-lg border border-slate-100 shadow-sm italic">
                                    Records {((page - 1) * 20) + 1}-{Math.min(page * 20, tabunganData.meta.total)} <span className="text-slate-200 mx-1">/</span> Total {tabunganData.meta.total}
                                </p>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => setPage(p => Math.max(1, p - 1))}
                                        disabled={page === 1}
                                        className="px-4 py-2 rounded-lg border border-slate-200 bg-white text-[9px] font-black uppercase tracking-widest text-slate-600 disabled:opacity-30 disabled:grayscale transition-all hover:bg-slate-50 active:scale-95 shadow-sm"
                                    >
                                        Prev
                                    </button>
                                    <div className="flex items-center px-3 bg-white border border-slate-200 rounded-lg text-[9px] font-black text-emerald-600 shadow-sm italic">
                                        Page {page} of {tabunganData.meta.totalPages}
                                    </div>
                                    <button
                                        onClick={() => setPage(p => p + 1)}
                                        disabled={page >= tabunganData.meta.totalPages}
                                        className="px-4 py-2 rounded-lg border border-slate-200 bg-white text-[9px] font-black uppercase tracking-widest text-slate-600 disabled:opacity-30 disabled:grayscale transition-all hover:bg-slate-50 active:scale-95 shadow-sm"
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
