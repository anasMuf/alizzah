import { createFileRoute } from '@tanstack/react-router';
import { useAtomValue } from 'jotai';
import { tokenAtom } from '~/stores/auth';
import { useState } from 'react';
import {
    FilePieChart,
    Download,
    Calendar,
    Users
} from 'lucide-react';
import { useRekapKasir, useTunggakanJenjang } from '~/modules/keuangan/laporan/hooks/useLaporanQueries';
import { AnalyticsDashboard } from '~/modules/keuangan/laporan/components/AnalyticsDashboard';

export const Route = createFileRoute('/keuangan/laporan')({
    component: LaporanPage,
});

function LaporanPage() {
    const token = useAtomValue(tokenAtom);
    const [activeTab, setActiveTab] = useState<'analytics' | 'reports'>('analytics');
    const [tanggal, setTanggal] = useState(new Date());

    const { data: tunggakanJenjangData, isLoading: isLoadingJenjang } = useTunggakanJenjang(token);
    const { data: rekapData, isLoading: isLoadingRekap } = useRekapKasir(token, tanggal);

    const handleExport = (type: 'tunggakan' | 'rekap') => {
        if (!token) return;
        const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001/api/v1';
        const url = type === 'tunggakan'
            ? `${apiUrl}/keuangan/laporan/tunggakan/export`
            : `${apiUrl}/keuangan/laporan/rekap-kasir/export?tanggal=${tanggal.toISOString()}`;

        // Simple download trigger
        const link = document.createElement('a');
        link.href = url;
        // In real app, might need to handle headers/auth via fetch and blob
        // But for quick implementation, we assume server handles auth via cookie or simple token
        // Let's use fetch to support Authorization header
        fetch(url, {
            headers: { 'Authorization': `Bearer ${token}` }
        })
            .then(async res => {
                if (!res.ok) {
                    const error = await res.json().catch(() => ({}));
                    throw new Error(error.message || 'Gagal mengunduh laporan');
                }
                return res.blob();
            })
            .then(blob => {
                const blobUrl = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = blobUrl;
                a.download = type === 'tunggakan' ? 'Laporan_Tunggakan.xlsx' : `Rekap_Kasir_${tanggal.toISOString().split('T')[0]}.pdf`;
                document.body.appendChild(a);
                a.click();
                a.remove();
                window.URL.revokeObjectURL(blobUrl);
            })
            .catch(err => {
                console.error('Export error:', err);
                alert(err.message);
            });
    };

    return (
        <div className="space-y-8">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white p-6 sm:p-8 rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden relative">
                <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/5 blur-[100px] rounded-full -mr-32 -mt-32" />
                <div className="relative z-10">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-3 bg-blue-600 rounded-2xl text-white shadow-xl shadow-blue-600/20">
                            <FilePieChart size={24} />
                        </div>
                        <h1 className="text-3xl font-black text-slate-900 tracking-tight">Laporan & Analitik</h1>
                    </div>
                    <p className="text-slate-500 font-medium">Monitoring kesehatan keuangan dan ekspor laporan periodik.</p>
                </div>

                <div className="flex items-center p-1 bg-slate-100 rounded-2xl relative z-10 h-fit">
                    <button
                        onClick={() => setActiveTab('analytics')}
                        className={`px-6 py-2.5 rounded-xl font-bold text-sm transition-all ${activeTab === 'analytics' ? 'bg-white text-blue-600 shadow-sm active:scale-95' : 'text-slate-500 hover:text-slate-700'
                            }`}
                    >
                        Analitik Dashboard
                    </button>
                    <button
                        onClick={() => setActiveTab('reports')}
                        className={`px-6 py-2.5 rounded-xl font-bold text-sm transition-all ${activeTab === 'reports' ? 'bg-white text-blue-600 shadow-sm active:scale-95' : 'text-slate-500 hover:text-slate-700'
                            }`}
                    >
                        Daftar Laporan
                    </button>
                </div>
            </div>

            {activeTab === 'analytics' ? (
                isLoadingJenjang || isLoadingRekap ? (
                    <div className="h-[600px] flex items-center justify-center bg-white rounded-[2.5rem] border border-dashed border-slate-200">
                        <div className="flex flex-col items-center gap-4">
                            <div className="w-12 h-12 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin" />
                            <p className="text-sm font-bold text-slate-400 uppercase tracking-widest animate-pulse">Menghitung Data Keuangan...</p>
                        </div>
                    </div>
                ) : (
                    <AnalyticsDashboard tunggakanData={tunggakanJenjangData} rekapData={rekapData} />
                )
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Report Cards */}
                    <ReportCard
                        title="Laporan Tunggakan per Kelas"
                        desc="Daftar siswa yang memiliki tagihan aktif/tertunggak dikelompokkan per rombel."
                        icon={Users}
                        onExport={() => handleExport('tunggakan')}
                        format="Excel (.xlsx)"
                    />
                    <ReportCard
                        title="Rekap Harian Kasir"
                        desc="Laporan rincian transaksi harian yang ditangani oleh kasir tertentu."
                        icon={Calendar}
                        onExport={() => handleExport('rekap')}
                        format="PDF (.pdf)"
                        hasDate
                        date={tanggal}
                        onDateChange={(d: Date) => setTanggal(d)}
                    />
                </div>
            )}
        </div>
    );
}

function ReportCard({ title, desc, icon: Icon, onExport, format, hasDate, date, onDateChange }: any) {
    return (
        <div className="bg-white p-6 sm:p-8 rounded-[2.5rem] border border-slate-200 shadow-xl group hover:border-blue-200 transition-all space-y-6 sm:space-y-8">
            <div className="flex items-start justify-between">
                <div className="p-4 bg-slate-50 rounded-2xl text-slate-400 group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors">
                    <Icon size={28} />
                </div>
                <div className="px-3 py-1 bg-slate-100 text-[10px] font-black uppercase tracking-widest text-slate-500 rounded-full">
                    {format}
                </div>
            </div>

            <div className="space-y-2">
                <h3 className="text-xl font-bold text-slate-900 leading-tight">{title}</h3>
                <p className="text-sm text-slate-500 font-medium leading-relaxed">{desc}</p>
            </div>

            {hasDate && (
                <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Pilih Tanggal</label>
                    <input
                        type="date"
                        value={date instanceof Date && !isNaN(date.getTime()) ? date.toISOString().split('T')[0] : ''}
                        onChange={(e) => {
                            const val = e.target.value;
                            if (val) {
                                const newDate = new Date(val);
                                if (!isNaN(newDate.getTime())) {
                                    onDateChange(newDate);
                                }
                            }
                        }}
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl font-bold focus:outline-none focus:ring-4 focus:ring-blue-100 transition-all"
                    />
                </div>
            )}

            <button
                onClick={onExport}
                className="w-full py-4 bg-slate-900 text-white font-black rounded-2xl flex items-center justify-center gap-3 hover:bg-blue-600 hover:shadow-xl hover:shadow-blue-600/20 active:scale-95 transition-all text-xs uppercase tracking-[0.2em]"
            >
                <Download size={18} /> Download Laporan
            </button>
        </div>
    );
}
