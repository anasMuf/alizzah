import { useState } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { TahunAjaranTable } from '~/modules/master/tahun-ajaran';
import { TahunAjaranForm } from '~/modules/master/tahun-ajaran/components/form/TahunAjaranForm';
import { Plus } from 'lucide-react';
import { Toaster } from 'sonner';

export const Route = createFileRoute('/master/tahun-ajaran')({
    component: TahunAjaranPage,
});

function TahunAjaranPage() {
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [selectedItem, setSelectedItem] = useState<any>(null);

    const handleCreate = () => {
        setSelectedItem(null);
        setIsFormOpen(true);
    };

    const handleEdit = (item: any) => {
        setSelectedItem(item);
        setIsFormOpen(true);
    };

    return (
        <div className="space-y-5 animate-in fade-in duration-500">
            <Toaster position="top-right" richColors />

            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-lg font-black text-slate-900 uppercase tracking-tight">Master Tahun Ajaran</h1>
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest italic leading-none">Kelola periode akademik sekolah aktif dan arsip.</p>
                </div>
                <button
                    onClick={handleCreate}
                    className="flex items-center justify-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-all shadow-lg shadow-blue-200 font-black text-xs uppercase tracking-widest active:scale-95 italic"
                >
                    <Plus size={16} />
                    <span>Tambah Tahun</span>
                </button>
            </div>

            <TahunAjaranTable onEdit={handleEdit} />

            <TahunAjaranForm
                isOpen={isFormOpen}
                onClose={() => setIsFormOpen(false)}
                initialData={selectedItem}
            />
        </div>
    );
}
