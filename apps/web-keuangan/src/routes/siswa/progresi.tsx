
import { createFileRoute } from '@tanstack/react-router';
import { SiswaPromotion } from '~/modules/siswa/components/promotion/SiswaPromotion';
import { Toaster } from 'sonner';
import { GraduationCap } from 'lucide-react';

export const Route = createFileRoute('/siswa/progresi')({
    component: ProgresiPage,
});

function ProgresiPage() {
    return (
        <div className="space-y-5 animate-in fade-in slide-in-from-bottom-2 duration-500">
            <Toaster position="top-right" richColors />

            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-linear-to-br from-blue-600 to-indigo-700 flex items-center justify-center text-white shadow-lg shadow-blue-200 shrink-0">
                        <GraduationCap size={20} />
                    </div>
                    <div>
                        <h1 className="text-lg font-black text-slate-900 uppercase tracking-tight italic">Kenaikan & Pemindahan Kelas</h1>
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest leading-none italic">Proses batch untuk memindahkan siswa antar rombel atau kenaikan kelas.</p>
                    </div>
                </div>
            </div>

            <SiswaPromotion />
        </div>
    );
}
