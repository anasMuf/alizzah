import { useState, useMemo, useEffect } from 'react';
import { useAtomValue } from 'jotai';
import { tokenAtom } from '~/stores/auth';
import {
    Zap,
    Calendar,
    Search,
    Filter
} from 'lucide-react';

import { BillingGeneratorForm } from './BillingGeneratorForm';
import { BillingHistoryTable } from './BillingHistoryTable';
import { TagihanListTable } from './TagihanListTable';
import { TagihanDetailModal } from './TagihanDetailModal';
import { useBillingSummary, useInfiniteBillingList } from '../hooks';
import { useRombelList } from '~/modules/master/rombel/hooks/useRombelList';
import { useTahunAjaranList } from '~/modules/master/tahun-ajaran/hooks/useTahunAjaranList';

export function BillingGenerator() {
    const token = useAtomValue(tokenAtom);
    const [view, setView] = useState<'generator' | 'history' | 'detail'>('generator');
    const [selectedPeriode, setSelectedPeriode] = useState<string | null>(null);
    const [selectedInvoice, setSelectedInvoice] = useState<any>(null);
    const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

    // Detail View Filters
    const [search, setSearch] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');

    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(search);
        }, 500);
        return () => clearTimeout(timer);
    }, [search]);

    const [statusFilter, setStatusFilter] = useState<string | null>(null);
    const [rombelFilter, setRombelFilter] = useState<string | null>(null);

    // History View Filters
    const [historySearch, setHistorySearch] = useState('');
    const [historyTA, setHistoryTA] = useState<string | null>(null);
    const [historyMonth, setHistoryMonth] = useState<string | null>(null);

    const { data: taList } = useTahunAjaranList(token);
    const { data: summary, isLoading: loadingSummary } = useBillingSummary(token, {
        search: historySearch,
        tahunAjaranId: historyTA || undefined
    });

    // Client-side month filter for summary since it's an array of months
    const filteredSummary = useMemo(() => {
        if (!summary) return [];
        if (!historyMonth) return summary;
        return summary.filter(s => s.periode.endsWith(`-${historyMonth}`));
    }, [summary, historyMonth]);

    const { data: rombelList } = useRombelList();

    const {
        data: infiniteListData,
        isLoading: loadingList,
        fetchNextPage,
        hasNextPage,
        isFetchingNextPage
    } = useInfiniteBillingList(token, {
        periode: selectedPeriode || undefined,
        search: debouncedSearch || undefined,
        status: statusFilter || undefined,
        rombelId: rombelFilter || undefined,
        limit: 20
    });

    const flatListData = useMemo(() => {
        if (!infiniteListData) return [];
        const allItems = infiniteListData.pages.flatMap(page => page?.data || []);
        const seenIds = new Set();
        return allItems.filter(item => {
            if (seenIds.has(item.id)) return false;
            seenIds.add(item.id);
            return true;
        });
    }, [infiniteListData]);

    return (
        <div className="space-y-5 pb-20">
            {/* View Switching Header */}
            <div className="flex bg-slate-100 p-1 rounded-xl w-fit mx-auto shadow-sm border border-slate-200">
                <button
                    onClick={() => setView('generator')}
                    className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${view === 'generator' ? 'bg-white text-blue-600 shadow-md' : 'text-slate-500 hover:text-slate-700'}`}
                >
                    <Zap size={14} /> Generate Baru
                </button>
                <button
                    onClick={() => setView('history')}
                    className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${view !== 'generator' ? 'bg-white text-blue-600 shadow-md' : 'text-slate-500 hover:text-slate-700'}`}
                >
                    <Calendar size={14} /> Riwayat & Detail
                </button>
            </div>

            {view === 'generator' ? (
                <BillingGeneratorForm
                    onViewHistory={() => setView('history')}
                    onViewDetail={(periode) => {
                        setSelectedPeriode(periode);
                        setView('detail');
                    }}
                />
            ) : view === 'history' ? (
                <div className="max-w-5xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-4">
                    {/* History Filters */}
                    <div className="flex flex-wrap items-center gap-3 bg-white p-4 rounded-xl border border-slate-200">
                        <div className="flex items-center gap-2 mr-2">
                            <div className="p-1.5 bg-blue-50 text-blue-600 rounded-lg">
                                <Filter size={16} />
                            </div>
                            <span className="text-xs font-bold text-slate-700 uppercase tracking-tighter">Filter</span>
                        </div>

                        <div className="flex-1 min-w-[180px] relative">
                            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                            <input
                                type="text"
                                placeholder="Cari periode (YYYY-MM)..."
                                value={historySearch}
                                onChange={(e) => setHistorySearch(e.target.value)}
                                className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-100 rounded-lg focus:ring-2 focus:ring-blue-500/20 text-xs font-medium"
                            />
                        </div>

                        <select
                            value={historyTA || ''}
                            onChange={(e) => setHistoryTA(e.target.value || null)}
                            className="px-3 py-1.5 bg-slate-50 border border-slate-100 rounded-lg focus:ring-2 focus:ring-blue-500/20 text-xs font-bold text-slate-700 min-w-[140px]"
                        >
                            <option value="">Semua TA</option>
                            {taList?.map(ta => (
                                <option key={ta.id} value={ta.id}>{ta.nama}</option>
                            ))}
                        </select>

                        <select
                            value={historyMonth || ''}
                            onChange={(e) => setHistoryMonth(e.target.value || null)}
                            className="px-3 py-1.5 bg-slate-50 border border-slate-100 rounded-lg focus:ring-2 focus:ring-blue-500/20 text-xs font-bold text-slate-700 min-w-[110px]"
                        >
                            <option value="">Semua Bulan</option>
                            {['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12'].map(m => (
                                <option key={m} value={m}>
                                    {new Date(2024, parseInt(m) - 1).toLocaleDateString('id-ID', { month: 'long' })}
                                </option>
                            ))}
                        </select>
                    </div>

                    <BillingHistoryTable
                        data={filteredSummary}
                        isLoading={loadingSummary}
                        onViewDetail={(periode) => {
                            setSelectedPeriode(periode);
                            setView('detail');
                        }}
                    />
                </div>
            ) : (
                <div className="max-w-6xl mx-auto animate-in fade-in zoom-in-95 duration-500">
                    <TagihanListTable
                        data={flatListData}
                        isLoading={loadingList}
                        periode={selectedPeriode || ''}
                        search={search}
                        onSearchChange={setSearch}
                        status={statusFilter}
                        onStatusChange={setStatusFilter}
                        selectedRombel={rombelFilter}
                        onRombelChange={setRombelFilter}
                        rombelList={rombelList}
                        onBack={() => {
                            setSearch('');
                            setRombelFilter(null);
                            setStatusFilter(null);
                            setView('history');
                        }}
                        onViewInvoice={(item) => {
                            setSelectedInvoice(item);
                            setIsDetailModalOpen(true);
                        }}
                        onDownload={() => console.log('Download all')}
                        hasNextPage={hasNextPage}
                        onLoadMore={() => fetchNextPage()}
                        isFetchingNextPage={isFetchingNextPage}
                    />
                </div>
            )}

            <TagihanDetailModal
                isOpen={isDetailModalOpen}
                onClose={() => {
                    setIsDetailModalOpen(false);
                    setSelectedInvoice(null);
                }}
                tagihan={selectedInvoice}
            />
        </div>
    );
}
