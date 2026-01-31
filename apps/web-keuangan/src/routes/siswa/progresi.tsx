
import { createFileRoute } from '@tanstack/react-router';
import { SiswaPromotion } from '~/modules/siswa/components/promotion/SiswaPromotion';
import { Toaster } from 'sonner';
import { GraduationCap } from 'lucide-react';

export const Route = createFileRoute('/siswa/progresi')({
    component: ProgresiPage,
});

function ProgresiPage() {
    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <Toaster position="top-right" richColors />

            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-linear-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-blue-200">
                        <GraduationCap size={24} />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900">Kenaikan & Pemindahan Kelas</h1>
                        <p className="text-slate-500 text-sm">Proses batch untuk memindahkan siswa antar rombel atau kenaikan kelas.</p>
                    </div>
                </div>
            </div>

            <SiswaPromotion />
        </div>
    );
}
