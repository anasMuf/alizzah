import { useState } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { PiggyBank } from 'lucide-react';
import { TabunganList } from '../../modules/keuangan/tabungan/components/TabunganList';
import { TabunganDetail } from '../../modules/keuangan/tabungan/components/TabunganDetail';

export const Route = createFileRoute('/keuangan/tabungan')({
    component: TabunganPage,
});

function TabunganPage() {
    const [selectedTabungan, setSelectedTabungan] = useState<any>(null);

    return (
        <div className="p-8 max-w-[1400px] mx-auto space-y-8 pb-24">
            {/* Page Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="flex items-center gap-4">
                    <div className="p-4 bg-emerald-100 text-emerald-600 rounded-2xl shadow-sm border border-emerald-200">
                        <PiggyBank className="h-8 w-8" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-black text-slate-900 tracking-tight">Tabungan Siswa</h1>
                        <p className="text-slate-500 font-medium mt-1">Pengelolaan Dana Simpanan & Tabungan Wajib Siswa.</p>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="space-y-8">
                {selectedTabungan ? (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
                        <div className="lg:col-span-2">
                            <TabunganList
                                onSelectTabungan={(t) => setSelectedTabungan(t)}
                            />
                        </div>
                        <div className="lg:col-span-1 sticky top-8">
                            <TabunganDetail
                                tabunganId={selectedTabungan.id}
                                onClose={() => setSelectedTabungan(null)}
                            />
                        </div>
                    </div>
                ) : (
                    <TabunganList
                        onSelectTabungan={(t) => setSelectedTabungan(t)}
                    />
                )}
            </div>
        </div>
    );
}
