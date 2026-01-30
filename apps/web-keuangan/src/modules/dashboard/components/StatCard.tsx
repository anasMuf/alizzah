import { ArrowUpRight, ArrowDownRight } from 'lucide-react'

interface StatCardProps {
    title: string
    value: string
    trend: 'up' | 'down'
    trendValue: string
    icon: any
    color: string
}

export function StatCard({ title, value, trend, trendValue, icon: Icon, color }: StatCardProps) {
    return (
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex justify-between items-start mb-4">
                <div className={`w-12 h-12 rounded-2xl bg-${color}-50 flex items-center justify-center text-${color}-600`}>
                    <Icon size={24} />
                </div>
                <div className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-bold ${trend === 'up' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                    {trend === 'up' ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                    {trendValue}
                </div>
            </div>
            <div>
                <p className="text-sm font-medium text-slate-500 mb-1">{title}</p>
                <h3 className="text-2xl font-bold text-slate-900 leading-none">{value}</h3>
            </div>
        </div>
    )
}
