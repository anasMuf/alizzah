
import { useState } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { DiskonTable } from '~/modules/master/diskon/components/DiskonTable';
import { DiskonForm } from '~/modules/master/diskon/components/DiskonForm';
import { AssignDiskonForm } from '~/modules/master/diskon/components/AssignDiskonForm';
import { DiskonSiswaModal } from '~/modules/master/diskon/components/DiskonSiswaModal';
import { useDiskonDetail } from '~/modules/master/diskon/hooks/useDiskonList';
import { useAtomValue } from 'jotai';
import { tokenAtom } from '~/stores/auth';
import { Plus, Ticket } from 'lucide-react';
import { Toaster } from 'sonner';

export const Route = createFileRoute('/master/diskon')({
    component: DiskonPage,
});

function DiskonPage() {
    const token = useAtomValue(tokenAtom);
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [isAssignOpen, setIsAssignOpen] = useState(false);
    const [isViewSiswaOpen, setIsViewSiswaOpen] = useState(false);
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [selectedItem, setSelectedItem] = useState<any>(null);

    // Fetch detail for modal
    const { data: diskonDetail } = useDiskonDetail(token, selectedId);

    const handleCreate = () => {
        setSelectedItem(null);
        setIsFormOpen(true);
    };

    const handleEdit = (item: any) => {
        setSelectedItem(item);
        setIsFormOpen(true);
    };

    const handleAssign = (item: any) => {
        setSelectedItem(item);
        setIsAssignOpen(true);
    };

    const handleViewSiswa = (item: any) => {
        setSelectedId(item.id);
        setIsViewSiswaOpen(true);
    };

    return (
        <div className="space-y-5 animate-in fade-in duration-500">
            <Toaster position="top-right" richColors />

            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-indigo-600 text-white rounded-xl shadow-lg shadow-indigo-100 hidden sm:block">
                        <Ticket size={20} />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold text-slate-900">Master Dispensasi Siswa</h1>
                        <p className="text-slate-500 text-xs font-medium italic">Kelola jenis dispensasi dan beasiswa siswa</p>
                    </div>
                </div>
                <button
                    onClick={handleCreate}
                    className="flex items-center justify-center gap-2 bg-indigo-600 text-white px-5 py-2.5 rounded-xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 font-bold active:scale-95 text-xs"
                >
                    <Plus size={18} />
                    <span>Tambah Dispensasi</span>
                </button>
            </div>

            <DiskonTable
                onEdit={handleEdit}
                onAssign={handleAssign}
                onViewSiswa={handleViewSiswa}
            />

            <DiskonForm
                isOpen={isFormOpen}
                onClose={() => setIsFormOpen(false)}
                initialData={selectedItem}
            />

            <AssignDiskonForm
                isOpen={isAssignOpen}
                onClose={() => setIsAssignOpen(false)}
                diskon={selectedItem}
            />

            <DiskonSiswaModal
                isOpen={isViewSiswaOpen}
                onClose={() => {
                    setIsViewSiswaOpen(false);
                    setSelectedId(null);
                }}
                diskon={diskonDetail}
            />
        </div>
    );
}
