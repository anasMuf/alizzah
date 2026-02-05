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
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
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
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Kas Utama Card */}
                <div className="bg-linear-to-br from-blue-600 to-indigo-700 p-8 rounded-[2.5rem] text-white shadow-2xl shadow-blue-200 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 blur-3xl rounded-full -mr-32 -mt-32 group-hover:bg-white/20 transition-all duration-700" />

                    <div className="relative z-10 flex flex-col h-full justify-between space-y-12">
                        <div className="flex justify-between items-start">
                            <div className="p-3 bg-white/20 backdrop-blur-xl rounded-2xl border border-white/20">
                                <Wallet size={24} />
                            </div>
                            <span className="bg-white/20 backdrop-blur-xl px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border border-white/20">
                                Physical Cash
                            </span>
                        </div>

                        <div>
                            <h3 className="text-blue-100/70 font-bold text-sm">Kas Utama (Operasional)</h3>
                            <p className="text-5xl font-black mt-2 tracking-tight">
                                {isLoadingSummary ? '...' : formatCurrency(summary?.kasUtama?.saldo || 0)}
                            </p>
                            <div className="flex items-center gap-2 mt-4 text-blue-100 text-sm font-medium">
                                <TrendingUp size={16} />
                                <span>{summary?.kasUtama?.jumlahTransaksi || 0} Transaksi tercatat hari ini</span>
                            </div>
                        </div>

                        <div className="flex gap-3">
                            <Link
                                to="/keuangan/kas/rekonsiliasi"
                                search={{ kasId: summary?.kasUtama?.id }}
                                className="flex-1 bg-white text-blue-600 py-4 rounded-2xl font-black text-xs text-center hover:bg-blue-50 transition-all active:scale-95 shadow-lg shadow-blue-900/20"
                            >
                                TUTUP KAS (CLOSING)
                            </Link>
                            <button
                                onClick={() => setModalType('MASUK')}
                                className="p-4 bg-white/20 backdrop-blur-xl border border-white/20 rounded-2xl hover:bg-white/30 transition-all"
                            >
                                <Plus size={20} />
                            </button>
                        </div>
                    </div>
                </div>

                {/* Berangkas Card */}
                <div className="bg-slate-900 p-8 rounded-[2.5rem] text-white shadow-2xl shadow-slate-200 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 blur-3xl rounded-full -mr-32 -mt-32 group-hover:bg-blue-500/20 transition-all duration-700" />

                    <div className="relative z-10 flex flex-col h-full justify-between space-y-12">
                        <div className="flex justify-between items-start">
                            <div className="p-3 bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10">
                                <CircleDollarSign size={24} className="text-blue-400" />
                            </div>
                            <span className="bg-white/5 backdrop-blur-xl px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border border-white/10 text-slate-400">
                                Safe Vault
                            </span>
                        </div>

                        <div>
                            <h3 className="text-slate-400 font-bold text-sm">Berangkas (Simpanan)</h3>
                            <p className="text-5xl font-black mt-2 tracking-tight">
                                {isLoadingSummary ? '...' : formatCurrency(summary?.berangkas?.saldo || 0)}
                            </p>
                            <div className="flex items-center gap-2 mt-4 text-slate-500 text-sm font-medium">
                                <AlertCircle size={16} className="text-amber-500" />
                                <span>Dana cadangan operasional sekolah</span>
                            </div>
                        </div>

                        <div className="flex gap-3">
                            <button
                                onClick={() => setModalType('TRANSFER')}
                                className="flex-1 bg-blue-600 text-white py-4 rounded-2xl font-black text-xs hover:bg-blue-700 transition-all active:scale-95 shadow-xl shadow-blue-900/40"
                            >
                                TRANSFER KE KASIR
                            </button>
                            <button
                                onClick={() => setModalType('TRANSFER')}
                                className="p-4 bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl hover:bg-white/10 transition-all"
                            >
                                <Plus size={20} />
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Action Buttons */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <button
                    onClick={() => setModalType('MASUK')}
                    className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex items-center gap-4 hover:shadow-md transition-all group"
                >
                    <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl group-hover:scale-110 transition-transform">
                        <ArrowDownLeft size={24} />
                    </div>
                    <div className="text-left">
                        <p className="font-black text-slate-900">Catat Uang Masuk</p>
                        <p className="text-xs text-slate-400 font-medium tracking-tight">Donasi, bunga bank, dll</p>
                    </div>
                    <ChevronRight size={18} className="ml-auto text-slate-300" />
                </button>

                <button
                    onClick={() => setModalType('KELUAR')}
                    className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex items-center gap-4 hover:shadow-md transition-all group"
                >
                    <div className="p-3 bg-rose-50 text-rose-600 rounded-2xl group-hover:scale-110 transition-transform">
                        <ArrowUpRight size={24} />
                    </div>
                    <div className="text-left">
                        <p className="font-black text-slate-900">Catat Uang Keluar</p>
                        <p className="text-xs text-slate-400 font-medium tracking-tight">Listrik, internet, gaji, dll</p>
                    </div>
                    <ChevronRight size={18} className="ml-auto text-slate-300" />
                </button>

                <button
                    onClick={() => setModalType('TRANSFER')}
                    className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex items-center gap-4 hover:shadow-md transition-all group"
                >
                    <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl group-hover:scale-110 transition-transform">
                        <ArrowRightLeft size={24} />
                    </div>
                    <div className="text-left">
                        <p className="font-black text-slate-900">Mutasi Kas & Brankas</p>
                        <p className="text-xs text-slate-400 font-medium tracking-tight">Perpindahan dana internal</p>
                    </div>
                    <ChevronRight size={18} className="ml-auto text-slate-300" />
                </button>
            </div>

            {/* Recent Transactions Preview */}
            <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm">
                <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-slate-900 text-white rounded-2xl shadow-lg shadow-slate-200">
                            <History size={20} />
                        </div>
                        <h2 className="text-xl font-black text-slate-900">Aktivitas Terbaru</h2>
                    </div>
                    <Link
                        to="/keuangan/kas/mutasi"
                        className="text-xs font-black text-blue-600 hover:underline uppercase tracking-widest"
                    >
                        Lihat Semua
                    </Link>
                </div>

                <div className="space-y-4">
                    {isLoadingTransactions
                        ? Array(5).fill(0).map((_, i) => <div key={i} className="h-16 bg-slate-50 animate-pulse rounded-2xl" />)
                        : transactions?.data?.length === 0
                            ? <div className="py-12 text-center text-slate-400 font-medium">Belum ada transaksi hari ini</div>
                            : transactions?.data?.map((trx: any) => (
                                <div key={trx.id} className="flex items-center justify-between p-4 bg-slate-50/50 hover:bg-slate-50 transition-all rounded-2xl group border border-transparent hover:border-slate-100">
                                    <div className="flex items-center gap-4">
                                        <div className={`p-3 rounded-xl ${trx.tipeTransaksi === 'MASUK' ? 'bg-emerald-100 text-emerald-700' :
                                            trx.tipeTransaksi === 'KELUAR' ? 'bg-rose-100 text-rose-700' :
                                                'bg-blue-100 text-blue-700'
                                            }`}>
                                            {trx.tipeTransaksi === 'MASUK' ? <ArrowDownLeft size={18} /> :
                                                trx.tipeTransaksi === 'KELUAR' ? <ArrowUpRight size={18} /> :
                                                    <ArrowRightLeft size={18} />}
                                        </div>
                                        <div>
                                            <p className="font-bold text-slate-900">{trx.keterangan || 'Tanpa keterangan'}</p>
                                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                                                {trx.kas?.nama} • {new Date(trx.createdAt).toLocaleTimeString()}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className={`font-black text-lg ${trx.tipeTransaksi === 'MASUK' ? 'text-emerald-600' :
                                            trx.tipeTransaksi === 'KELUAR' ? 'text-rose-600' :
                                                'text-slate-900'
                                            }`}>
                                            {trx.tipeTransaksi === 'KELUAR' ? '-' : ''}{formatCurrency(trx.nominal)}
                                        </p>
                                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
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
