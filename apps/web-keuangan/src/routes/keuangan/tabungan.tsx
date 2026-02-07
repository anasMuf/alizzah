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
        <div className="p-0 sm:p-6 md:p-8 max-w-[1400px] mx-auto space-y-6 sm:space-y-8 pb-24">
            {/* Page Header */}
            <div className="px-4 sm:px-0 flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="flex items-center gap-3 sm:gap-4">
                    <div className="p-3 sm:p-4 bg-emerald-100 text-emerald-600 rounded-2xl sm:rounded-3xl shadow-sm border border-emerald-200">
                        <PiggyBank className="h-6 w-6 sm:h-8 sm:w-8" />
                    </div>
                    <div>
                        <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">Tabungan Siswa</h1>
                        <p className="text-sm sm:text-base text-slate-500 font-medium mt-0.5 sm:mt-1">Pengelolaan Dana Simpanan & Tabungan Wajib Siswa.</p>
                    </div>
                </div>
            </div>

            {/* Main Content with Nested Detail */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
                <div className="lg:col-span-2">
                    <TabunganList
                        onSelectTabungan={(t) => navigate({ to: '/keuangan/tabungan/$tabunganId', params: { tabunganId: t.id } })}
                    />
                </div>
                <div className="lg:col-span-1 sticky top-8">
                    <Outlet />
                </div>
            </div>
        </div>
    );
}
