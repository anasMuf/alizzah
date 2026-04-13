
import { formatCurrency } from '@alizzah/shared';
import { Calendar, Tag, AlertCircle, Info, CheckCircle2 } from 'lucide-react';

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
        <div className="space-y-3 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Student Info Card */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-4">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-600 text-white rounded-xl flex items-center justify-center font-black text-base shadow-lg shadow-blue-200">
                        {siswa.namaLengkap.charAt(0)}
                    </div>
                    <div>
                        <h2 className="text-base font-black text-slate-900 tracking-tight uppercase leading-none italic">{siswa.namaLengkap}</h2>
                        <div className="flex flex-wrap gap-1 mt-1.5">
                            <span className="px-1.5 py-0.5 bg-slate-100 text-slate-600 text-[8px] font-black rounded border border-slate-200 uppercase tracking-widest italic">{siswa.nis}</span>
                            <span className="px-1.5 py-0.5 bg-indigo-50 text-indigo-600 text-[8px] font-black rounded border border-indigo-100 uppercase tracking-widest italic">{siswa.rombel.nama}</span>
                            <span className="px-1.5 py-0.5 bg-emerald-50 text-emerald-600 text-[8px] font-black rounded border border-emerald-100 uppercase tracking-widest italic">{siswa.rombel.jenjang.nama}</span>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    <div className="bg-slate-900 p-3 rounded-lg text-white">
                        <div className="flex items-center gap-2 text-slate-400 text-[8px] font-black uppercase tracking-[0.2em] mb-1 leading-none italic">
                            <Tag size={10} /> TUNGGAKAN AKHIR
                        </div>
                        <div className="text-lg font-black font-mono italic tracking-tighter">{formatCurrency(totalDebt)}</div>
                    </div>
                    <div className="bg-blue-50 p-3 rounded-lg border border-blue-100">
                        <div className="flex items-center gap-2 text-blue-600 text-[8px] font-black uppercase tracking-[0.2em] mb-1 leading-none italic">
                            <AlertCircle size={10} /> STATUS TAGIHAN
                        </div>
                        <div className="text-sm font-black text-blue-900 uppercase italic tracking-tight">{unpaidTagihan.length} Periode Aktif</div>
                    </div>
                </div>
            </div>

            {/* Unpaid Invoices List */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-3">
                <div className="flex items-center justify-between px-1">
                    <div className="flex items-center gap-2">
                        <Calendar className="text-blue-600" size={14} />
                        <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest italic leading-none">RINCIAN TUNGGAKAN</h3>
                    </div>
                    <Info size={12} className="text-slate-300" />
                </div>

                <div className="space-y-1.5">
                    {unpaidTagihan.length === 0 ? (
                        <div className="p-6 text-center bg-emerald-50 border border-emerald-100 rounded-lg space-y-1.5">
                            <div className="p-1.5 bg-white text-emerald-500 rounded-full w-fit mx-auto shadow-sm">
                                <CheckCircle2 size={16} />
                            </div>
                            <p className="text-xs font-black text-emerald-900 uppercase tracking-widest italic">SUDAH LUNAS</p>
                            <p className="text-[9px] text-emerald-600 italic font-bold uppercase tracking-tight">Tidak ada tagihan tertunggak.</p>
                        </div>
                    ) : (
                        unpaidTagihan.map((tagihan: any) => (
                            <div
                                key={tagihan.id}
                                className="flex items-center justify-between p-2 bg-slate-50 border border-slate-100 rounded-lg hover:border-blue-200 hover:bg-white transition-all group"
                            >
                                <div className="flex items-center gap-2.5">
                                    <div className="w-7 h-7 bg-white border border-slate-200 text-slate-400 rounded flex items-center justify-center font-black text-[9px] uppercase shadow-sm italic">
                                        {tagihan.periode.split('-')[1]}
                                    </div>
                                    <div>
                                        <div className="text-[10px] font-black text-slate-900 group-hover:text-blue-600 transition-colors uppercase leading-none mb-1 italic tracking-tight">
                                            {new Date(tagihan.periode).toLocaleDateString('id-ID', { month: 'long', year: 'numeric' }).toUpperCase()}
                                        </div>
                                        <div className="text-[8px] text-slate-400 font-black font-mono uppercase tracking-widest italic leading-none">
                                            {tagihan.kode} • JT: {new Date(tagihan.jatuhTempo).toLocaleDateString('id-ID')}
                                        </div>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className="text-xs font-black text-slate-900 font-mono tracking-tighter italic">{formatCurrency(tagihan.sisaTagihan)}</div>
                                    <div className="text-[7px] text-rose-500 font-black uppercase tracking-widest italic leading-none mt-0.5">{tagihan.status}</div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}
