import { Link } from '@tanstack/react-router'
import { useAtomValue } from 'jotai'
import { tokenAtom } from '~/stores/auth'
import { useRecentActivities } from '../hooks/useDashboardQueries'
import { formatCurrency, formatDistanceToNow } from '@alizzah/shared'

export function RecentActivity() {
    const token = useAtomValue(tokenAtom)
    const { data: activities, isLoading } = useRecentActivities(token)

    return (
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm">
            <h4 className="font-bold text-slate-900 mb-3 flex items-center justify-between text-xs uppercase tracking-tight">
                Aktivitas Terakhir
                <Link to="/keuangan/pembayaran/history" className="text-blue-600 text-[10px] font-black uppercase hover:underline">Lihat Semua</Link>
            </h4>
            <div className="space-y-3">
                {isLoading ? (
                    <div className="space-y-3">
                        {[1, 2, 3].map(i => (
                            <div key={i} className="flex items-center gap-3 animate-pulse">
                                <div className="w-1.5 h-8 rounded-full bg-slate-100"></div>
                                <div className="flex-1 space-y-1.5">
                                    <div className="h-3 bg-slate-100 rounded w-1/2"></div>
                                    <div className="h-2 bg-slate-50 rounded w-1/3"></div>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : !activities || activities.length === 0 ? (
                    <p className="text-[10px] text-slate-400 font-bold uppercase text-center py-4">Belum ada aktivitas.</p>
                ) : (
                    activities.map((item) => (
                        <div key={item.id} className="flex items-center gap-3 group">
                            <div className={`w-1.5 h-8 rounded-full shrink-0 ${item.type === 'MASUK' ? 'bg-emerald-500/20' : 'bg-rose-500/20'}`}></div>
                            <div className="flex-1 min-w-0">
                                <p className="text-xs font-bold text-slate-900 truncate">{item.name}</p>
                                <p className="text-[10px] text-slate-500 font-medium">
                                    {item.action} • {formatDistanceToNow(new Date(item.time))}
                                </p>
                            </div>
                            <div className={`text-xs font-black shrink-0 ${item.type === 'MASUK' ? 'text-emerald-600' : 'text-rose-600'}`}>
                                {item.type === 'MASUK' ? '+' : '-'}{formatCurrency(item.amount)}
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    )
}
