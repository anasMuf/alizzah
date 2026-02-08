import { Link } from '@tanstack/react-router'
import { useAtomValue } from 'jotai'
import { tokenAtom } from '~/stores/auth'
import { useRecentActivities } from '../hooks/useDashboardQueries'
import { formatCurrency, formatDistanceToNow } from '@alizzah/shared'

export function RecentActivity() {
    const token = useAtomValue(tokenAtom)
    const { data: activities, isLoading } = useRecentActivities(token)

    return (
        <div className="bg-white rounded-[32px] p-4 sm:p-6 border border-slate-200 shadow-sm">
            <h4 className="font-bold text-slate-900 mb-4 flex items-center justify-between text-sm">
                Aktivitas Terakhir
                <Link to="/keuangan/pembayaran/history" className="text-blue-600 text-[11px] font-bold uppercase hover:underline">Lihat Semua</Link>
            </h4>
            <div className="space-y-6">
                {isLoading ? (
                    <div className="space-y-4">
                        {[1, 2, 3].map(i => (
                            <div key={i} className="flex items-center gap-3 animate-pulse">
                                <div className="w-2 h-10 rounded-full bg-slate-100"></div>
                                <div className="flex-1 space-y-2">
                                    <div className="h-4 bg-slate-100 rounded w-1/2"></div>
                                    <div className="h-3 bg-slate-50 rounded w-1/3"></div>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : !activities || activities.length === 0 ? (
                    <p className="text-xs text-slate-400 font-medium text-center py-4">Belum ada aktivitas.</p>
                ) : (
                    activities.map((item) => (
                        <div key={item.id} className="flex items-center gap-3">
                            <div className={`w-2 h-10 rounded-full ${item.type === 'MASUK' ? 'bg-emerald-500/20' : 'bg-rose-500/20'}`}></div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-bold text-slate-900 truncate">{item.name}</p>
                                <p className="text-[11px] text-slate-500 font-medium">
                                    {item.action} • {formatDistanceToNow(new Date(item.time))}
                                </p>
                            </div>
                            <div className={`text-sm font-black ${item.type === 'MASUK' ? 'text-emerald-600' : 'text-rose-600'}`}>
                                {item.type === 'MASUK' ? '+' : '-'}{formatCurrency(item.amount)}
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    )
}
