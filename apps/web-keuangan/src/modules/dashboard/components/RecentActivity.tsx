import { Link } from '@tanstack/react-router'

interface ActivityItem {
    name: string
    action: string
    time: string
    amount: string
    color: 'emerald' | 'rose'
}

const ACTIVITIES: ActivityItem[] = [
    { name: 'Ahmad Fathoni', action: 'Bayar SPP Jan 2026', time: '5m yang lalu', amount: '+Rp 750k', color: 'emerald' },
    { name: 'Siti Aminah', action: 'Pembelian Seragam', time: '12m yang lalu', amount: '+Rp 350k', color: 'emerald' },
    { name: 'Kas Yayasan', action: 'Tarik Saldo Kas', time: '1j yang lalu', amount: '-Rp 1.2M', color: 'rose' },
]

export function RecentActivity() {
    return (
        <div className="bg-white rounded-[32px] p-6 border border-slate-200 shadow-sm">
            <h4 className="font-bold text-slate-900 mb-4 flex items-center justify-between text-sm">
                Aktivitas Terakhir
                <Link to="/" className="text-blue-600 text-[11px] font-bold uppercase hover:underline">Lihat Semua</Link>
            </h4>
            <div className="space-y-6">
                {ACTIVITIES.map((item, i) => (
                    <div key={i} className="flex items-center gap-3">
                        <div className={`w-2 h-10 rounded-full bg-${item.color}-500/20`}></div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold text-slate-900 truncate">{item.name}</p>
                            <p className="text-[11px] text-slate-500 font-medium">{item.action} • {item.time}</p>
                        </div>
                        <div className={`text-sm font-black ${item.color === 'emerald' ? 'text-emerald-600' : 'text-rose-600'}`}>
                            {item.amount}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}
