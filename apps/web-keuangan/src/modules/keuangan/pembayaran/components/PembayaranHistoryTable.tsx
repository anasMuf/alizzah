
import { formatCurrency } from '@alizzah/shared';
import { FileText, Eye, Printer, User, Clock, Search } from 'lucide-react';

interface PembayaranHistoryTableProps {
    data: any | undefined;
    isLoading: boolean;
    onViewReceipt: (pembayaran: any) => void;
}

export function PembayaranHistoryTable({ data, isLoading, onViewReceipt }: PembayaranHistoryTableProps) {
    return (
        <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-slate-50/50">
                            <th className="px-8 py-5 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Tgl / Kode</th>
                            <th className="px-6 py-5 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Siswa</th>
                            <th className="px-6 py-5 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Metode / Kasir</th>
                            <th className="px-6 py-5 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Total Bayar</th>
                            <th className="px-8 py-5 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-right">Aksi</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {isLoading ? (
                            [...Array(5)].map((_, i) => (
                                <tr key={i} className="animate-pulse">
                                    <td colSpan={5} className="px-8 py-6 h-16" />
                                </tr>
                            ))
                        ) : data?.data?.map((item: any) => (
                            <tr key={item.id} className="hover:bg-slate-50/50 transition-all group">
                                <td className="px-8 py-5">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
                                            <FileText size={16} />
                                        </div>
                                        <div>
                                            <div className="text-sm font-bold text-slate-900">{new Date(item.tanggal).toLocaleDateString('id-ID')}</div>
                                            <div className="text-[10px] text-slate-400 font-mono uppercase tracking-tighter">{item.kode}</div>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-6 py-5">
                                    <div className="text-sm font-bold text-slate-900 uppercase tracking-tight">{item.siswa.namaLengkap}</div>
                                    <div className="text-[10px] text-slate-400 font-medium">NIS: {item.siswa.nis}</div>
                                </td>
                                <td className="px-6 py-5">
                                    <div className="flex items-center gap-2">
                                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest ${item.metode === 'TUNAI' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'}`}>
                                            {item.metode}
                                        </span>
                                    </div>
                                    <div className="text-[10px] text-slate-400 mt-1 flex items-center gap-1">
                                        <User size={10} /> {item.kasir.namaLengkap}
                                    </div>
                                </td>
                                <td className="px-6 py-5">
                                    <div className="text-sm font-black text-slate-900">{formatCurrency(item.totalBayar)}</div>
                                    <div className="text-[9px] text-emerald-600 font-bold uppercase tracking-widest flex items-center gap-1">
                                        <Clock size={10} /> Sukses
                                    </div>
                                </td>
                                <td className="px-8 py-5 text-right">
                                    <div className="flex justify-end gap-2">
                                        <button
                                            onClick={() => onViewReceipt(item)}
                                            className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all"
                                            title="Cetak Kuitansi"
                                        >
                                            <Printer size={18} />
                                        </button>
                                        <button
                                            onClick={() => onViewReceipt(item)}
                                            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-all"
                                            title="Detail Alokasi"
                                        >
                                            <Eye size={18} />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {!isLoading && data?.data?.length === 0 && (
                <div className="p-20 text-center space-y-4">
                    <div className="p-4 bg-slate-50 text-slate-300 rounded-full w-fit mx-auto">
                        <Search size={48} />
                    </div>
                    <div>
                        <p className="text-lg font-bold text-slate-900">Belum Ada Transaksi</p>
                        <p className="text-sm text-slate-500 max-w-xs mx-auto">Riwayat pembayaran hari ini atau periode terpilih akan muncul di sini.</p>
                    </div>
                </div>
            )}
        </div>
    );
}
