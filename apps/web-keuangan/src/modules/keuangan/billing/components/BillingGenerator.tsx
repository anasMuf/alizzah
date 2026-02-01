
import { useState } from 'react';
import { useAtomValue } from 'jotai';
import { tokenAtom } from '~/stores/auth';
import {
    Zap,
    Calendar
} from 'lucide-react';

import { BillingGeneratorForm } from './BillingGeneratorForm';
import { BillingHistoryTable } from './BillingHistoryTable';
import { TagihanListTable } from './TagihanListTable';
import { TagihanDetailModal } from './TagihanDetailModal';
import { useBillingSummary, useBillingList } from '../hooks';
import { useRombelList } from '~/modules/master/rombel/hooks/useRombelList';

export function BillingGenerator() {
    const token = useAtomValue(tokenAtom);
    const [view, setView] = useState<'generator' | 'history' | 'detail'>('generator');
    const [selectedPeriode, setSelectedPeriode] = useState<string | null>(null);
    const [selectedInvoice, setSelectedInvoice] = useState<any>(null);
    const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState<string | null>(null);
    const [rombelFilter, setRombelFilter] = useState<string | null>(null);

    const { data: summary, isLoading: loadingSummary } = useBillingSummary(token);
    const { data: rombelList } = useRombelList();
    const { data: listData, isLoading: loadingList } = useBillingList(token, {
        periode: selectedPeriode || undefined,
        search: search || undefined,
        status: statusFilter || undefined,
        rombelId: rombelFilter || undefined,
        limit: 100
    });

    return (
        <div className="space-y-8 pb-20">
            {/* View Switching Header */}
            <div className="flex bg-slate-100 p-1.5 rounded-2xl w-fit mx-auto shadow-sm border border-slate-200">
                <button
                    onClick={() => setView('generator')}
                    className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${view === 'generator' ? 'bg-white text-blue-600 shadow-md' : 'text-slate-500 hover:text-slate-700'}`}
                >
                    <Zap size={16} /> Generate Baru
                </button>
                <button
                    onClick={() => setView('history')}
                    className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${view !== 'generator' ? 'bg-white text-blue-600 shadow-md' : 'text-slate-500 hover:text-slate-700'}`}
                >
                    <Calendar size={16} /> Riwayat & Detail
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
                <div className="max-w-5xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <BillingHistoryTable
                        data={summary}
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
                        data={listData?.data}
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
