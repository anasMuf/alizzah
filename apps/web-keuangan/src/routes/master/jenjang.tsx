import { createFileRoute } from '@tanstack/react-router';
import { JenjangGrid } from '~/modules/master/jenjang';

export const Route = createFileRoute('/master/jenjang')({
    component: JenjangPage,
});

function JenjangPage() {
    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Master Jenjang Pendidikan</h1>
                    <p className="text-slate-500 text-sm">Kelola daftar jenjang (SD, SMP, SMA) dan kelompoknya.</p>
                </div>
                <button className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-all shadow-md shadow-blue-100 font-medium">
                    + Tambah Jenjang
                </button>
            </div>

            <JenjangGrid />
        </div>
    );
}
