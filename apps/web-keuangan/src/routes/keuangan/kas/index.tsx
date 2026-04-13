import { createFileRoute, Link } from '@tanstack/react-router';
import { useAtomValue } from 'jotai';
import { tokenAtom } from '~/stores/auth';
import {
    Wallet,
    ArrowUpRight,
    ArrowDownLeft,
    History,
    Plus,
    CircleDollarSign,
    ArrowRightLeft,
    ChevronRight,
    TrendingUp,
    AlertCircle
} from 'lucide-react';
import { useState } from 'react';
import { formatCurrency } from '@alizzah/shared';
import { AnimatePresence } from 'framer-motion';
import { useKasSummary, useKasTransaksi } from '~/modules/keuangan/kas/hooks/useKasQueries';
import { TransactionModal, TransferModal } from '~/modules/keuangan/kas/components/KasModals';

export const Route = createFileRoute('/keuangan/kas/')({
    component: KasOverviewPage,
});

function KasOverviewPage() {
    const token = useAtomValue(tokenAtom);
    const [modalType, setModalType] = useState<'MASUK' | 'KELUAR' | 'TRANSFER' | null>(null);

    const { data: summary, isLoading: isLoadingSummary } = useKasSummary(token);
    const { data: transactions, isLoading: isLoadingTransactions } = useKasTransaksi(token, { limit: 5 });

    return (
        <div className="space-y-5 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Modals */}
            <AnimatePresence>
                {(modalType === 'MASUK' || modalType === 'KELUAR') && (
                    <TransactionModal
                        isOpen={!!modalType}
                        onClose={() => setModalType(null)}
                        type={modalType as 'MASUK' | 'KELUAR'}
                    />
                )}
                {modalType === 'TRANSFER' && (
                    <TransferModal
                        isOpen={true}
                        onClose={() => setModalType(null)}
                    />
                )}
            </AnimatePresence>

            {/* Quick Stats Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Kas Utama Card */}
                <div className="bg-linear-to-br from-blue-600 to-indigo-700 p-6 rounded-2xl text-white shadow-xl shadow-blue-200/50 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-48 h-48 bg-white/10 blur-3xl rounded-full -mr-24 -mt-24 group-hover:bg-white/20 transition-all duration-700" />

                    <div className="relative z-10 flex flex-col h-full justify-between space-y-6">
                        <div className="flex justify-between items-start">
                            <div className="p-2 bg-white/20 backdrop-blur-xl rounded-xl border border-white/20">
                                <Wallet size={20} />
                            </div>
                            <span className="bg-white/20 backdrop-blur-xl px-3 py-1 rounded-md text-[9px] font-black uppercase tracking-widest border border-white/20 italic">
                                Physical Cash
                            </span>
                        </div>

                        <div>
                            <h3 className="text-blue-100/70 font-black text-[10px] uppercase tracking-widest leading-none">Kas Utama</h3>
                            <p className="text-3xl font-black mt-1 tracking-tight font-mono">
                                {isLoadingSummary ? '...' : formatCurrency(summary?.kasUtama?.saldo || 0)}
                            </p>
                            <div className="flex items-center gap-1.5 mt-2.5 text-blue-100 text-[10px] font-black uppercase tracking-tighter italic">
                                <TrendingUp size={12} />
                                <span>{summary?.kasUtama?.jumlahTransaksi || 0} Trx Hari Ini</span>
                            </div>
                        </div>

                        <div className="flex gap-2.5">
                            <Link
                                to="/keuangan/kas/rekonsiliasi"
                                search={{ kasId: summary?.kasUtama?.id }}
                                className="flex-1 bg-white text-blue-600 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest text-center hover:bg-blue-50 transition-all active:scale-95 shadow-lg shadow-blue-900/20"
                            >
                                Tutup Kas (Closing)
                            </Link>
                            <button
                                onClick={() => setModalType('MASUK')}
                                className="p-3 bg-white/20 backdrop-blur-xl border border-white/20 rounded-xl hover:bg-white/30 transition-all text-white active:scale-95"
                            >
                                <Plus size={18} />
                            </button>
                        </div>
                    </div>
                </div>

                {/* Berangkas Card */}
                <div className="bg-slate-900 p-6 rounded-2xl text-white shadow-xl shadow-slate-200/50 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-48 h-48 bg-blue-500/10 blur-3xl rounded-full -mr-24 -mt-24 group-hover:bg-blue-500/20 transition-all duration-700" />

                    <div className="relative z-10 flex flex-col h-full justify-between space-y-6">
                        <div className="flex justify-between items-start">
                            <div className="p-2 bg-white/5 backdrop-blur-xl rounded-xl border border-white/10">
                                <CircleDollarSign size={20} className="text-blue-400" />
                            </div>
                            <span className="bg-white/5 backdrop-blur-xl px-3 py-1 rounded-md text-[9px] font-black uppercase tracking-widest border border-white/10 text-slate-400 italic">
                                Safe Vault
                            </span>
                        </div>

                        <div>
                            <h3 className="text-slate-400 font-black text-[10px] uppercase tracking-widest leading-none">Brankas Sekolah</h3>
                            <p className="text-3xl font-black mt-1 tracking-tight font-mono">
                                {isLoadingSummary ? '...' : formatCurrency(summary?.berangkas?.saldo || 0)}
                            </p>
                            <div className="flex items-center gap-1.5 mt-2.5 text-slate-500 text-[10px] font-black uppercase tracking-tighter italic">
                                <AlertCircle size={12} className="text-amber-500" />
                                <span>Dana Cadangan Operasional</span>
                            </div>
                        </div>

                        <div className="flex gap-2.5">
                            <button
                                onClick={() => setModalType('TRANSFER')}
                                className="flex-1 bg-blue-600 text-white py-3 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-blue-700 transition-all active:scale-95 shadow-xl shadow-blue-900/40"
                            >
                                Transfer Ke Kasir
                            </button>
                            <button
                                onClick={() => setModalType('TRANSFER')}
                                className="p-3 bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl hover:bg-white/10 transition-all text-white active:scale-95"
                            >
                                <Plus size={18} />
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Action Buttons */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <button
                    onClick={() => setModalType('MASUK')}
                    className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-3 hover:shadow-md transition-all group active:scale-95"
                >
                    <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg group-hover:scale-110 transition-transform">
                        <ArrowDownLeft size={20} />
                    </div>
                    <div className="text-left">
                        <p className="font-extrabold text-slate-900 text-xs uppercase tracking-tight">Catat Uang Masuk</p>
                        <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest italic mt-0.5">Donasi, bunga bank, dll</p>
                    </div>
                    <ChevronRight size={14} className="ml-auto text-slate-300" />
                </button>

                <button
                    onClick={() => setModalType('KELUAR')}
                    className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-3 hover:shadow-md transition-all group active:scale-95"
                >
                    <div className="p-2 bg-rose-50 text-rose-600 rounded-lg group-hover:scale-110 transition-transform">
                        <ArrowUpRight size={20} />
                    </div>
                    <div className="text-left">
                        <p className="font-extrabold text-slate-900 text-xs uppercase tracking-tight">Catat Uang Keluar</p>
                        <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest italic mt-0.5">Operasional, gaji, dll</p>
                    </div>
                    <ChevronRight size={14} className="ml-auto text-slate-300" />
                </button>

                <button
                    onClick={() => setModalType('TRANSFER')}
                    className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-3 hover:shadow-md transition-all group active:scale-95"
                >
                    <div className="p-2 bg-blue-50 text-blue-600 rounded-lg group-hover:scale-110 transition-transform">
                        <ArrowRightLeft size={20} />
                    </div>
                    <div className="text-left">
                        <p className="font-extrabold text-slate-900 text-xs uppercase tracking-tight">Mutasi Internal</p>
                        <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest italic mt-0.5">Kasir ke brankas, dll</p>
                    </div>
                    <ChevronRight size={14} className="ml-auto text-slate-300" />
                </button>
            </div>

            {/* Recent Transactions Preview */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                <div className="flex items-center justify-between mb-5">
                    <div className="flex items-center gap-2.5">
                        <div className="p-2 bg-slate-900 text-white rounded-xl shadow-lg shadow-slate-200">
                            <History size={16} />
                        </div>
                        <h2 className="text-base font-black text-slate-900 uppercase tracking-tight leading-none">Aktivitas Terbaru</h2>
                    </div>
                    <Link
                        to="/keuangan/kas/mutasi"
                        className="text-[9px] font-black text-blue-600 hover:underline uppercase tracking-[0.2em] italic"
                    >
                        Lihat Semua
                    </Link>
                </div>

                <div className="space-y-2">
                    {isLoadingTransactions
                        ? Array(5).fill(0).map((_, i) => <div key={i} className="h-14 bg-slate-50 animate-pulse rounded-xl" />)
                        : transactions?.data?.length === 0
                            ? <div className="py-10 text-center text-slate-400 font-black uppercase tracking-widest text-[10px] italic">Belum ada transaksi hari ini</div>
                            : transactions?.data?.map((trx: any) => (
                                <div key={trx.id} className="flex items-center justify-between p-3 bg-slate-50/50 hover:bg-slate-50 transition-all rounded-xl group border border-transparent hover:border-slate-100">
                                    <div className="flex items-center gap-3">
                                        <div className={`p-2 rounded-lg ${trx.tipeTransaksi === 'MASUK' ? 'bg-emerald-100 text-emerald-700' :
                                            trx.tipeTransaksi === 'KELUAR' ? 'bg-rose-100 text-rose-700' :
                                                'bg-blue-100 text-blue-700'
                                            }`}>
                                            {trx.tipeTransaksi === 'MASUK' ? <ArrowDownLeft size={16} /> :
                                                trx.tipeTransaksi === 'KELUAR' ? <ArrowUpRight size={16} /> :
                                                    <ArrowRightLeft size={16} />}
                                        </div>
                                        <div>
                                            <p className="font-extrabold text-slate-900 text-xs leading-none uppercase tracking-tight mb-1">{trx.keterangan || 'Tanpa keterangan'}</p>
                                            <p className="text-[9px] text-slate-400 font-black uppercase tracking-widest italic leading-none">
                                                {trx.kas?.nama} • {new Date(trx.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className={`font-black text-sm font-mono leading-none mb-1 ${trx.tipeTransaksi === 'MASUK' ? 'text-emerald-600' :
                                            trx.tipeTransaksi === 'KELUAR' ? 'text-rose-600' :
                                                'text-slate-900'
                                            }`}>
                                            {trx.tipeTransaksi === 'KELUAR' ? '-' : ''}{formatCurrency(trx.nominal)}
                                        </p>
                                        <p className="text-[8px] text-slate-400 font-black uppercase tracking-widest leading-none italic">
                                            {trx.posPengeluaran?.nama || trx.sumberDana?.nama || 'General'}
                                        </p>
                                    </div>
                                </div>
                            ))
                    }
                </div>
            </div>
        </div>
    );
}
