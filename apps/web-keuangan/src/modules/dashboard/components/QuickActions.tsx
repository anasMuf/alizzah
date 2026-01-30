import { CreditCard, Users, AlertCircle, FileText } from 'lucide-react'

const ACTIONS = [
    { label: 'Cek Status Siswa', icon: Users },
    { label: 'Ubah Tarif Jenjang', icon: AlertCircle },
    { label: 'Laporan Bulanan', icon: FileText }
]

export function QuickActions() {
    return (
        <div className="bg-slate-900 rounded-[32px] p-8 text-white relative overflow-hidden">
            <div className="absolute bottom-0 right-0 opacity-10 translate-x-4 translate-y-4">
                <CreditCard size={120} />
            </div>
            <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-4">Shortcut Cepat</p>
            <div className="space-y-4">
                {ACTIONS.map((action, idx) => (
                    <button key={idx} className="w-full flex items-center gap-3 p-4 bg-white/5 hover:bg-white/10 rounded-2xl transition-colors border border-white/5 font-bold text-sm">
                        <action.icon size={18} className="text-blue-400" />
                        {action.label}
                    </button>
                ))}
            </div>
        </div>
    )
}
