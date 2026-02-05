import { createFileRoute } from '@tanstack/react-router';
import { Info } from 'lucide-react';

export const Route = createFileRoute('/keuangan/tabungan/')({
    component: TabunganIndex,
});

function TabunganIndex() {
    return (
        <div className="bg-slate-50 border border-dashed border-slate-200 rounded-3xl p-8 flex flex-col items-center justify-center text-center space-y-4 animate-in fade-in duration-700">
            <div className="p-4 bg-white rounded-full text-slate-400 shadow-sm">
                <Info size={32} />
            </div>
            <div>
                <h3 className="text-slate-900 font-bold">Pilih Siswa</h3>
                <p className="text-slate-500 text-sm">Klik salah satu siswa di daftar sebelah kiri untuk melihat rincian tabungan.</p>
            </div>
        </div>
    );
}
