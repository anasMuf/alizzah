import { useState } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { JenjangGrid } from '~/modules/master/jenjang';
import { JenjangForm } from '~/modules/master/jenjang/components/form/JenjangForm';
import { Plus } from 'lucide-react';
import { Toaster } from 'sonner';

export const Route = createFileRoute('/master/jenjang')({
    component: JenjangPage,
});

function JenjangPage() {
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
        <div className="space-y-6 animate-in fade-in duration-500">
            <Toaster position="top-right" richColors />

            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Master Jenjang</h1>
                    <p className="text-slate-500 text-sm">Kelola tingkat pendidikan dan kelompok kelas.</p>
                </div>
                <button
                    onClick={handleCreate}
                    className="flex items-center justify-center gap-2 bg-blue-600 text-white px-5 py-2.5 rounded-xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-200 font-bold active:scale-95"
                >
                    <Plus size={20} />
                    <span>Tambah Jenjang</span>
                </button>
            </div>

            <JenjangGrid onEdit={handleEdit} />

            <JenjangForm
                isOpen={isFormOpen}
                onClose={() => setIsFormOpen(false)}
                initialData={selectedItem}
            />
        </div>
    );
}
