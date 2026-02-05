import { useState } from 'react';
import { useAtomValue } from 'jotai';
import { ArrowUpCircle, ArrowDownCircle, Clock, User, X, History as HistoryIcon } from 'lucide-react';
import { formatCurrency, formatDate } from '@alizzah/shared';
import { useTabunganDetail, useTabunganTransaksi } from '../hooks/useTabunganQueries';
import { useTabunganMutations } from '../hooks/useTabunganMutations';
import { tokenAtom } from '~/stores/auth';
import { AnimatePresence } from 'framer-motion';
import { SetorTarikModal } from './SetorTarikModal';

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
        <>
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

                {/* Transaction History Section */}
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
            </div>

            {/* Modal - Scoped to the whole screen again */}
            <AnimatePresence>
                {(showSetorModal || showTarikModal) && (
                    <SetorTarikModal
                        type={showSetorModal ? 'setor' : 'tarik'}
                        siswaId={tabungan.siswaId}
                        maxAmount={showTarikModal ? toNumber(tabungan.saldo) : undefined}
                        onClose={() => {
                            setShowSetorModal(false);
                            setShowTarikModal(false);
                        }}
                        onSubmit={(data) => {
                            const mutation = showSetorModal ? setor : tarik;
                            mutation.mutate(data, {
                                onSuccess: () => {
                                    setShowSetorModal(false);
                                    setShowTarikModal(false);
                                }
                            });
                        }}
                        isLoading={setor.isPending || tarik.isPending}
                    />
                )}
            </AnimatePresence>
        </>
    );
}
