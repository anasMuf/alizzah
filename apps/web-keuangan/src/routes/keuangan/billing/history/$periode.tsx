import { useState, useMemo, useEffect } from 'react';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useAtomValue } from 'jotai';
import { tokenAtom } from '~/stores/auth';
import { TagihanListTable } from '~/modules/keuangan/billing/components/TagihanListTable';
import { TagihanDetailModal } from '~/modules/keuangan/billing/components/TagihanDetailModal';
import { useInfiniteBillingList } from '~/modules/keuangan/billing/hooks';
import { useRombelList } from '~/modules/master/rombel/hooks/useRombelList';

export const Route = createFileRoute('/keuangan/billing/history/$periode')({
    component: BillingDetailPage,
});

function BillingDetailPage() {
    const token = useAtomValue(tokenAtom);
    const navigate = useNavigate();
    const { periode } = Route.useParams();

    const [selectedInvoice, setSelectedInvoice] = useState<any>(null);
    const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

    // Detail View Filters
    const [search, setSearch] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState<string | null>(null);
    const [rombelFilter, setRombelFilter] = useState<string | null>(null);

    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(search);
        }, 500);
        return () => clearTimeout(timer);
    }, [search]);

    const { data: rombelList } = useRombelList();

    const {
        data: infiniteListData,
        isLoading: loadingList,
        fetchNextPage,
        hasNextPage,
        isFetchingNextPage
    } = useInfiniteBillingList(token, {
        periode: periode,
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
        <div className="max-w-6xl mx-auto animate-in fade-in zoom-in-95 duration-500">
            <TagihanListTable
                data={flatListData}
                isLoading={loadingList}
                periode={periode}
                search={search}
                onSearchChange={setSearch}
                status={statusFilter}
                onStatusChange={setStatusFilter}
                selectedRombel={rombelFilter}
                onRombelChange={setRombelFilter}
                rombelList={rombelList}
                onBack={() => navigate({ to: '/keuangan/billing/history' })}
                onViewInvoice={(item) => {
                    setSelectedInvoice(item);
                    setIsDetailModalOpen(true);
                }}
                onDownload={() => console.log('Download all')}
                hasNextPage={hasNextPage}
                onLoadMore={() => fetchNextPage()}
                isFetchingNextPage={isFetchingNextPage}
            />

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
