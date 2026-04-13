import { useNavigate, Outlet } from '@tanstack/react-router';
import { createFileRoute } from '@tanstack/react-router';
import { PiggyBank } from 'lucide-react';
import { TabunganList } from '../../modules/keuangan/tabungan/components/TabunganList';

export const Route = createFileRoute('/keuangan/tabungan')({
    component: TabunganLayout,
});

function TabunganLayout() {
    const navigate = useNavigate();

    return (
        <div className="p-0 sm:p-0 max-w-[1400px] mx-auto space-y-3 pb-16">
            {/* Page Header */}
            <div className="px-4 sm:px-0 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div className="p-1.5 bg-emerald-100 text-emerald-600 rounded-lg shadow-sm border border-emerald-200">
                        <PiggyBank size={16} />
                    </div>
                    <div>
                        <h1 className="text-lg font-black text-slate-900 tracking-tight uppercase italic leading-none">Tabungan Siswa</h1>
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest leading-none mt-1 italic">Pengelolaan Dana Simpanan & Tabungan Wajib.</p>
                    </div>
                </div>
            </div>

            {/* Main Content with Nested Detail */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 items-start">
                <div className="lg:col-span-2">
                    <TabunganList
                        onSelectTabungan={(t) => navigate({ to: '/keuangan/tabungan/$tabunganId', params: { tabunganId: t.id } })}
                    />
                </div>
                <div className="lg:col-span-1 sticky top-2">
                    <Outlet />
                </div>
            </div>
        </div>
    );
}
