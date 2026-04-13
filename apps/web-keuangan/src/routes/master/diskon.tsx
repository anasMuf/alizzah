
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
        <div className="space-y-3 animate-in fade-in duration-500">
            <Toaster position="top-right" richColors />

            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div className="p-1 bg-indigo-600 text-white rounded shadow-lg shadow-indigo-100 hidden sm:block shrink-0">
                        <Ticket size={14} />
                    </div>
                    <div>
                        <h1 className="text-base font-black text-slate-900 uppercase tracking-tight italic leading-none">Master Dispensasi Siswa</h1>
                        <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest leading-none mt-1.5 italic">Kelola jenis dispensasi dan beasiswa siswa</p>
                    </div>
                </div>
                <button
                    onClick={handleCreate}
                    className="flex items-center justify-center gap-2 bg-indigo-600 text-white px-3 py-1.5 rounded-lg hover:bg-black transition-all shadow-lg shadow-indigo-200 font-black text-[10px] uppercase tracking-widest active:scale-95 italic"
                >
                    <Plus size={14} />
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
