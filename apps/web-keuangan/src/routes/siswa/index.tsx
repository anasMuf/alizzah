
import { useState } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { SiswaTable } from '~/modules/siswa/components/SiswaTable';
import { SiswaForm } from '~/modules/siswa/components/form/SiswaForm';
import { useSiswaList, SiswaWithRelations } from '~/modules/siswa/hooks/useSiswaList';
import { useSiswaMutations } from '~/modules/siswa/hooks/useSiswaMutations';
import { useRombelList } from '~/modules/master/rombel/hooks/useRombelList';
import { useAtomValue } from 'jotai';
import { tokenAtom } from '~/stores/auth';
import { Plus, Search, Filter } from 'lucide-react';
import { Toaster } from 'sonner';
import { ConfirmDialog } from '~/components/ui/ConfirmDialog';
import { useDebounce } from 'use-debounce';

export const Route = createFileRoute('/siswa/')({
    component: SiswaPage,
});

function SiswaPage() {
    const token = useAtomValue(tokenAtom);

    // State
    const [page, setPage] = useState(1);
    const [search, setSearch] = useState('');
    const [debouncedSearch] = useDebounce(search, 500);
    const [rombelFilter, setRombelFilter] = useState('');
    const [statusFilter, setStatusFilter] = useState('AKTIF');

    const [isFormOpen, setIsFormOpen] = useState(false);
    const [selectedItem, setSelectedItem] = useState<SiswaWithRelations | null>(null);
    const [deleteId, setDeleteId] = useState<string | null>(null);

    // Data Hooks
    const limit = 10;
    const { data: siswaData, isLoading: isLoadingSiswa, refetch } = useSiswaList({
        page,
        limit,
        search: debouncedSearch,
        rombelId: rombelFilter,
        status: statusFilter
    });
    const { data: rombelList } = useRombelList(undefined);
    const { deleteMutation } = useSiswaMutations(token);

    const handleCreate = () => {
        setSelectedItem(null);
        setIsFormOpen(true);
    };

    const handleEdit = (item: SiswaWithRelations) => {
        setSelectedItem(item);
        setIsFormOpen(true);
    };

    const handleDelete = async () => {
        if (deleteId) {
            await deleteMutation.mutateAsync(deleteId);
            setDeleteId(null);
            refetch(); // Ensure list updates
        }
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <Toaster position="top-right" richColors />

            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Data Siswa</h1>
                    <p className="text-slate-500 text-sm">Kelola data seluruh siswa, orang tua, dan status akademik.</p>
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-3">
                    <button
                        onClick={handleCreate}
                        className="w-full sm:w-auto flex items-center justify-center gap-2 bg-blue-600 text-white px-5 py-2.5 rounded-xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-200 font-bold active:scale-95"
                    >
                        <Plus size={20} />
                        <span>Tambah Siswa</span>
                    </button>
                </div>
            </div>

            {/* Toolbar: Search & Filters */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-4 items-center justify-between">
                <div className="relative w-full md:w-80">
                    <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Cari Nama / NIS / Ortu..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium"
                    />
                </div>

                <div className="flex items-center gap-3 w-full md:w-auto overflow-x-auto pb-2 md:pb-0">
                    <div className="relative min-w-[180px]">
                        <Filter size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <select
                            value={rombelFilter}
                            onChange={(e) => { setRombelFilter(e.target.value); setPage(1); }}
                            className="w-full pl-9 pr-8 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 appearance-none cursor-pointer hover:border-slate-300 transition-colors"
                        >
                            <option value="">Semua Kelas</option>
                            {rombelList?.map((r: any) => (
                                <option key={r.id} value={r.id}>{r.nama}</option>
                            ))}
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
                            <option value="CALON_SISWA">Calon Siswa</option>
                            <option value="CUTI">Cuti</option>
                            <option value="LULUS">Lulus</option>
                            <option value="KELUAR">Keluar</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* Table Content */}
            {isLoadingSiswa ? (
                <div className="flex items-center justify-center min-h-[400px]">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                </div>
            ) : (
                <>
                    <SiswaTable
                        data={(siswaData as any)?.data || []}
                        onEdit={handleEdit}
                        onDelete={setDeleteId}
                    />

                    {/* Pagination */}
                    {(siswaData as any)?.meta && (
                        <div className="flex items-center justify-between mt-4">
                            <p className="text-sm text-slate-500">
                                Menampilkan <span className="font-bold text-slate-900">{((page - 1) * limit) + 1}</span> - <span className="font-bold text-slate-900">{Math.min(page * limit, (siswaData as any).meta.total)}</span> dari <span className="font-bold text-slate-900">{(siswaData as any).meta.total}</span> data
                            </p>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => setPage(p => Math.max(1, p - 1))}
                                    disabled={page === 1}
                                    className="px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                >
                                    Sebelumnya
                                </button>
                                <button
                                    onClick={() => setPage(p => p + 1)}
                                    disabled={page >= ((siswaData as any).meta.totalPages || 1)}
                                    className="px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                >
                                    Selanjutnya
                                </button>
                            </div>
                        </div>
                    )}
                </>
            )}

            <SiswaForm
                isOpen={isFormOpen}
                onClose={() => setIsFormOpen(false)}
                initialData={selectedItem}
            />

            <ConfirmDialog
                isOpen={!!deleteId}
                onClose={() => setDeleteId(null)}
                onConfirm={handleDelete}
                title="Hapus Siswa"
                description="Apakah Anda yakin ingin menghapus data siswa ini? Data tagihan dan pembayaran mungkin akan terhapus atau menyebabkan error jika masih terkait."
                variant="danger"
                confirmText="Hapus Siswa"
                isLoading={deleteMutation.isPending}
            />
        </div>
    );
}
