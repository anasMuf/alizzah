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
        <div className="bg-white p-4 md:p-4 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex justify-between items-start mb-3">
                <div className={`w-10 h-10 rounded-xl bg-${color}-50 flex items-center justify-center text-${color}-600`}>
                    <Icon size={20} />
                </div>
                <div className={`flex items-center gap-1 px-1.5 py-0.5 rounded-lg text-[10px] font-bold ${trend === 'up' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                    {trend === 'up' ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
                    {trendValue}
                </div>
            </div>
            <div>
                <p className="text-[11px] font-medium text-slate-500 mb-0.5">{title}</p>
                <h3 className="text-lg font-bold text-slate-900 leading-none">{value}</h3>
            </div>
        </div>
    )
}
