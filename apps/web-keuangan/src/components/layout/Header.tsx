import { Bell, Search, Menu } from 'lucide-react'
import { useAtomValue } from 'jotai'
import { userAtom } from '~/stores/auth'

export function Header({ setSidebarOpen }: { setSidebarOpen: (open: boolean) => void }) {
    const user = useAtomValue(userAtom)
    const initials = user?.username?.substring(0, 2).toUpperCase() || 'AD'

    return (
        <header className="h-20 bg-white/80 backdrop-blur-md border-b border-slate-200 sticky top-0 z-30 px-6 flex items-center justify-between">
            <div className="flex items-center gap-4 lg:gap-0">
                <button onClick={() => setSidebarOpen(true)} className="lg:hidden p-2 text-slate-600 hover:bg-slate-100 rounded-lg">
                    <Menu size={24} />
                </button>
                <div className="hidden md:flex items-center gap-2 px-4 py-2.5 bg-slate-100 rounded-xl text-slate-400 focus-within:ring-2 focus-within:ring-blue-500/20 focus-within:bg-white focus-within:text-slate-900 transition-all w-80">
                    <Search size={18} />
                    <input type="text" placeholder="Cari data, laporan..." className="bg-transparent border-none outline-none text-sm w-full" />
                </div>
            </div>

            <div className="flex items-center gap-3">
                <button className="relative p-2.5 text-slate-600 hover:bg-slate-100 rounded-xl transition-colors">
                    <Bell size={20} />
                    <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-red-500 border-2 border-white rounded-full"></span>
                </button>
                <div className="h-8 w-px bg-slate-200 mx-2 hidden sm:block"></div>
                <div className="hidden sm:block text-right mr-2">
                    <p className="text-[12px] font-bold text-slate-900 leading-tight">{user?.namaLengkap || user?.username}</p>
                    <p className="text-[10px] font-medium text-slate-400 tracking-wide uppercase">{user?.role?.replace('_', ' ')}</p>
                </div>
                <div className="w-10 h-10 rounded-xl bg-blue-600 shadow-lg shadow-blue-200 flex items-center justify-center font-bold text-white text-sm">
                    {initials}
                </div>
            </div>
        </header>
    )
}
