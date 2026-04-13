import { createFileRoute, Link } from '@tanstack/react-router';
import { useDaycareDetail } from '~/modules/daycare/hooks/useDaycareList';
import { useBillingList } from '~/modules/keuangan/billing/hooks/useBillingList';
import { ChevronLeft, User, Home, Calendar, Phone, CreditCard, Receipt, Clock, CheckCircle } from 'lucide-react';
import { formatCurrency } from '@alizzah/shared';
import { useAtomValue } from 'jotai';
import { tokenAtom } from '~/stores/auth';

export const Route = createFileRoute('/daycare/$id')({
    component: DaycareDetailPage,
});

function DaycareDetailPage() {
    const { id } = Route.useParams();
    const token = useAtomValue(tokenAtom);
    const { data: peserta, isLoading } = useDaycareDetail(id);
    const { data: tagihans, isLoading: isLoadingTagihan } = useBillingList(token, {
        pesertaDaycareId: id,
        limit: 50
    });

    if (isLoading) return <div className="p-8 text-center animate-pulse">Memuat...</div>;
    if (!peserta) return <div className="p-8 text-center text-red-500">Peserta tidak ditemukan</div>;

    const isInternal = !!peserta.siswaId;

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex items-center gap-4">
                <Link to="/daycare" className="p-2 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors">
                    <ChevronLeft size={20} />
                </Link>
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Detail Peserta Daycare</h1>
                    <p className="text-slate-500 text-sm">Informasi lengkap peserta program daycare.</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Profile Card */}
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                    <div className="flex flex-col items-center py-4 bg-slate-50 rounded-xl">
                        <div className={`w-20 h-20 rounded-full ${isInternal ? 'bg-indigo-100 text-indigo-600' : 'bg-orange-100 text-orange-600'} flex items-center justify-center mb-3`}>
                            {isInternal ? <User size={40} /> : <Home size={40} />}
                        </div>
                        <h2 className="text-lg font-bold text-slate-900 text-center px-4">{peserta.namaLengkap || peserta.siswa?.namaLengkap}</h2>
                        <span className={`mt-2 px-3 py-1 rounded-full text-xs font-bold uppercase ${isInternal ? 'bg-indigo-100 text-indigo-700' : 'bg-orange-100 text-orange-700'}`}>
                            {isInternal ? 'Siswa Alizzah' : 'Anak Luar'}
                        </span>
                    </div>

                    <div className="space-y-3">
                        <InfoRow icon={Calendar} label="Tanggal Mulai" value={new Date(peserta.tanggalMulai).toLocaleDateString('id-ID')} />
                        <InfoRow icon={CreditCard} label="Mode Paket" value={peserta.modeDaycare} />
                        <InfoRow icon={Phone} label="No. HP Ortu" value={peserta.siswa?.noHpOrtu || peserta.noHpOrtu || '-'} />
                    </div>
                </div>

                {/* Additional Info */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                        <h3 className="font-bold text-slate-900 mb-4 pb-2 border-b border-slate-100">Informasi Tambahan</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                            <div>
                                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Jenjang Setara</label>
                                <p className="font-bold text-slate-700">{peserta.jenjangSetara.nama}</p>
                            </div>
                            <div>
                                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Nama Orang Tua</label>
                                <p className="font-bold text-slate-700">{peserta.siswa?.namaOrtu || peserta.namaOrtu || '-'}</p>
                            </div>
                            <div className="sm:col-span-2">
                                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Catatan</label>
                                <p className="text-slate-600">{peserta.catatan || 'Tidak ada catatan khusus.'}</p>
                            </div>
                        </div>
                    </div>
                    
                    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                        <h3 className="font-bold text-slate-900 mb-4 pb-2 border-b border-slate-100 flex items-center gap-2">
                            <Receipt size={18} className="text-blue-600" />
                            Riwayat Tagihan
                        </h3>
                        
                        {isLoadingTagihan ? (
                            <div className="p-8 text-center animate-pulse text-slate-400">Memuat riwayat...</div>
                        ) : !tagihans?.data || tagihans.data.length === 0 ? (
                            <div className="p-8 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200">
                                <p className="text-slate-500 text-sm italic">Belum ada riwayat tagihan untuk peserta ini.</p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-sm">
                                    <thead>
                                        <tr className="border-b border-slate-100">
                                            <th className="py-3 px-2 font-bold text-slate-400 uppercase text-[10px]">Tgl</th>
                                            <th className="py-3 px-2 font-bold text-slate-400 uppercase text-[10px]">Invoice</th>
                                            <th className="py-3 px-2 font-bold text-slate-400 uppercase text-[10px]">Total</th>
                                            <th className="py-3 px-2 font-bold text-slate-400 uppercase text-[10px]">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-50">
                                        {tagihans.data.map((t: any) => (
                                            <tr key={t.id} className="hover:bg-slate-50/50 transition-colors">
                                                <td className="py-3 px-2 text-slate-600">
                                                    {new Date(t.tanggalTagihan).toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit' })}
                                                </td>
                                                <td className="py-3 px-2">
                                                    <div className="font-mono text-[10px] font-bold text-slate-500">{t.kode}</div>
                                                </td>
                                                <td className="py-3 px-2 font-bold text-slate-900">
                                                    {formatCurrency(t.sisaTagihan)}
                                                </td>
                                                <td className="py-3 px-2">
                                                    {t.status === 'PAID' ? (
                                                        <span className="text-emerald-600"><CheckCircle size={14} /></span>
                                                    ) : (
                                                        <span className="text-orange-500"><Clock size={14} /></span>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

function InfoRow({ icon: Icon, label, value }: any) {
    return (
        <div className="flex items-center justify-between py-2 border-b border-slate-50 last:border-0">
            <div className="flex items-center gap-3 text-slate-500">
                <Icon size={16} />
                <span className="text-sm font-medium">{label}</span>
            </div>
            <span className="text-sm font-bold text-slate-700">{value}</span>
        </div>
    );
}
