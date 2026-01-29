import { createFileRoute } from '@tanstack/react-router';
import { TahunAjaranTable } from '~/modules/master/tahun-ajaran';

export const Route = createFileRoute('/master/tahun-ajaran')({
    component: TahunAjaranPage,
});

function TahunAjaranPage() {
    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Master Tahun Ajaran</h1>
                    <p className="text-slate-500 text-sm">Kelola periode tahun ajaran aktif dan riwayat periode.</p>
                </div>
                <button className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-all shadow-md shadow-blue-100 font-medium">
                    + Tambah Tahun Ajaran
                </button>
            </div>

            <TahunAjaranTable />
        </div>
    );
}
