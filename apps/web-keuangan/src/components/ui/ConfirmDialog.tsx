import { motion, AnimatePresence } from 'framer-motion'
import { AlertCircle, X, HelpCircle, AlertTriangle, Info } from 'lucide-react'
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs))
}

export type ConfirmDialogVariant = 'danger' | 'warning' | 'info' | 'success'

interface ConfirmDialogProps {
    isOpen: boolean
    onClose: () => void
    onConfirm: () => void
    title: string
    description: string
    confirmText?: string
    cancelText?: string
    variant?: ConfirmDialogVariant
    isLoading?: boolean
}

export function ConfirmDialog({
    isOpen,
    onClose,
    onConfirm,
    title,
    description,
    confirmText = 'Konfirmasi',
    cancelText = 'Batal',
    variant = 'info',
    isLoading = false
}: ConfirmDialogProps) {
    const icons = {
        danger: <AlertCircle className="text-red-600" size={24} />,
        warning: <AlertTriangle className="text-amber-600" size={24} />,
        info: <HelpCircle className="text-blue-600" size={24} />,
        success: <Info className="text-emerald-600" size={24} />
    }

    const colors = {
        danger: 'bg-red-50 text-red-600 border-red-100',
        warning: 'bg-amber-50 text-amber-600 border-amber-100',
        info: 'bg-blue-50 text-blue-600 border-blue-100',
        success: 'bg-emerald-50 text-emerald-600 border-emerald-100'
    }

    const buttonColors = {
        danger: 'bg-red-600 hover:bg-red-700 shadow-red-200',
        warning: 'bg-amber-600 hover:bg-amber-700 shadow-amber-200',
        info: 'bg-blue-600 hover:bg-blue-700 shadow-blue-200',
        success: 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-200'
    }

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-100 flex items-center justify-center p-4">
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
                    />

                    {/* Modal Content */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden border border-slate-200"
                    >
                        <div className="p-6">
                            <div className="flex items-start gap-4">
                                <div className={cn("p-3 rounded-xl border shrink-0", colors[variant])}>
                                    {icons[variant]}
                                </div>
                                <div className="flex-1">
                                    <h3 className="text-lg font-bold text-slate-900 leading-tight">
                                        {title}
                                    </h3>
                                    <p className="mt-2 text-sm text-slate-500 leading-relaxed font-medium">
                                        {description}
                                    </p>
                                </div>
                                <button
                                    onClick={onClose}
                                    className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition-colors"
                                >
                                    <X size={20} />
                                </button>
                            </div>

                            <div className="mt-8 flex items-center gap-3">
                                <button
                                    onClick={onClose}
                                    disabled={isLoading}
                                    className="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-100 transition-colors border border-transparent"
                                >
                                    {cancelText}
                                </button>
                                <button
                                    onClick={onConfirm}
                                    disabled={isLoading}
                                    className={cn(
                                        "flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold text-white transition-all shadow-lg active:scale-95 disabled:opacity-50 disabled:active:scale-100",
                                        buttonColors[variant]
                                    )}
                                >
                                    {isLoading ? (
                                        <div className="flex items-center justify-center gap-2">
                                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                            <span>Memproses...</span>
                                        </div>
                                    ) : (
                                        confirmText
                                    )}
                                </button>
                            </div>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    )
}
