import { useState } from 'react';
import { useAtomValue } from 'jotai';
import { ArrowUpCircle, ArrowDownCircle, Clock, User, X, History as HistoryIcon } from 'lucide-react';
import { formatCurrency, formatDate, parseCurrency, formatNumber } from '@alizzah/shared';
import { useTabunganDetail, useTabunganTransaksi } from '../hooks/useTabunganQueries';
import { useTabunganMutations } from '../hooks/useTabunganMutations';
import { tokenAtom } from '~/stores/auth';

interface TabunganDetailProps {
    tabunganId: string;
    onClose?: () => void;
}

// Helper to handle Decimal type from Prisma
const toNumber = (value: number | string | { toNumber?: () => number } | null | undefined): number => {
    if (value === null || value === undefined) return 0;
    if (typeof value === 'object' && value.toNumber) return value.toNumber();
    if (typeof value === 'string') return parseFloat(value) || 0;
    return value as number;
};

export function TabunganDetail({ tabunganId, onClose }: TabunganDetailProps) {
    const token = useAtomValue(tokenAtom);
    const [showSetorModal, setShowSetorModal] = useState(false);
    const [showTarikModal, setShowTarikModal] = useState(false);

    const { data: tabungan, isLoading } = useTabunganDetail(token, tabunganId);
    const { data: transaksiData } = useTabunganTransaksi(token, tabunganId);
    const { setor, tarik } = useTabunganMutations(token);

    if (isLoading) {
        return (
            <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm p-12 text-center">
                <div className="animate-spin h-10 w-10 border-4 border-emerald-500 border-t-transparent rounded-full mx-auto" />
                <p className="mt-4 text-slate-500 font-black uppercase tracking-widest text-[10px]">Memuat Detail...</p>
            </div>
        );
    }

    if (!tabungan) {
        return (
            <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm p-12 text-center text-rose-500 font-bold">
                Tabungan tidak ditemukan
            </div>
        );
    }

    const isUmum = tabungan.jenis === 'UMUM';

    return (
        <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-xl overflow-hidden animate-in slide-in-from-right-8 duration-500">
            {/* Header */}
            <div className={`p-8 relative overflow-hidden ${isUmum ? 'bg-linear-to-r from-emerald-600 to-teal-700' : 'bg-linear-to-r from-amber-500 to-orange-600'} text-white`}>
                <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 blur-3xl rounded-full -mr-12 -mt-12" />

                <div className="flex justify-between items-start relative z-10">
                    <div className="space-y-1">
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/70">
                            {isUmum ? 'Tabungan Umum (Deposit)' : 'Mandatory Account'}
                        </p>
                        <h2 className="text-2xl font-black tracking-tight">{tabungan.siswa?.namaLengkap}</h2>
                        <p className="text-xs font-bold text-white/60">NIS: {tabungan.siswa?.nis}</p>
                    </div>
                    {onClose && (
                        <button
                            onClick={onClose}
                            className="p-2.5 bg-white/10 hover:bg-white/20 rounded-2xl transition-all border border-white/10"
                        >
                            <X className="h-5 w-5" />
                        </button>
                    )}
                </div>

                <div className="mt-8 relative z-10">
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/50">Saldo Tersedia</p>
                    <p className="text-4xl font-black mt-1 tracking-tight">{formatCurrency(tabungan.saldo)}</p>
                </div>

                {/* Action Buttons - Only for UMUM */}
                {isUmum && (
                    <div className="mt-8 flex gap-3 relative z-10">
                        <button
                            onClick={() => setShowSetorModal(true)}
                            className="flex-1 flex items-center justify-center gap-2 py-4 bg-white text-emerald-700 rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg hover:scale-[1.02] active:scale-95 transition-all"
                        >
                            <ArrowDownCircle className="h-4 w-4" />
                            Setor
                        </button>
                        <button
                            onClick={() => setShowTarikModal(true)}
                            className="flex-1 flex items-center justify-center gap-2 py-4 bg-emerald-500/30 text-white rounded-2xl font-black text-xs uppercase tracking-widest border border-white/20 hover:bg-white/20 hover:scale-[1.02] active:scale-95 transition-all backdrop-blur-sm"
                        >
                            <ArrowUpCircle className="h-4 w-4" />
                            Tarik
                        </button>
                    </div>
                )}
            </div>

            {/* Transaction History */}
            <div className="p-8">
                <div className="flex items-center gap-2 mb-6">
                    <HistoryIcon className="h-4 w-4 text-slate-400" />
                    <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em]">Riwayat Transaksi</h3>
                </div>

                <div className="space-y-4">
                    {transaksiData?.data?.length === 0 ? (
                        <div className="py-12 text-center">
                            <Clock className="h-10 w-10 text-slate-100 mx-auto mb-3" />
                            <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Belum ada aktivitas</p>
                        </div>
                    ) : (
                        transaksiData?.data?.map((trx: any) => (
                            <div key={trx.id} className="group p-4 bg-slate-50 hover:bg-white hover:shadow-md hover:ring-1 hover:ring-slate-100 rounded-2xl transition-all border border-transparent">
                                <div className="flex items-center justify-between mb-3">
                                    <div className="flex items-center gap-3">
                                        <div className={`p-2 rounded-xl shadow-sm ${trx.tipe === 'SETOR'
                                            ? 'bg-emerald-100 text-emerald-600'
                                            : 'bg-rose-100 text-rose-600'
                                            }`}>
                                            {trx.tipe === 'SETOR'
                                                ? <ArrowDownCircle className="h-4 w-4" />
                                                : <ArrowUpCircle className="h-4 w-4" />
                                            }
                                        </div>
                                        <div>
                                            <p className="text-[11px] font-black text-slate-900 uppercase tracking-wider leading-none">
                                                {trx.tipe === 'SETOR' ? 'Setoran Masuk' : 'Penarikan Dana'}
                                            </p>
                                            <p className="text-[10px] font-bold text-slate-400 mt-1">{formatDate(trx.createdAt)}</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className={`text-sm font-black tracking-tight ${trx.tipe === 'SETOR' ? 'text-emerald-600' : 'text-rose-600'
                                            }`}>
                                            {trx.tipe === 'SETOR' ? '+' : '-'}{formatCurrency(trx.nominal)}
                                        </p>
                                        {trx.tipe === 'TARIK' && trx.potonganAdmin > 0 && (
                                            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">
                                                Adm: {formatCurrency(trx.potonganAdmin)}
                                            </p>
                                        )}
                                    </div>
                                </div>

                                <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between">
                                    <p className="text-[10px] font-bold text-slate-500 italic">"{trx.keterangan || 'Tanpa catatan'}"</p>
                                    <div className="flex items-center gap-1.5 text-[9px] font-black text-slate-400 uppercase bg-white px-2 py-0.5 rounded-full border border-slate-100 shadow-xs">
                                        <User className="h-2.5 w-2.5" />
                                        {trx.createdByUser?.namaLengkap?.split(' ')[0]}
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* Setor Modal */}
            {showSetorModal && (
                <SetorTarikModal
                    type="setor"
                    siswaId={tabungan.siswaId}
                    onClose={() => setShowSetorModal(false)}
                    onSubmit={(data) => {
                        setor.mutate(data, {
                            onSuccess: () => setShowSetorModal(false)
                        });
                    }}
                    isLoading={setor.isPending}
                />
            )}

            {/* Tarik Modal */}
            {showTarikModal && (
                <SetorTarikModal
                    type="tarik"
                    siswaId={tabungan.siswaId}
                    maxAmount={toNumber(tabungan.saldo)}
                    onClose={() => setShowTarikModal(false)}
                    onSubmit={(data) => {
                        tarik.mutate(data, {
                            onSuccess: () => setShowTarikModal(false)
                        });
                    }}
                    isLoading={tarik.isPending}
                />
            )}
        </div>
    );
}

interface SetorTarikModalProps {
    type: 'setor' | 'tarik';
    siswaId: string;
    maxAmount?: number;
    onClose: () => void;
    onSubmit: (data: any) => void;
    isLoading: boolean;
}

function SetorTarikModal({ type, siswaId, maxAmount, onClose, onSubmit, isLoading }: SetorTarikModalProps) {
    const [nominal, setNominal] = useState('');
    const [keterangan, setKeterangan] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const numNominal = parseCurrency(nominal);
        if (numNominal <= 0) return;

        onSubmit({
            siswaId,
            nominal: numNominal,
            keterangan: keterangan || undefined,
            ...(type === 'setor' ? { jenis: 'UMUM' } : {})
        });
    };

    const numNominal = parseCurrency(nominal);
    const adminFee = type === 'tarik' ? numNominal * 0.025 : 0;
    const netAmount = type === 'tarik' ? numNominal - adminFee : numNominal;

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
                <div className="p-6 border-b">
                    <h3 className="text-lg font-semibold">
                        {type === 'setor' ? 'Setor Tabungan' : 'Tarik Tabungan'}
                    </h3>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                            Nominal
                        </label>
                        <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">Rp</span>
                            <input
                                type="text"
                                value={nominal}
                                onChange={(e) => setNominal(formatNumber(e.target.value))}
                                placeholder="0"
                                className="w-full pl-10 pr-4 py-3 border rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-lg font-semibold"
                                autoFocus
                            />
                        </div>
                        {type === 'tarik' && maxAmount !== undefined && (
                            <p className="text-xs text-slate-500 mt-1">
                                Saldo tersedia: {formatCurrency(maxAmount)}
                            </p>
                        )}
                    </div>

                    {type === 'tarik' && numNominal > 0 && (
                        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 space-y-1">
                            <div className="flex justify-between text-sm">
                                <span className="text-amber-700">Nominal Tarik</span>
                                <span className="font-medium">{formatCurrency(numNominal)}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-amber-700">Potongan Admin (2.5%)</span>
                                <span className="font-medium text-red-600">-{formatCurrency(adminFee)}</span>
                            </div>
                            <div className="flex justify-between text-sm pt-2 border-t border-amber-200">
                                <span className="text-amber-800 font-semibold">Diterima</span>
                                <span className="font-bold text-emerald-600">{formatCurrency(netAmount)}</span>
                            </div>
                        </div>
                    )}

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                            Keterangan (Opsional)
                        </label>
                        <input
                            type="text"
                            value={keterangan}
                            onChange={(e) => setKeterangan(e.target.value)}
                            placeholder="Catatan transaksi..."
                            className="w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                        />
                    </div>

                    <div className="flex gap-3 pt-4">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 py-2.5 border border-slate-300 rounded-lg font-medium text-slate-700 hover:bg-slate-50 transition-colors"
                        >
                            Batal
                        </button>
                        <button
                            type="submit"
                            disabled={isLoading || numNominal <= 0 || (type === 'tarik' && maxAmount !== undefined && numNominal > maxAmount)}
                            className={`flex-1 py-2.5 rounded-lg font-medium text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${type === 'setor'
                                ? 'bg-emerald-600 hover:bg-emerald-700'
                                : 'bg-amber-600 hover:bg-amber-700'
                                }`}
                        >
                            {isLoading ? 'Memproses...' : type === 'setor' ? 'Setor' : 'Tarik'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
