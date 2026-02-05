import * as React from 'react'
import { Link } from '@tanstack/react-router'
import { useAtomValue, useAtom } from 'jotai'
import {
    LayoutDashboard,
    CalendarDays,
    School,
    Users,
    CreditCard,
    FileText,
    LogOut,
    ChevronRight,
    X,
    ChevronLeft,
    GraduationCap,
    PiggyBank,
    Wallet
} from 'lucide-react'
import { userAtom, logoutAtom } from '~/stores/auth'
import { ConfirmDialog } from '~/components/ui/ConfirmDialog'

function SidebarItem({ to, icon: Icon, children, exact = false, onClick, isCollapsed }: { to: string, icon: any, children: React.ReactNode, exact?: boolean, onClick?: () => void, isCollapsed: boolean }) {
    return (
        <Link
            to={to}
            activeOptions={{ exact }}
            activeProps={{ className: 'bg-blue-50 text-blue-700 shadow-sm' }}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-all duration-200 group relative ${isCollapsed ? 'justify-center px-0 w-12 mx-auto' : ''}`}
            onClick={onClick}
        >
            <Icon size={20} className="group-hover:scale-110 transition-transform shrink-0" />
            {!isCollapsed && <span className="font-medium text-[15px] truncate">{children}</span>}
            {!isCollapsed && <ChevronRight size={14} className="ml-auto opacity-0 group-hover:opacity-40 transition-opacity" />}

            {/* Tooltip for collapsed state */}
            {isCollapsed && (
                <div className="absolute left-full ml-4 px-2 py-1 bg-slate-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-50">
                    {children}
                </div>
            )}
        </Link>
    )
}

interface SidebarProps {
    open: boolean
    setOpen: (open: boolean) => void
    isCollapsed: boolean
    setIsCollapsed: (collapsed: boolean) => void
}

export function Sidebar({ open, setOpen, isCollapsed, setIsCollapsed }: SidebarProps) {
    const user = useAtomValue(userAtom)
    const [, logout] = useAtom(logoutAtom)
    const [showLogoutConfirm, setShowLogoutConfirm] = React.useState(false)

    const handleLogout = () => {
        logout()
        setShowLogoutConfirm(false)
    }

    return (
        <>
            {/* Mobile Sidebar Overlay */}
            {open && (
                <div
                    className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-40 lg:hidden"
                    onClick={() => setOpen(false)}
                />
            )}

            {/* Sidebar Content */}
            <aside
                className={`fixed inset-y-0 left-0 bg-white border-r border-slate-200 z-50 transform transition-all duration-300 ease-in-out lg:translate-x-0 ${open ? 'translate-x-0' : '-translate-x-full'} ${isCollapsed ? 'w-20' : 'w-72'}`}
            >
                <div className="flex flex-col h-full overflow-hidden">
                    {/* Logo Section */}
                    <div className={`p-6 border-b border-slate-100 flex items-center shrink-0 ${isCollapsed ? 'justify-center px-0' : 'justify-between'}`}>
                        <div className={`flex items-center gap-3 ${isCollapsed ? 'gap-0' : ''}`}>
                            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-200 shrink-0">
                                <School className="text-white" size={24} />
                            </div>
                            {!isCollapsed && (
                                <div className="animate-in fade-in slide-in-from-left-2 duration-300">
                                    <h1 className="font-bold text-slate-900 leading-none">ALIZZAH</h1>
                                    <p className="text-[10px] font-bold text-blue-600 uppercase tracking-wider mt-1">Finance System</p>
                                </div>
                            )}
                        </div>

                        {/* Desktop Collapse Toggle */}
                        <button
                            onClick={() => setIsCollapsed(!isCollapsed)}
                            className="hidden lg:flex p-1.5 rounded-lg text-slate-400 hover:bg-slate-50 hover:text-slate-600 transition-colors"
                        >
                            <ChevronLeft size={18} className={`transition-transform duration-300 ${isCollapsed ? 'rotate-180' : ''}`} />
                        </button>

                        {/* Mobile Close Button */}
                        <button onClick={() => setOpen(false)} className="lg:hidden text-slate-400 hover:text-slate-600">
                            <X size={20} />
                        </button>
                    </div>

                    {/* Navigation */}
                    <nav className="flex-1 px-4 py-4 space-y-1 overflow-y-auto custom-scrollbar overflow-x-hidden">
                        <div className={`px-4 py-2 text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-2 ${isCollapsed ? 'text-center px-0' : ''}`}>
                            {isCollapsed ? '...' : 'Menu Utama'}
                        </div>
                        <SidebarItem to="/" icon={LayoutDashboard} exact onClick={() => setOpen(false)} isCollapsed={isCollapsed}>Dashboard</SidebarItem>

                        <div className={`mt-6 px-4 py-2 text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-2 ${isCollapsed ? 'text-center px-0' : ''}`}>
                            {isCollapsed ? '...' : 'Master Data'}
                        </div>
                        <SidebarItem to="/master/tahun-ajaran" icon={CalendarDays} onClick={() => setOpen(false)} isCollapsed={isCollapsed}>Tahun Ajaran</SidebarItem>
                        <SidebarItem to="/master/jenjang" icon={School} onClick={() => setOpen(false)} isCollapsed={isCollapsed}>Jenjang</SidebarItem>
                        <SidebarItem to="/master/rombel" icon={Users} onClick={() => setOpen(false)} isCollapsed={isCollapsed}>Rombel (Kelas)</SidebarItem>
                        <SidebarItem to="/master/jenis-pembayaran" icon={CreditCard} onClick={() => setOpen(false)} isCollapsed={isCollapsed}>Jenis Pembayaran</SidebarItem>
                        <SidebarItem to="/master/diskon" icon={CreditCard} onClick={() => setOpen(false)} isCollapsed={isCollapsed}>Diskon & Beasiswa</SidebarItem>
                        <div className={`mt-6 px-4 py-2 text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-2 ${isCollapsed ? 'text-center px-0' : ''}`}>
                            {isCollapsed ? '...' : 'Keuangan'}
                        </div>
                        <SidebarItem to="/siswa" icon={Users} onClick={() => setOpen(false)} isCollapsed={isCollapsed}>Data Siswa</SidebarItem>
                        <SidebarItem to="/siswa/progresi" icon={GraduationCap} onClick={() => setOpen(false)} isCollapsed={isCollapsed}>Kenaikan Kelas</SidebarItem>
                        <SidebarItem to="/keuangan/billing" icon={CreditCard} onClick={() => setOpen(false)} isCollapsed={isCollapsed}>Tagihan & SPP</SidebarItem>
                        <SidebarItem to="/keuangan/pembayaran" icon={CreditCard} onClick={() => setOpen(false)} isCollapsed={isCollapsed}>Pembayaran & Kasir</SidebarItem>
                        <SidebarItem to="/keuangan/tabungan" icon={PiggyBank} onClick={() => setOpen(false)} isCollapsed={isCollapsed}>Tabungan Siswa</SidebarItem>
                        <SidebarItem to="/keuangan/kas" icon={Wallet} onClick={() => setOpen(false)} isCollapsed={isCollapsed}>Kas & Berangkas</SidebarItem>

                        <div className={`mt-6 px-4 py-2 text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-2 ${isCollapsed ? 'text-center px-0' : ''}`}>
                            {isCollapsed ? '...' : 'Laporan'}
                        </div>
                        <SidebarItem to="#" icon={FileText} isCollapsed={isCollapsed}>Laporan Harian</SidebarItem>
                    </nav>

                    {/* User Profile Section */}
                    <div className="p-4 border-t border-slate-100 bg-slate-50/50 shrink-0">
                        {!isCollapsed ? (
                            <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                                <div className="flex items-center gap-3 p-3 mb-2">
                                    <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold border-2 border-white shrink-0">
                                        {user?.username?.[0]?.toUpperCase()}
                                    </div>
                                    <div className="flex-1 overflow-hidden">
                                        <p className="text-sm font-bold text-slate-900 truncate">{user?.namaLengkap || user?.username}</p>
                                        <p className="text-[11px] text-slate-500 font-medium capitalize truncate">{user?.role?.toLowerCase()?.replace('_', ' ')}</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setShowLogoutConfirm(true)}
                                    className="flex items-center gap-3 w-full px-4 py-3 text-red-600 font-semibold text-sm hover:bg-red-50 rounded-xl transition-colors group"
                                >
                                    <LogOut size={18} className="group-hover:-translate-x-1 transition-transform" />
                                    Keluar Sistem
                                </button>
                            </div>
                        ) : (
                            <div className="flex flex-col items-center gap-4">
                                <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold border-2 border-white shrink-0">
                                    {user?.username?.[0]?.toUpperCase()}
                                </div>
                                <button
                                    onClick={() => setShowLogoutConfirm(true)}
                                    className="p-3 text-red-600 hover:bg-red-50 rounded-xl transition-colors"
                                    title="Keluar Sistem"
                                >
                                    <LogOut size={20} />
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </aside>

            {/* Logout Confirmation Dialog */}
            <ConfirmDialog
                isOpen={showLogoutConfirm}
                onClose={() => setShowLogoutConfirm(false)}
                onConfirm={handleLogout}
                title="Konfirmasi Keluar"
                description="Apakah Anda yakin ingin keluar dari sistem? Anda harus login kembali untuk mengakses data keuangan sekolah."
                variant="danger"
                confirmText="Ya, Keluar"
                cancelText="Batal"
            />
        </>
    )
}
