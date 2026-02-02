
import { formatCurrency } from '@alizzah/shared';
import { Calendar, Tag, AlertCircle, Info } from 'lucide-react';

interface StudentDebtSummaryProps {
    data: any | null;
    isLoading: boolean;
}

export function StudentDebtSummary({ data, isLoading }: StudentDebtSummaryProps) {
    if (isLoading) {
        return (
            <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm animate-pulse space-y-6">
                <div className="h-8 bg-slate-100 rounded-lg w-1/3" />
                <div className="flex gap-4">
                    <div className="w-16 h-16 bg-slate-100 rounded-2xl" />
                    <div className="flex-1 space-y-2">
                        <div className="h-4 bg-slate-100 rounded w-1/2" />
                        <div className="h-3 bg-slate-100 rounded w-1/4" />
                    </div>
                </div>
                <div className="space-y-4">
                    <div className="h-12 bg-slate-50 rounded-2xl" />
                    <div className="h-12 bg-slate-50 rounded-2xl" />
                </div>
            </div>
        );
    }

    if (!data) return null;

    const { siswa, totalDebt, unpaidTagihan } = data;

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Student Info Card */}
            <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm space-y-6">
                <div className="flex items-center gap-6">
                    <div className="w-20 h-20 bg-blue-600 text-white rounded-4xl flex items-center justify-center font-black text-2xl shadow-xl shadow-blue-200">
                        {siswa.namaLengkap.charAt(0)}
                    </div>
                    <div>
                        <h2 className="text-2xl font-black text-slate-900 tracking-tight uppercase">{siswa.namaLengkap}</h2>
                        <div className="flex flex-wrap gap-2 mt-2">
                            <span className="px-3 py-1 bg-slate-100 text-slate-600 text-[10px] font-bold rounded-full border border-slate-200 uppercase tracking-widest">{siswa.nis}</span>
                            <span className="px-3 py-1 bg-indigo-50 text-indigo-600 text-[10px] font-bold rounded-full border border-indigo-100 uppercase tracking-widest">{siswa.rombel.nama}</span>
                            <span className="px-3 py-1 bg-emerald-50 text-emerald-600 text-[10px] font-bold rounded-full border border-emerald-100 uppercase tracking-widest">{siswa.rombel.jenjang.nama}</span>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-slate-900 p-6 rounded-3xl text-white">
                        <div className="flex items-center gap-2 text-slate-400 text-xs font-bold uppercase tracking-widest mb-1">
                            <Tag size={12} /> Total Tunggakan Akhir
                        </div>
                        <div className="text-2xl font-black">{formatCurrency(totalDebt)}</div>
                    </div>
                    <div className="bg-blue-50 p-6 rounded-3xl border border-blue-100">
                        <div className="flex items-center gap-2 text-blue-600 text-xs font-bold uppercase tracking-widest mb-1">
                            <AlertCircle size={12} /> Status Tagihan
                        </div>
                        <div className="text-xl font-black text-blue-900">{unpaidTagihan.length} Periode Belum Lunas</div>
                    </div>
                </div>
            </div>

            {/* Unpaid Invoices List */}
            <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm space-y-6">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Calendar className="text-blue-600" size={24} />
                        <h3 className="text-xl font-bold text-slate-900">Rincian Tunggakan</h3>
                    </div>
                    <Info size={18} className="text-slate-300" />
                </div>

                <div className="space-y-3">
                    {unpaidTagihan.length === 0 ? (
                        <div className="p-12 text-center bg-emerald-50 border border-emerald-100 rounded-[2rem space-y-3">
                            <div className="p-3 bg-white text-emerald-500 rounded-full w-fit mx-auto shadow-sm">
                                <Info size={24} />
                            </div>
                            <p className="font-bold text-emerald-900">Keren! Siswa ini sudah lunas.</p>
                            <p className="text-xs text-emerald-600 italic">Tidak ada tagihan tertunggak untuk dibayar.</p>
                        </div>
                    ) : (
                        unpaidTagihan.map((tagihan: any) => (
                            <div
                                key={tagihan.id}
                                className="flex items-center justify-between p-5 bg-slate-50 border border-slate-100 rounded-2xl hover:border-blue-200 hover:bg-white transition-all group"
                            >
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 bg-white border border-slate-200 text-slate-600 rounded-xl flex items-center justify-center font-bold text-xs uppercase shadow-sm">
                                        {tagihan.periode.split('-')[1]}
                                    </div>
                                    <div>
                                        <div className="text-sm font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
                                            Tagihan {new Date(tagihan.periode).toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })}
                                        </div>
                                        <div className="text-[10px] text-slate-400 font-medium font-mono uppercase tracking-tighter">
                                            {tagihan.kode} • Jatuh Tempo: {new Date(tagihan.jatuhTempo).toLocaleDateString('id-ID')}
                                        </div>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className="text-sm font-black text-slate-900">{formatCurrency(tagihan.sisaTagihan)}</div>
                                    <div className="text-[10px] text-rose-500 font-bold uppercase tracking-widest">{tagihan.status}</div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}
