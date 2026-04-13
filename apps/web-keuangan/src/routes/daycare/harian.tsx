import { useState } from 'react';
import { createFileRoute, Link } from '@tanstack/react-router';
import { useDaycareList } from '~/modules/daycare/hooks/useDaycareList';
import { useDaycareMutations } from '~/modules/daycare/hooks/useDaycareMutations';
import { useAtomValue } from 'jotai';
import { tokenAtom } from '~/stores/auth';
import { ChevronLeft, Save, Calendar, Coffee, ExternalLink } from 'lucide-react';
import { Toaster, toast } from 'sonner';

export const Route = createFileRoute('/daycare/harian')({
    component: DaycareHarianPage,
});

function DaycareHarianPage() {
    const token = useAtomValue(tokenAtom);
    const [tanggal, setTanggal] = useState(new Date().toISOString().split('T')[0]);
    const [selectedParticipants, setSelectedParticipants] = useState<{ id: string, ikutKonsumsi: boolean }[]>([]);

    const { data: participants, isLoading } = useDaycareList({
        status: 'AKTIF',
        mode: 'HARIAN',
        limit: 100
    });

    const { batchTagihanHarianMutation } = useDaycareMutations(token);

    const toggleParticipant = (id: string) => {
        setSelectedParticipants(prev => {
            const exists = prev.find(p => p.id === id);
            if (exists) return prev.filter(p => p.id !== id);
            
            // Get participant default from list
            const p = participants?.data?.find((item: any) => item.id === id);
            return [...prev, { id, ikutKonsumsi: p?.defaultIkutKonsumsi ?? false }];
        });
    };

    const toggleKonsumsi = (id: string) => {
        setSelectedParticipants(prev => prev.map(p => 
            p.id === id ? { ...p, ikutKonsumsi: !p.ikutKonsumsi } : p
        ));
    };

    const handleSubmit = async () => {
        if (selectedParticipants.length === 0) {
            toast.error('Pilih minimal satu peserta');
            return;
        }

        try {
            await batchTagihanHarianMutation.mutateAsync({
                tanggal: new Date(tanggal),
                items: selectedParticipants.map(p => ({
                    pesertaDaycareId: p.id,
                    ikutKonsumsi: p.ikutKonsumsi
                }))
            });
            setSelectedParticipants([]);
        } catch (err) {}
    };

    const currentPeriode = new Date().toISOString().substring(0, 7);

    const inputClass = "px-4 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20";

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <Toaster position="top-right" richColors />

            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <Link to="/daycare" className="p-2 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors">
                        <ChevronLeft size={20} />
                    </Link>
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900">Input Tagihan Harian</h1>
                        <p className="text-slate-500 text-sm">Input SPD Harian untuk peserta daycare non-rutin.</p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <Link
                        to="/keuangan/billing/history/$periode"
                        params={{ periode: currentPeriode }}
                        className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-700 rounded-xl hover:bg-slate-200 transition-all text-sm font-bold active:scale-95"
                    >
                        <ExternalLink size={16} />
                        <span>Lihat Riwayat Tagihan</span>
                    </Link>
                </div>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
                <div className="flex flex-col sm:flex-row items-center gap-4">
                    <div className="flex items-center gap-3 w-full sm:w-auto">
                        <label className="text-sm font-bold text-slate-700 whitespace-nowrap">Pilih Tanggal:</label>
                        <div className="relative w-full">
                            <Calendar size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input 
                                type="date" 
                                value={tanggal} 
                                onChange={(e) => setTanggal(e.target.value)}
                                className={`${inputClass} pl-10 w-full font-medium`} 
                            />
                        </div>
                    </div>
                </div>

                <div className="border border-slate-100 rounded-xl overflow-hidden">
                    <table className="w-full text-left border-collapse">
                        <thead className="bg-slate-50 border-b border-slate-100">
                            <tr>
                                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Hadir</th>
                                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Nama Peserta</th>
                                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Ikut Konsumsi</th>
                                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Info</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {isLoading ? (
                                <tr><td colSpan={4} className="p-8 text-center text-slate-500 animate-pulse">Memuat data peserta...</td></tr>
                            ) : participants?.data?.length === 0 ? (
                                <tr><td colSpan={4} className="p-8 text-center text-slate-500">Tidak ada peserta mode HARIAN yang aktif.</td></tr>
                            ) : participants?.data?.map((p: any) => {
                                const isSelected = !!selectedParticipants.find(sp => sp.id === p.id);
                                const isKonsumsi = selectedParticipants.find(sp => sp.id === p.id)?.ikutKonsumsi;

                                return (
                                    <tr key={p.id} className={`${isSelected ? 'bg-blue-50/30' : ''} transition-colors`}>
                                        <td className="px-6 py-4">
                                            <input 
                                                type="checkbox" 
                                                checked={isSelected}
                                                onChange={() => toggleParticipant(p.id)}
                                                className="w-5 h-5 rounded border-slate-300 text-blue-600 focus:ring-blue-500" 
                                            />
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="font-bold text-slate-900">{p.namaLengkap || p.siswa?.namaLengkap}</div>
                                            <div className="text-[10px] text-slate-500 font-medium">Ortu: {p.siswa?.namaOrtu || p.namaOrtu}</div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <button
                                                disabled={!isSelected}
                                                onClick={() => toggleKonsumsi(p.id)}
                                                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all ${!isSelected ? 'opacity-20 translate-y-1' : isKonsumsi ? 'bg-orange-100 text-orange-700 font-bold' : 'bg-slate-100 text-slate-400 font-medium'}`}
                                            >
                                                <Coffee size={14} />
                                                <span className="text-xs">{isKonsumsi ? 'Ya, Makan' : 'Tidak'}</span>
                                            </button>
                                        </td>
                                        <td className="px-6 py-4 text-xs text-slate-400 italic">
                                            {p.catatan || '-'}
                                        </td>
                                    </tr>
                                )
                            })}
                        </tbody>
                    </table>
                </div>

                <div className="flex justify-between items-center py-4">
                    <div className="text-sm text-slate-500">
                        Total dipilih: <span className="font-bold text-blue-600">{selectedParticipants.length}</span> peserta
                    </div>
                    <button
                        onClick={handleSubmit}
                        disabled={selectedParticipants.length === 0 || batchTagihanHarianMutation.isPending}
                        className="flex items-center gap-3 bg-blue-600 text-white px-8 py-3 rounded-xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-200 font-bold disabled:opacity-50 disabled:scale-100 active:scale-95"
                    >
                        {batchTagihanHarianMutation.isPending ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Save size={20} />}
                        <span>Simpan Tagihan</span>
                    </button>
                </div>
            </div>
        </div>
    );
}
