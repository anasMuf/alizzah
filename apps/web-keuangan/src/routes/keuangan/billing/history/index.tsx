import { useState, useMemo } from 'react';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useAtomValue } from 'jotai';
import { tokenAtom } from '~/stores/auth';
import { Search, Filter } from 'lucide-react';
import { BillingHistoryTable } from '~/modules/keuangan/billing/components/BillingHistoryTable';
import { useBillingSummary } from '~/modules/keuangan/billing/hooks';
import { useTahunAjaranList } from '~/modules/master/tahun-ajaran/hooks/useTahunAjaranList';

export const Route = createFileRoute('/keuangan/billing/history/')({
    component: BillingHistoryPage,
});

function BillingHistoryPage() {
    const token = useAtomValue(tokenAtom);
    const navigate = useNavigate();

    // History View Filters
    const [historySearch, setHistorySearch] = useState('');
    const [historyTA, setHistoryTA] = useState<string | null>(null);
    const [historyMonth, setHistoryMonth] = useState<string | null>(null);

    const { data: taList } = useTahunAjaranList(token);
    const { data: summary, isLoading: loadingSummary } = useBillingSummary(token, {
        search: historySearch,
        tahunAjaranId: historyTA || undefined
    });

    const filteredSummary = useMemo(() => {
        if (!summary) return [];
        if (!historyMonth) return summary;
        return summary.filter(s => s.periode.endsWith(`-${historyMonth}`));
    }, [summary, historyMonth]);

    return (
        <div className="max-w-5xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-6">
            {/* History Filters */}
            <div className="flex flex-wrap items-center gap-4 bg-white p-6 rounded-4xl border border-slate-200">
                <div className="flex items-center gap-3 mr-4">
                    <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                        <Filter size={18} />
                    </div>
                    <span className="text-sm font-bold text-slate-700">Filter Riwayat</span>
                </div>

                <div className="flex-1 min-w-[200px] relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                    <input
                        type="text"
                        placeholder="Cari periode (YYYY-MM)..."
                        value={historySearch}
                        onChange={(e) => setHistorySearch(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-blue-500/20 text-sm font-medium"
                    />
                </div>

                <select
                    value={historyTA || ''}
                    onChange={(e) => setHistoryTA(e.target.value || null)}
                    className="px-4 py-2.5 bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-blue-500/20 text-sm font-medium min-w-[150px]"
                >
                    <option value="">Semua Tahun Ajaran</option>
                    {taList?.map(ta => (
                        <option key={ta.id} value={ta.id}>{ta.nama}</option>
                    ))}
                </select>

                <select
                    value={historyMonth || ''}
                    onChange={(e) => setHistoryMonth(e.target.value || null)}
                    className="px-4 py-2.5 bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-blue-500/20 text-sm font-medium min-w-[120px]"
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
                onViewDetail={(periode) => navigate({ to: '/keuangan/billing/history/$periode', params: { periode } })}
            />
        </div>
    );
}
