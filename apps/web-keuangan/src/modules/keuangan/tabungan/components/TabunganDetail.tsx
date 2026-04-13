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
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 text-center">
                <div className="animate-spin h-8 w-8 border-4 border-emerald-500 border-t-transparent rounded-full mx-auto" />
                <p className="mt-4 text-slate-500 font-extrabold uppercase tracking-widest text-[9px] italic">Memuat Detail...</p>
            </div>
        );
    }

    if (!tabungan) {
        return (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 text-center text-rose-500 font-black uppercase text-[10px] tracking-widest">
                Data Tidak Ditemukan
            </div>
        );
    }

    const isUmum = tabungan.jenis === 'UMUM';

    return (
        <>
        <div className="bg-white rounded-xl border border-slate-200 shadow-xl overflow-hidden animate-in slide-in-from-right-8 duration-500">
                {/* Header */}
                <div className={`p-4 relative overflow-hidden ${isUmum ? 'bg-linear-to-r from-emerald-600 to-teal-700' : 'bg-linear-to-r from-amber-500 to-orange-600'} text-white`}>
                    <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 blur-2xl rounded-full -mr-12 -mt-12" />

                    <div className="flex justify-between items-start relative z-10">
                        <div className="space-y-0.5">
                            <p className="text-[8px] font-black uppercase tracking-[0.2em] text-white/50 leading-none mb-1 italic">
                                {isUmum ? 'TABUNGAN UMUM' : 'MANDATORY ACCOUNT'}
                            </p>
                            <h2 className="text-base font-black tracking-tight leading-none uppercase italic">{tabungan.siswa?.namaLengkap}</h2>
                            <p className="text-[9px] font-black font-mono text-white/40 uppercase tracking-tighter italic">NIS: {tabungan.siswa?.nis}</p>
                        </div>
                        {onClose && (
                            <button
                                onClick={onClose}
                                className="p-1 bg-white/10 hover:bg-white/20 rounded-lg transition-all border border-white/10"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        )}
                    </div>

                    <div className="mt-4 relative z-10">
                        <p className="text-[8px] font-black uppercase tracking-[0.2em] text-white/40 leading-none italic">SALDO TERSEDIA</p>
                        <p className="text-xl font-black mt-1 tracking-tight font-mono italic">{formatCurrency(tabungan.saldo)}</p>
                    </div>

                    {/* Action Buttons - Only for UMUM */}
                    {isUmum && (
                        <div className="mt-4 flex gap-2 relative z-10">
                            <button
                                onClick={() => setShowSetorModal(true)}
                                className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-white text-emerald-700 rounded-lg font-black text-[9px] uppercase tracking-widest shadow-lg hover:scale-[1.02] active:scale-95 transition-all italic"
                            >
                                <ArrowDownCircle size={12} />
                                SETOR
                            </button>
                            <button
                                onClick={() => setShowTarikModal(true)}
                                className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-emerald-500/30 text-white rounded-lg font-black text-[9px] uppercase tracking-widest border border-white/20 hover:bg-white/20 hover:scale-[1.02] active:scale-95 transition-all backdrop-blur-sm italic"
                            >
                                <ArrowUpCircle size={12} />
                                TARIK
                            </button>
                        </div>
                    )}
                </div>

                {/* Transaction History Section */}
                <div className="p-4">
                    <div className="flex items-center gap-2 mb-3">
                        <HistoryIcon size={12} className="text-slate-400" />
                        <h3 className="text-[8px] font-black text-slate-400 uppercase tracking-[0.2em] leading-none italic">AKTIVITAS TERKINI</h3>
                    </div>

                    <div className="space-y-2">
                        {transaksiData?.data?.length === 0 ? (
                            <div className="py-6 text-center bg-slate-50 border border-slate-100/50 rounded-lg">
                                <Clock size={16} className="text-slate-200 mx-auto mb-1.5" />
                                <p className="text-[8px] font-black text-slate-300 uppercase tracking-widest italic">BELUM ADA AKTIVITAS</p>
                            </div>
                        ) : (
                            transaksiData?.data?.map((trx: any) => (
                                <div key={trx.id} className="group p-2.5 bg-slate-50 hover:bg-white hover:ring-1 hover:ring-slate-100 rounded-lg transition-all border border-transparent">
                                    <div className="flex items-center justify-between mb-1.5">
                                        <div className="flex items-center gap-2">
                                            <div className={`p-1 rounded shadow-sm ${trx.tipe === 'SETOR'
                                                ? 'bg-emerald-100 text-emerald-600'
                                                : 'bg-rose-100 text-rose-600'
                                                }`}>
                                                {trx.tipe === 'SETOR'
                                                    ? <ArrowDownCircle size={10} />
                                                    : <ArrowUpCircle size={10} />
                                                }
                                            </div>
                                            <div>
                                                <p className="text-[9px] font-black text-slate-900 uppercase tracking-tight leading-none mb-0.5 italic">
                                                    {trx.tipe === 'SETOR' ? 'SETORAN' : 'PENARIKAN'}
                                                </p>
                                                <p className="text-[7px] font-black text-slate-400 font-mono tracking-tighter uppercase leading-none italic">{formatDate(trx.createdAt).toUpperCase()}</p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className={`text-[11px] font-black font-mono tracking-tighter italic leading-none ${trx.tipe === 'SETOR' ? 'text-emerald-600' : 'text-rose-600'
                                                }`}>
                                                {trx.tipe === 'SETOR' ? '+' : '-'}{formatCurrency(trx.nominal)}
                                            </p>
                                            {trx.tipe === 'TARIK' && trx.potonganAdmin > 0 && (
                                                <p className="text-[7px] font-black text-slate-400 uppercase tracking-tighter leading-none mt-0.5 italic">
                                                    ADM: {formatCurrency(trx.potonganAdmin)}
                                                </p>
                                            )}
                                        </div>
                                    </div>

                                    <div className="mt-2 pt-1.5 border-t border-slate-200/50 flex items-center justify-between">
                                        <p className="text-[8px] font-black text-slate-400 italic truncate max-w-[65%] leading-none lowercase tracking-tight">"{trx.keterangan || 'tanpa catatan'}"</p>
                                        <div className="flex items-center gap-1 text-[7px] font-black text-slate-400 uppercase bg-white px-1.5 py-0.5 rounded border border-slate-100 shadow-xs leading-none italic">
                                            <User size={8} />
                                            {trx.createdByUser?.namaLengkap?.split(' ')[0].toUpperCase()}
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
