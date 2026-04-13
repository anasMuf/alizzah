import { CreditCard, Users, AlertCircle, FileText } from 'lucide-react'

const ACTIONS = [
    { label: 'Cek Status Siswa', icon: Users },
    { label: 'Ubah Tarif Jenjang', icon: AlertCircle },
    { label: 'Laporan Bulanan', icon: FileText }
]

export function QuickActions() {
    return (
        <div className="bg-slate-900 rounded-2xl p-5 text-white relative overflow-hidden">
            <div className="absolute bottom-0 right-0 opacity-10 translate-x-4 translate-y-4">
                <CreditCard size={100} />
            </div>
            <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mb-3">Shortcut Cepat</p>
            <div className="space-y-2.5">
                {ACTIONS.map((action, idx) => (
                    <button key={idx} className="w-full flex items-center gap-2.5 p-3 bg-white/5 hover:bg-white/10 rounded-xl transition-colors border border-white/5 font-bold text-xs">
                        <action.icon size={16} className="text-blue-400" />
                        {action.label}
                    </button>
                ))}
            </div>
        </div>
    )
}
