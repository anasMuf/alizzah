import { useState } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { DaycareTable } from '~/modules/daycare/components/DaycareTable';
import { DaycareForm } from '~/modules/daycare/components/DaycareForm';
import { useDaycareList, PesertaWithRelations } from '~/modules/daycare/hooks/useDaycareList';
import { useDaycareMutations } from '~/modules/daycare/hooks/useDaycareMutations';
import { useJenjangList } from '~/modules/master/jenjang/hooks/useJenjangList';
import { useAtomValue } from 'jotai';
import { tokenAtom } from '~/stores/auth';
import { Plus, Search, FileSpreadsheet, Clock } from 'lucide-react';
import { Link } from '@tanstack/react-router';
import { Toaster } from 'sonner';
import { ConfirmDialog } from '~/components/ui/ConfirmDialog';
import { useDebounce } from 'use-debounce';
import { client } from '@alizzah/api-client';

export const Route = createFileRoute('/daycare/')({
    component: DaycarePage,
});

function DaycarePage() {
    const token = useAtomValue(tokenAtom);

    // State
    const [page, setPage] = useState(1);
    const [search, setSearch] = useState('');
    const [debouncedSearch] = useDebounce(search, 500);
    const [modeFilter, setModeFilter] = useState('');
    const [statusFilter, setStatusFilter] = useState('AKTIF');
    const [jenjangFilter, setJenjangFilter] = useState('');

    const [isFormOpen, setIsFormOpen] = useState(false);
    const [selectedItem, setSelectedItem] = useState<PesertaWithRelations | null>(null);
    const [deactivateId, setDeactivateId] = useState<string | null>(null);

    // Data Hooks
    const limit = 10;
    const { data: daycareData, isLoading, refetch } = useDaycareList({
        page,
        limit,
        search: debouncedSearch,
        mode: modeFilter,
        status: statusFilter,
        jenjangSetaraId: jenjangFilter
    });
    
    const { data: jenjangList } = useJenjangList(token);
    const { deactivateMutation } = useDaycareMutations(token);

    const handleCreate = () => {
        setSelectedItem(null);
        setIsFormOpen(true);
    };

    const handleEdit = (item: PesertaWithRelations) => {
        setSelectedItem(item);
        setIsFormOpen(true);
    };

    const handleDeactivate = async () => {
        if (deactivateId) {
            await deactivateMutation.mutateAsync(deactivateId);
            setDeactivateId(null);
            refetch();
        }
    };

    const handleExport = async () => {
        try {
            if (!token) return;
            // @ts-ignore
            const res = await client.keuangan.daycare.export.$get(
                {},
                { headers: { Authorization: `Bearer ${token}` } }
            );
            if (!res.ok) throw new Error('Export failed');
            
            const blob = await res.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `data-peserta-daycare-${new Date().toISOString().split('T')[0]}.xlsx`;
            document.body.appendChild(a);
            a.click();
            a.remove();
        } catch (err) {
            console.error(err);
        }
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <Toaster position="top-right" richColors />

            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Manajemen Daycare</h1>
                    <p className="text-slate-500 text-sm">Kelola peserta daycare (Internal/Eksternal) dan penagihan harian.</p>
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-3">
                    <button
                        onClick={handleExport}
                        className="w-full sm:w-auto flex items-center justify-center gap-2 bg-white text-slate-700 border border-slate-200 px-5 py-2.5 rounded-xl hover:bg-slate-50 transition-all font-bold active:scale-95"
                    >
                        <FileSpreadsheet size={18} className="text-green-600" />
                        <span>Export</span>
                    </button>
                    <Link
                        to="/daycare/harian"
                        className="w-full sm:w-auto flex items-center justify-center gap-2 bg-orange-50 text-orange-700 border border-orange-100 px-5 py-2.5 rounded-xl hover:bg-orange-100 transition-all font-bold active:scale-95"
                    >
                        <Clock size={18} />
                        <span>Tagihan Harian</span>
                    </Link>
                    <button
                        onClick={handleCreate}
                        className="w-full sm:w-auto flex items-center justify-center gap-2 bg-blue-600 text-white px-5 py-2.5 rounded-xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-200 font-bold active:scale-95"
                    >
                        <Plus size={20} />
                        <span>Daftar Peserta</span>
                    </button>
                </div>
            </div>

            {/* Toolbar: Search & Filters */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-4 items-center justify-between">
                <div className="relative w-full md:w-80">
                    <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Cari Nama / Ortu / NIS..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium"
                    />
                </div>

                <div className="flex items-center gap-3 w-full md:w-auto overflow-x-auto pb-2 md:pb-0">
                    <div className="relative min-w-[150px]">
                        <select
                            value={jenjangFilter}
                            onChange={(e) => { setJenjangFilter(e.target.value); setPage(1); }}
                            className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 appearance-none cursor-pointer hover:border-slate-300 transition-colors"
                        >
                            <option value="">Semua Jenjang</option>
                            {jenjangList?.map((j: any) => (
                                <option key={j.id} value={j.id}>{j.nama}</option>
                            ))}
                        </select>
                    </div>

                    <div className="relative min-w-[150px]">
                        <select
                            value={modeFilter}
                            onChange={(e) => { setModeFilter(e.target.value); setPage(1); }}
                            className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 appearance-none cursor-pointer hover:border-slate-300 transition-colors"
                        >
                            <option value="">Semua Mode</option>
                            <option value="RUTIN">Rutin Bulanan</option>
                            <option value="HARIAN">Harian Lepas</option>
                        </select>
                    </div>

                    <div className="relative min-w-[140px]">
                        <select
                            value={statusFilter}
                            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
                            className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 appearance-none cursor-pointer hover:border-slate-300 transition-colors"
                        >
                            <option value="">Semua Status</option>
                            <option value="AKTIF">Aktif</option>
                            <option value="NONAKTIF">Nonaktif</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* Table Content */}
            {isLoading ? (
                <div className="flex items-center justify-center min-h-[300px]">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                </div>
            ) : (
                <>
                    <DaycareTable
                        data={daycareData?.data || []}
                        onEdit={handleEdit}
                        onDeactivate={setDeactivateId}
                    />

                    {/* Pagination */}
                    {daycareData?.meta && (
                        <div className="flex items-center justify-between mt-4">
                            <p className="text-sm text-slate-500">
                                Menampilkan <span className="font-bold text-slate-900">{((page - 1) * limit) + 1}</span> - <span className="font-bold text-slate-900">{Math.min(page * limit, daycareData.meta.total)}</span> dari <span className="font-bold text-slate-900">{daycareData.meta.total}</span> data
                            </p>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => setPage(p => Math.max(1, p - 1))}
                                    disabled={page === 1}
                                    className="px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium hover:bg-slate-50 disabled:opacity-50 transition-colors"
                                >
                                    Sebelumnya
                                </button>
                                <button
                                    onClick={() => setPage(p => p + 1)}
                                    disabled={page >= (daycareData.meta.totalPages || 1)}
                                    className="px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium hover:bg-slate-50 disabled:opacity-50 transition-colors"
                                >
                                    Selanjutnya
                                </button>
                            </div>
                        </div>
                    )}
                </>
            )}

            <DaycareForm
                isOpen={isFormOpen}
                onClose={() => setIsFormOpen(false)}
                initialData={selectedItem}
            />

            <ConfirmDialog
                isOpen={!!deactivateId}
                onClose={() => setDeactivateId(null)}
                onConfirm={handleDeactivate}
                title="Nonaktifkan Peserta"
                description="Apakah Anda yakin ingin menonaktifkan peserta ini dari program daycare?"
                variant="danger"
                confirmText="Nonaktifkan"
                isLoading={deactivateMutation.isPending}
            />
        </div>
    );
}
