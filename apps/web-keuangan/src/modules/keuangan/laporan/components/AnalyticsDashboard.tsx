import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    PieChart,
    Pie,
    Cell
} from 'recharts';
import {
    TrendingUp,
    Users,
    CreditCard,
    AlertTriangle,
    FileText,
    LucideIcon
} from 'lucide-react';
import { formatCurrency } from '@alizzah/shared';

interface AnalyticsDashboardProps {
    tunggakanData: Record<string, any>;
    rekapData: Record<string, any>;
}

export function AnalyticsDashboard({ tunggakanData, rekapData }: AnalyticsDashboardProps) {
    // Process Tunggakan for Bar Chart (Grouping by Jenjang)
    const tunggakanChartData = Object.keys(tunggakanData || {}).map(jenjang => {
        return {
            name: jenjang,
            total: tunggakanData[jenjang] as number
        };
    });

    // Process Rekap Data for Pie Chart (Methods)
    const totalTunai = Object.values(rekapData || {}).reduce((sum: number, k: any) => sum + k.totalTunai, 0);
    const totalTransfer = Object.values(rekapData || {}).reduce((sum: number, k: any) => sum + k.totalTransfer, 0);

    const methodData = [
        { name: 'Tunai', value: totalTunai, color: '#10b981' },
        { name: 'Transfer', value: totalTransfer, color: '#3b82f6' }
    ];

    return (
        <div className="space-y-8 animate-in fade-in duration-700">
            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <Card
                    title="Total Tunai Hari Ini"
                    value={formatCurrency(totalTunai)}
                    icon={CreditCard}
                    color="emerald"
                />
                <Card
                    title="Total Transfer Hari Ini"
                    value={formatCurrency(totalTransfer)}
                    icon={TrendingUp}
                    color="blue"
                />
                <Card
                    title="Total Tunggakan"
                    value={formatCurrency(tunggakanChartData.reduce((s, d) => s + d.total, 0))}
                    icon={AlertTriangle}
                    color="rose"
                />
                <Card
                    title="Jumlah Transaksi"
                    value={Object.values(rekapData || {}).reduce((sum: number, k: any) => sum + k.count, 0).toString()}
                    icon={FileText}
                    color="slate"
                />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Tunggakan Bar Chart */}
                <div className="bg-white p-5 sm:p-8 rounded-[2.5rem] border border-slate-200 shadow-xl space-y-6">
                    <div className="flex justify-between items-center">
                        <h3 className="text-xl font-black text-slate-900 tracking-tight">Tunggakan per Jenjang</h3>
                        <div className="p-2 bg-slate-50 rounded-xl text-slate-400">
                            <Users size={20} />
                        </div>
                    </div>
                    <div className="h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={tunggakanChartData}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                <XAxis
                                    dataKey="name"
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fill: '#64748b', fontSize: 12, fontWeight: 600 }}
                                />
                                <YAxis
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fill: '#64748b', fontSize: 12, fontWeight: 600 }}
                                    tickFormatter={(val) => `Rp${(val as number) / 1000000}jt`}
                                />
                                <Tooltip
                                    cursor={{ fill: '#f8fafc' }}
                                    contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                                    formatter={(val) => [formatCurrency(val as number), 'Tunggakan']}
                                />
                                <Bar dataKey="total" fill="#6366f1" radius={[8, 8, 0, 0]} barSize={40} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Metode Pembayaran Pie Chart */}
                <div className="bg-white p-5 sm:p-8 rounded-[2.5rem] border border-slate-200 shadow-xl space-y-6">
                    <h3 className="text-xl font-black text-slate-900 tracking-tight">Metode Pembayaran (Hari Ini)</h3>
                    <div className="flex items-center justify-between">
                        <div className="h-[250px] w-1/2">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={methodData}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={60}
                                        outerRadius={80}
                                        paddingAngle={5}
                                        dataKey="value"
                                    >
                                        {methodData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.color} />
                                        ))}
                                    </Pie>
                                    <Tooltip />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                        <div className="w-1/2 space-y-4">
                            {methodData.map((item) => (
                                <div key={item.name} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl">
                                    <div className="flex items-center gap-3">
                                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                                        <span className="text-sm font-bold text-slate-600">{item.name}</span>
                                    </div>
                                    <span className="text-sm font-black text-slate-900">
                                        {Math.round((item.value / (totalTunai + totalTransfer || 1)) * 100)}%
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

interface CardProps {
    title: string;
    value: string;
    icon: LucideIcon;
    color: 'emerald' | 'blue' | 'rose' | 'slate';
}

function Card({ title, value, icon: Icon, color }: CardProps) {
    const colors = {
        emerald: 'bg-emerald-50 text-emerald-600 border-emerald-100',
        blue: 'bg-blue-50 text-blue-600 border-blue-100',
        rose: 'bg-rose-50 text-rose-600 border-rose-100',
        slate: 'bg-slate-50 text-slate-600 border-slate-100',
    };

    return (
        <div className="bg-white p-4 sm:p-6 rounded-4xl border border-slate-200 shadow-sm flex items-center justify-between">
            <div className="space-y-1">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{title}</p>
                <p className="text-2xl font-black text-slate-900 tracking-tight">{value}</p>
            </div>
            <div className={`p-4 rounded-2xl border ${colors[color]}`}>
                <Icon size={24} />
            </div>
        </div>
    );
}
