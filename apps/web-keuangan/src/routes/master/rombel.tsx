
import { useState, useEffect } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { RombelGrid } from '~/modules/master/rombel/components/RombelGrid';
import { RombelForm } from '~/modules/master/rombel/components/form/RombelForm';
import { useTahunAjaranList } from '~/modules/master/tahun-ajaran/hooks/useTahunAjaranList';
import { useAtomValue } from 'jotai';
import { tokenAtom } from '~/stores/auth';
import { Plus, Filter } from 'lucide-react';
import { Toaster } from 'sonner';

export const Route = createFileRoute('/master/rombel')({
    component: RombelPage,
});

function RombelPage() {
    const token = useAtomValue(tokenAtom);
    const { data: tahunAjaranList } = useTahunAjaranList(token);

    // State
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [selectedItem, setSelectedItem] = useState<any>(null);
    const [selectedTahunAjaran, setSelectedTahunAjaran] = useState<string>('');

    // Set default selected Tahun Ajaran
    useEffect(() => {
        if (tahunAjaranList && !selectedTahunAjaran) {
            const active = tahunAjaranList.find((t: any) => t.isAktif);
            if (active) setSelectedTahunAjaran(active.id);
            else if (tahunAjaranList.length > 0) setSelectedTahunAjaran(tahunAjaranList[0].id);
        }
    }, [tahunAjaranList, selectedTahunAjaran]);

    const handleCreate = () => {
        setSelectedItem(null);
        setIsFormOpen(true);
    };

    const handleEdit = (item: any) => {
        setSelectedItem(item);
        setIsFormOpen(true);
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <Toaster position="top-right" richColors />

            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Data Rombel (Kelas)</h1>
                    <p className="text-slate-500 text-sm">Kelola pembagian kelas siswa per tahun ajaran.</p>
                </div>

                <div className="flex items-center gap-3">
                    {/* Tahun Ajaran Filter */}
                    <div className="relative">
                        <Filter size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <select
                            value={selectedTahunAjaran}
                            onChange={(e) => setSelectedTahunAjaran(e.target.value)}
                            className="pl-9 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 appearance-none min-w-[200px]"
                        >
                            <option value="">Semua Tahun Ajaran</option>
                            {tahunAjaranList?.map((ta: any) => (
                                <option key={ta.id} value={ta.id}>
                                    {ta.nama} {ta.isAktif ? '(Aktif)' : ''}
                                </option>
                            ))}
                        </select>
                    </div>

                    <button
                        onClick={handleCreate}
                        className="flex items-center justify-center gap-2 bg-blue-600 text-white px-5 py-2.5 rounded-xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-200 font-bold active:scale-95"
                    >
                        <Plus size={20} />
                        <span className="hidden sm:inline">Tambah Rombel</span>
                    </button>
                </div>
            </div>

            <RombelGrid
                tahunAjaranId={selectedTahunAjaran}
                onEdit={handleEdit}
            />

            <RombelForm
                isOpen={isFormOpen}
                onClose={() => setIsFormOpen(false)}
                initialData={selectedItem}
            />
        </div>
    );
}
