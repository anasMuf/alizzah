import React, { useEffect, useState } from 'react'
import { Command } from 'cmdk'
import { useAtom } from 'jotai'
import { commandPaletteAtom } from '~/stores/ui'
import { useNavigate } from '@tanstack/react-router'
import {
    Search,
    User,
    FileText,
    CreditCard,
    LayoutDashboard,
    Settings,
    Users,
    Wallet,
    PiggyBank,
    BarChart3,
    ArrowRight
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAtomValue } from 'jotai'
import { tokenAtom } from '~/stores/auth'
import { useGlobalSearch } from '~/modules/dashboard/hooks/useSearchQueries'
import { useDebounce } from 'use-debounce'

export function CommandPalette() {
    const [open, setOpen] = useAtom(commandPaletteAtom)
    const [search, setSearch] = useState('')
    const [debouncedSearch] = useDebounce(search, 300)
    const navigate = useNavigate()
    const token = useAtomValue(tokenAtom)

    const { data: results, isLoading } = useGlobalSearch(token, debouncedSearch)

    // Toggle the menu when ⌘K is pressed
    useEffect(() => {
        const down = (e: KeyboardEvent) => {
            if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
                e.preventDefault()
                setOpen((open) => !open)
            }
        }

        document.addEventListener('keydown', down)
        return () => document.removeEventListener('keydown', down)
    }, [setOpen])

    const runCommand = (command: () => void) => {
        setOpen(false)
        command()
    }

    return (
        <AnimatePresence>
            {open && (
                <div className="fixed inset-0 z-100 flex items-start justify-center pt-[15vh]">
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-slate-900/40 backdrop-blur-[2px]"
                        onClick={() => setOpen(false)}
                    />

                    <motion.div
                        initial={{ opacity: 0, scale: 0.98, y: -10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.98, y: -10 }}
                        transition={{ duration: 0.2, ease: "easeOut" }}
                        className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-200"
                    >
                        <Command className="w-full">
                            <div className="flex items-center px-6 py-5 border-b border-slate-100">
                                <Search className="mr-4 h-5 w-5 text-slate-400" />
                                <Command.Input
                                    autoFocus
                                    placeholder="Apa yang Anda cari hari ini? (Halaman, Siswa, Berkas...)"
                                    className="w-full bg-transparent border-none outline-none text-slate-900 text-lg placeholder:text-slate-400"
                                    value={search}
                                    onValueChange={setSearch}
                                />
                                <div className="ml-4 px-2 py-1 bg-slate-100 rounded-lg text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                                    ESC
                                </div>
                            </div>

                            <Command.List className="max-h-[60vh] overflow-y-auto p-4 custom-scrollbar">
                                <Command.Empty className="py-12 text-center">
                                    <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-300">
                                        <Search size={32} />
                                    </div>
                                    <p className="text-slate-500 font-medium">Tidak ada hasil ditemukan untuk "{search}"</p>
                                </Command.Empty>

                                {/* Navigation Group */}
                                <Command.Group heading={<span className="px-2 text-[11px] font-black text-slate-400 uppercase tracking-widest mb-3 block">Navigasi Langsung</span>}>
                                    <PageItem icon={LayoutDashboard} label="Dashboard Utama" onClick={() => runCommand(() => navigate({ to: '/' }))} shortcut="G D" />
                                    <PageItem icon={CreditCard} label="Pembayaran Siswa" onClick={() => runCommand(() => navigate({ to: '/keuangan/pembayaran' }))} shortcut="G P" />
                                    <PageItem icon={PiggyBank} label="Tabungan & Setoran" onClick={() => runCommand(() => navigate({ to: '/keuangan/tabungan' }))} />
                                    <PageItem icon={Wallet} label="Kas & Perbankan" onClick={() => runCommand(() => navigate({ to: '/keuangan/kas' }))} />
                                    <PageItem icon={BarChart3} label="Laporan & Analitik" onClick={() => runCommand(() => navigate({ to: '/keuangan/laporan' }))} />
                                    <PageItem icon={Users} label="Master Data Siswa" onClick={() => runCommand(() => navigate({ to: '/siswa' }))} />
                                </Command.Group>

                                {/* Common Actions */}
                                <Command.Group heading={<span className="px-2 text-[11px] font-black text-slate-400 uppercase tracking-widest mt-6 mb-3 block">Fungsi Cepat</span>}>
                                    <ActionItem icon={ArrowRight} label="Generate Tagihan Baru" onClick={() => runCommand(() => navigate({ to: '/keuangan/billing' }))} />
                                    <ActionItem icon={Settings} label="Pengaturan Sistem" onClick={() => runCommand(() => navigate({ to: '/master/tahun-ajaran' }))} />
                                </Command.Group>

                                {/* Dynamic Results from API */}
                                {results && (
                                    <>
                                        {results.siswa.length > 0 && (
                                            <Command.Group heading={<span className="px-2 text-[11px] font-black text-slate-400 uppercase tracking-widest mt-6 mb-3 block">Siswa</span>}>
                                                {results.siswa.map(s => (
                                                    <DataItem key={s.id} icon={User} title={s.title} subtitle={s.subtitle} onClick={() => runCommand(() => navigate({ to: s.link as any }))} />
                                                ))}
                                            </Command.Group>
                                        )}
                                        {results.tagihan.length > 0 && (
                                            <Command.Group heading={<span className="px-2 text-[11px] font-black text-slate-400 uppercase tracking-widest mt-6 mb-3 block">Tagihan (Invoice)</span>}>
                                                {results.tagihan.map(t => (
                                                    <DataItem key={t.id} icon={FileText} title={t.title} subtitle={t.subtitle} onClick={() => runCommand(() => navigate({ to: t.link as any }))} />
                                                ))}
                                            </Command.Group>
                                        )}
                                        {results.pembayaran.length > 0 && (
                                            <Command.Group heading={<span className="px-2 text-[11px] font-black text-slate-400 uppercase tracking-widest mt-6 mb-3 block">Pembayaran</span>}>
                                                {results.pembayaran.map(p => (
                                                    <DataItem key={p.id} icon={CreditCard} title={p.title} subtitle={p.subtitle} onClick={() => runCommand(() => { })} />
                                                ))}
                                            </Command.Group>
                                        )}
                                    </>
                                )}

                                {isLoading && (
                                    <div className="py-4 text-center text-xs text-slate-400 animate-pulse font-bold tracking-widest">
                                        MENCARI DATA...
                                    </div>
                                )}
                            </Command.List>

                            <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400 font-bold uppercase transition-colors">
                                <div className="flex gap-4">
                                    <span className="flex items-center gap-1.5"><Kbd>↵</Kbd> Pilih</span>
                                    <span className="flex items-center gap-1.5"><Kbd>↑↓</Kbd> Navigasi</span>
                                </div>
                                <span>Alizzah Command Center</span>
                            </div>
                        </Command>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    )
}

function PageItem({ icon: Icon, label, onClick, shortcut }: { icon: any, label: string, onClick: () => void, shortcut?: string }) {
    return (
        <Command.Item
            onSelect={onClick}
            className="flex items-center justify-between px-3 py-3 rounded-2xl cursor-pointer aria-selected:bg-blue-600 aria-selected:text-white group transition-all"
        >
            <div className="flex items-center gap-3">
                <div className="p-2 bg-slate-100 rounded-xl group-aria-selected:bg-white/20 text-slate-600 group-aria-selected:text-white">
                    <Icon size={18} />
                </div>
                <span className="text-sm font-bold">{label}</span>
            </div>
            {shortcut && (
                <div className="flex gap-1">
                    {shortcut.split(' ').map(s => <Kbd key={s} white>{s}</Kbd>)}
                </div>
            )}
        </Command.Item>
    )
}

function ActionItem({ icon: Icon, label, onClick }: { icon: any, label: string, onClick: () => void }) {
    return (
        <Command.Item
            onSelect={onClick}
            className="flex items-center gap-3 px-3 py-3 rounded-2xl cursor-pointer aria-selected:bg-slate-900 aria-selected:text-white group transition-all"
        >
            <div className="p-2 bg-slate-100 rounded-xl group-aria-selected:bg-white/20 text-slate-600 group-aria-selected:text-white">
                <Icon size={18} />
            </div>
            <span className="text-sm font-bold">{label}</span>
            <ArrowRight size={14} className="ml-auto opacity-0 group-aria-selected:opacity-100 transition-opacity" />
        </Command.Item>
    )
}

function DataItem({ icon: Icon, title, subtitle, onClick }: { icon: any, title: string, subtitle: string, onClick: () => void }) {
    return (
        <Command.Item
            onSelect={onClick}
            className="flex items-center gap-3 px-3 py-3 rounded-2xl cursor-pointer aria-selected:bg-blue-600 aria-selected:text-white group transition-all"
        >
            <div className="p-2 bg-slate-100 rounded-xl group-aria-selected:bg-white/20 text-slate-600 group-aria-selected:text-white">
                <Icon size={18} />
            </div>
            <div className="flex-1 min-w-0">
                <p className="text-sm font-bold truncate tracking-tight leading-tight">{title}</p>
                <p className="text-[11px] font-medium text-slate-400 group-aria-selected:text-blue-100 truncate">{subtitle}</p>
            </div>
        </Command.Item>
    )
}

function Kbd({ children, white }: { children: React.ReactNode, white?: boolean }) {
    return (
        <kbd className={`px-1.5 py-0.5 rounded border ${white ? 'bg-white/10 border-white/20 text-white' : 'bg-slate-100 border-slate-200 text-slate-400'} text-[9px] font-black`}>
            {children}
        </kbd>
    )
}
