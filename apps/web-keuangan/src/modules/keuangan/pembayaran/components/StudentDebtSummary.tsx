
import { formatCurrency } from '@alizzah/shared';
import { Calendar, Tag, AlertCircle, Info } from 'lucide-react';

interface StudentDebtSummaryProps {
    data: any | null;
    isLoading: boolean;
}

export function StudentDebtSummary({ data, isLoading }: StudentDebtSummaryProps) {
    if (isLoading) {
        return (
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm animate-pulse space-y-5">
                <div className="h-6 bg-slate-100 rounded-lg w-1/3" />
                <div className="flex gap-3">
                    <div className="w-14 h-14 bg-slate-100 rounded-xl" />
                    <div className="flex-1 space-y-2">
                        <div className="h-4 bg-slate-100 rounded w-1/2" />
                        <div className="h-3 bg-slate-100 rounded w-1/4" />
                    </div>
                </div>
                <div className="space-y-3">
                    <div className="h-10 bg-slate-50 rounded-xl" />
                    <div className="h-10 bg-slate-50 rounded-xl" />
                </div>
            </div>
        );
    }

    if (!data) return null;

    const { siswa, totalDebt, unpaidTagihan } = data;

    return (
        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Student Info Card */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-5">
                <div className="flex items-center gap-4">
                    <div className="w-14 h-14 bg-blue-600 text-white rounded-2xl flex items-center justify-center font-black text-xl shadow-xl shadow-blue-200">
                        {siswa.namaLengkap.charAt(0)}
                    </div>
                    <div>
                        <h2 className="text-lg font-black text-slate-900 tracking-tight uppercase leading-tight">{siswa.namaLengkap}</h2>
                        <div className="flex flex-wrap gap-1.5 mt-1.5">
                            <span className="px-2 py-0.5 bg-slate-100 text-slate-600 text-[9px] font-black rounded-md border border-slate-200 uppercase tracking-widest">{siswa.nis}</span>
                            <span className="px-2 py-0.5 bg-indigo-50 text-indigo-600 text-[9px] font-black rounded-md border border-indigo-100 uppercase tracking-widest">{siswa.rombel.nama}</span>
                            <span className="px-2 py-0.5 bg-emerald-50 text-emerald-600 text-[9px] font-black rounded-md border border-emerald-100 uppercase tracking-widest">{siswa.rombel.jenjang.nama}</span>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="bg-slate-900 p-4 rounded-xl text-white">
                        <div className="flex items-center gap-2 text-slate-400 text-[9px] font-black uppercase tracking-widest mb-1 leading-none">
                            <Tag size={10} /> Tunggakan Akhir
                        </div>
                        <div className="text-xl font-black font-mono">{formatCurrency(totalDebt)}</div>
                    </div>
                    <div className="bg-blue-50 p-4 rounded-xl border border-blue-100">
                        <div className="flex items-center gap-2 text-blue-600 text-[9px] font-black uppercase tracking-widest mb-1 leading-none">
                            <AlertCircle size={10} /> Status Tagihan
                        </div>
                        <div className="text-base font-black text-blue-900">{unpaidTagihan.length} Periode Aktif</div>
                    </div>
                </div>
            </div>

            {/* Unpaid Invoices List */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                        <Calendar className="text-blue-600" size={18} />
                        <h3 className="text-base font-black text-slate-900 uppercase tracking-widest leading-none">Rincian Tunggakan</h3>
                    </div>
                    <Info size={14} className="text-slate-300" />
                </div>

                <div className="space-y-2.5">
                    {unpaidTagihan.length === 0 ? (
                        <div className="p-8 text-center bg-emerald-50 border border-emerald-100 rounded-xl space-y-2">
                            <div className="p-2 bg-white text-emerald-500 rounded-full w-fit mx-auto shadow-sm">
                                <Info size={20} />
                            </div>
                            <p className="text-sm font-black text-emerald-900 uppercase tracking-tight">Sudah Lunas</p>
                            <p className="text-[10px] text-emerald-600 italic font-medium leading-none">Tidak ada tagihan tertunggak.</p>
                        </div>
                    ) : (
                        unpaidTagihan.map((tagihan: any) => (
                            <div
                                key={tagihan.id}
                                className="flex items-center justify-between p-3.5 bg-slate-50 border border-slate-100 rounded-xl hover:border-blue-200 hover:bg-white transition-all group"
                            >
                                <div className="flex items-center gap-3.5">
                                    <div className="w-9 h-9 bg-white border border-slate-200 text-slate-600 rounded-lg flex items-center justify-center font-black text-[10px] uppercase shadow-sm">
                                        {tagihan.periode.split('-')[1]}
                                    </div>
                                    <div>
                                        <div className="text-xs font-extrabold text-slate-900 group-hover:text-blue-600 transition-colors uppercase leading-none mb-1">
                                            {new Date(tagihan.periode).toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })}
                                        </div>
                                        <div className="text-[9px] text-slate-400 font-black font-mono uppercase tracking-tighter italic leading-none">
                                            {tagihan.kode} • Jatuh Tempo: {new Date(tagihan.jatuhTempo).toLocaleDateString('id-ID')}
                                        </div>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className="text-sm font-black text-slate-900 font-mono">{formatCurrency(tagihan.sisaTagihan)}</div>
                                    <div className="text-[8px] text-rose-500 font-black uppercase tracking-widest italic">{tagihan.status}</div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}
