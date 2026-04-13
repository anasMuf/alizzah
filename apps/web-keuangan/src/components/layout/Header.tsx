import { Bell, Search, Menu } from 'lucide-react'
import { useAtomValue, useSetAtom } from 'jotai'
import { userAtom } from '~/stores/auth'
import { commandPaletteAtom } from '~/stores/ui'

export function Header({ setSidebarOpen }: { setSidebarOpen: (open: boolean) => void }) {
    const user = useAtomValue(userAtom)
    const setOpen = useSetAtom(commandPaletteAtom)
    const initials = user?.username?.substring(0, 2).toUpperCase() || 'AD'

    return (
        <header className="h-14 bg-white/80 backdrop-blur-md border-b border-slate-200 sticky top-0 z-30 px-4 flex items-center justify-between">
            <div className="flex items-center gap-4 lg:gap-0">
                <button onClick={() => setSidebarOpen(true)} className="lg:hidden p-2 text-slate-600 hover:bg-slate-100 rounded-lg">
                    <Menu size={24} />
                </button>
                <button
                    onClick={() => setOpen(true)}
                    className="hidden md:flex items-center justify-between px-3 py-1.5 bg-slate-100/80 hover:bg-slate-200/50 hover:shadow-inner rounded-xl text-slate-400 border border-transparent hover:border-slate-300/50 transition-all w-40 lg:w-80 group cursor-text"
                >
                    <div className="flex items-center gap-2.5">
                        <Search size={18} className="text-slate-400 group-hover:text-blue-600 transition-colors" />
                        <span className="text-xs font-medium text-slate-400 group-hover:text-slate-600">Cari siswa, tagihan, atau menu...</span>
                    </div>
                    <div className="flex items-center gap-1.5 px-2 py-0.5 bg-white rounded-lg border border-slate-200 shadow-sm text-[10px] font-black text-slate-400">
                        <span className="text-xs">⌘</span>
                        <span>K</span>
                    </div>
                </button>
            </div>

            <div className="flex items-center gap-3">
                <button className="relative p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
                    <Bell size={20} />
                    <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 border-2 border-white rounded-full"></span>
                </button>
                <div className="h-6 w-px bg-slate-200 mx-2 hidden sm:block"></div>
                <div className="hidden sm:block text-right mr-2">
                    <p className="text-[12px] font-bold text-slate-900 leading-tight">{user?.namaLengkap || user?.username}</p>
                    <p className="text-[10px] font-medium text-slate-400 tracking-wide uppercase">{user?.role?.replace('_', ' ')}</p>
                </div>
                <div className="w-8 h-8 rounded-lg bg-blue-600 shadow-lg shadow-blue-200 flex items-center justify-center font-bold text-white text-xs">
                    {initials}
                </div>
            </div>
        </header>
    )
}
