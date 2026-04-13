import React, { useRef } from 'react';
import { useNavigate } from '@tanstack/react-router';
import {
    X,
    FileText,
    Download,
    Printer,
    CheckCircle,
    Clock,
    CreditCard,
    Receipt
} from 'lucide-react';
import { motion } from 'framer-motion';
import { formatCurrency } from '@alizzah/shared';

interface TagihanDetailModalProps {
    isOpen: boolean;
    onClose: () => void;
    tagihan: any;
}

export function TagihanDetailModal({ isOpen, onClose, tagihan }: TagihanDetailModalProps) {
    const printRef = useRef<HTMLDivElement>(null);
    const navigate = useNavigate();

    if (!isOpen || !tagihan) return null;

    const handlePrint = () => {
        const content = printRef.current;
        if (!content) return;

        const printWindow = window.open('', '_blank');
        if (!printWindow) return;

        printWindow.document.write(`
            <html>
                <head>
                    <title>Invoice - ${tagihan.kode}</title>
                    <style>
                        body { font-family: 'Inter', 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 40px; color: #1e293b; background: white; }
                        .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #e2e8f0; padding-bottom: 20px; margin-bottom: 30px; }
                        .school-name { font-size: 24px; font-weight: 800; color: #4f46e5; text-transform: uppercase; letter-spacing: -0.025em; }
                        .invoice-info { text-align: right; }
                        .invoice-title { font-size: 20px; font-weight: 800; color: #1e293b; margin-bottom: 4px; text-transform: uppercase; }
                        .invoice-code { font-family: monospace; font-size: 12px; color: #64748b; }
                        .grid { display: grid; grid-template-cols: 1fr 1fr; gap: 40px; margin-bottom: 40px; }
                        .section-label { font-size: 10px; font-weight: 700; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 12px; }
                        .student-card { display: flex; align-items: center; gap: 12px; }
                        .student-avatar { width: 48px; height: 48px; background: #f5f3ff; color: #4f46e5; border-radius: 12px; display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 20px; border: 1px solid #ddd6fe; }
                        .student-name { font-weight: 800; font-size: 16px; color: #1e293b; }
                        .student-meta { font-size: 11px; color: #64748b; font-family: monospace; text-transform: uppercase; }
                        table { width: 100%; border-collapse: collapse; margin-bottom: 40px; }
                        th { text-align: left; font-size: 10px; color: #64748b; text-transform: uppercase; padding: 12px 16px; border-bottom: 1px solid #e2e8f0; background: #f8fafc; font-weight: 700; letter-spacing: 0.05em; }
                        td { padding: 16px; border-bottom: 1px solid #f1f5f9; font-size: 13px; }
                        .item-name { font-weight: 700; color: #334155; text-transform: uppercase; font-size: 12px; }
                        .amount { font-weight: 700; text-align: right; font-family: 'JetBrains Mono', monospace; }
                        .discount-row td { padding-top: 4px; padding-bottom: 4px; background: #f0fdf4; }
                        .discount-label { color: #16a34a; font-size: 10px; font-weight: 700; font-style: italic; padding-left: 20px; }
                        .discount-amount { color: #16a34a; font-weight: 700; text-align: right; font-size: 11px; }
                        .total-row { background: #f1f5f9; font-weight: 800; font-size: 16px; }
                        .footer { margin-top: 60px; font-size: 10px; color: #94a3b8; text-align: center; border-top: 1px dashed #e2e8f0; padding-top: 20px; }
                        @media print {
                            body { padding: 0; }
                            .no-print { display: none; }
                        }
                    </style>
                </head>
                <body>
                    <div class="header">
                        <div>
                            <div class="school-name">AL IZZAH SCHOOL</div>
                            <div style="font-size: 10px; color: #64748b; margin-top: 4px; font-weight: 500;">Sistem Keuangan & Tagihan Terpadu</div>
                        </div>
                        <div class="invoice-info">
                            <div class="invoice-title">Invoice</div>
                            <div class="invoice-code">${tagihan.kode}</div>
                        </div>
                    </div>

                    <div class="grid">
                        <div>
                            <div class="section-label">Penerima Tagihan</div>
                            <div class="student-card">
                                <div class="student-avatar">${(tagihan.siswa?.namaLengkap || tagihan.pesertaDaycare?.namaLengkap || '?').charAt(0)}</div>
                                <div>
                                    <div class="student-name">${tagihan.siswa?.namaLengkap || tagihan.pesertaDaycare?.namaLengkap || 'PESERTA'}</div>
                                    <div class="student-meta">${tagihan.siswa?.nis || 'DAYCARE'} • ${tagihan.rombelSnapshot}</div>
                                </div>
                            </div>
                        </div>
                        <div style="text-align: right;">
                            <div class="section-label">Detail Invoice</div>
                            <div style="font-size: 13px; font-weight: 700; color: #1e293b;">Periode: ${tagihan.periode}</div>
                            <div style="font-size: 11px; font-weight: 500; color: #64748b; margin-top: 4px;">Jatuh Tempo: ${new Date(tagihan.jatuhTempo).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</div>
                        </div>
                    </div>

                    <table>
                        <thead>
                            <tr>
                                <th>Deskripsi Item</th>
                                <th style="text-align: right;">Jumlah</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${tagihan.tagihanItems.map((item: any) => `
                                <tr>
                                    <td><div class="item-name">${item.namaItem}</div></td>
                                    <td class="amount">${formatCurrency(item.nominalAwal)}</td>
                                </tr>
                                ${item.nominalDiskon > 0 ? `
                                    <tr class="discount-row">
                                        <td><div class="discount-label">• Potongan Diskon</div></td>
                                        <td class="discount-amount">-${formatCurrency(item.nominalDiskon)}</td>
                                    </tr>
                                ` : ''}
                            `).join('')}
                        </tbody>
                        <tfoot>
                            <tr class="total-row">
                                <td style="padding: 20px 16px; text-transform: uppercase; font-size: 12px; letter-spacing: 0.1em;">Total Yang Harus Dibayar</td>
                                <td style="padding: 20px 16px; text-align: right; color: #4f46e5; border-left: 2px solid white;">${formatCurrency(tagihan.sisaTagihan)}</td>
                            </tr>
                        </tfoot>
                    </table>

                    <div style="display: flex; gap: 40px; margin-bottom: 40px;">
                        <div style="flex: 1; padding: 20px; border-radius: 12px; border: 1px solid #f1f5f9; background: #f8fafc;">
                            <div class="section-label">Status Terkini</div>
                            <div style="display: flex; justify-content: space-between; margin-top: 8px;">
                                <span style="font-size: 11px; font-weight: 600; color: #64748b;">Terbayar:</span>
                                <span style="font-size: 11px; font-weight: 700; color: #16a34a;">${formatCurrency(tagihan.totalBayar)}</span>
                            </div>
                            <div style="display: flex; justify-content: space-between; margin-top: 4px;">
                                <span style="font-size: 11px; font-weight: 600; color: #64748b;">Sisa Tunggakan:</span>
                                <span style="font-size: 11px; font-weight: 700; color: #e11d48;">${formatCurrency(tagihan.sisaTagihan)}</span>
                            </div>
                        </div>
                        <div style="flex: 1; border: 1px solid #f1f5f9; border-radius: 12px; padding: 20px; display: flex; flex-direction: column; align-items: center; justify-content: center;">
                            <div style="font-size: 10px; font-weight: 700; color: #94a3b8; text-transform: uppercase;">Stempel / TTD Bagian Keuangan</div>
                            <div style="height: 60px;"></div>
                            <div style="font-size: 12px; font-weight: 800; border-top: 1px solid #000; width: 150px; text-align: center; padding-top: 4px;">BENDAHARA SEKOLAH</div>
                        </div>
                    </div>

                    <div class="footer">
                        Invoice ini diterbitkan oleh Sistem Keuangan Al Izzah secara otomatis pada ${new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}.
                    </div>
                    <script>window.print(); setTimeout(() => window.close(), 500);</script>
                </body>
            </html>
        `);
        printWindow.document.close();
    };

    const handlePayNow = () => {
        navigate({
            to: '/keuangan/pembayaran',
            search: { 
                siswaId: tagihan.siswaId,
                pesertaDaycareId: tagihan.pesertaDaycareId
            } as any
        });
        onClose();
    };

    const statusBadge = (status: string) => {
        switch (status) {
            case 'PAID':
                return <span className="px-3 py-1 bg-emerald-50 text-emerald-600 text-[10px] font-bold rounded-full border border-emerald-100 uppercase tracking-widest flex items-center gap-1.5"><CheckCircle size={12} /> Lunas</span>;
            case 'PARTIAL':
                return <span className="px-3 py-1 bg-blue-50 text-blue-600 text-[10px] font-bold rounded-full border border-blue-100 uppercase tracking-widest flex items-center gap-1.5"><Clock size={12} /> Dicicil</span>;
            default:
                return <span className="px-3 py-1 bg-slate-100 text-slate-500 text-[10px] font-bold rounded-full border border-slate-200 uppercase tracking-widest flex items-center gap-1.5"><Clock size={12} /> Belum Bayar</span>;
        }
    };

    const formatDate = (date: string) => {
        return new Date(date).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto">
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={onClose}
                className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm"
            />

            <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl overflow-hidden border border-slate-200 flex flex-col"
            >
                {/* Header */}
                <div className="px-5 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-indigo-600 text-white rounded-xl shadow-lg shadow-indigo-100">
                            <FileText size={20} />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-slate-900 leading-tight">Rincian Invoice</h2>
                            <p className="text-[10px] text-slate-400 font-mono mt-1 lowercase tracking-tighter italic">{tagihan.kode}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-1">
                        <button
                            onClick={handlePrint}
                            className="p-1.5 text-slate-400 hover:bg-white hover:text-blue-600 rounded-full transition-all border border-transparent hover:border-slate-100"
                        >
                            <Printer size={18} />
                        </button>
                        <button onClick={onClose} className="p-1.5 hover:bg-white rounded-full transition-all text-slate-400 border border-transparent hover:border-slate-100">
                            <X size={18} />
                        </button>
                    </div>
                </div>

                <div className="overflow-y-auto max-h-[70vh] custom-scrollbar" ref={printRef}>
                    {/* Student Info & Status Row */}
                    <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-5 border-b border-slate-100">
                        <div className="space-y-3">
                            <h3 className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] leading-none mb-1">Penerima Tagihan</h3>
                            <div className="flex items-center gap-3.5">
                                <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center font-black text-base border border-indigo-100 uppercase">
                                    {(tagihan.siswa?.namaLengkap || tagihan.pesertaDaycare?.namaLengkap || '?').charAt(0)}
                                </div>
                                <div>
                                    <div className="font-extrabold text-slate-900 text-sm uppercase tracking-tight">{tagihan.siswa?.namaLengkap || tagihan.pesertaDaycare?.namaLengkap || 'PESERTA'}</div>
                                    <div className="text-[10px] text-slate-400 font-mono tracking-tighter uppercase font-medium">{tagihan.siswa?.nis || 'DAYCARE'} • {tagihan.rombelSnapshot}</div>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-3 md:text-right md:flex md:flex-col md:items-end">
                            <h3 className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] leading-none mb-1">Status Pembayaran</h3>
                            {statusBadge(tagihan.status)}
                            <div className="mt-1.5 text-[10px] text-slate-400 font-medium">
                                Jatuh Tempo: <span className="font-black text-slate-600 tracking-tight">{formatDate(tagihan.jatuhTempo)}</span>
                            </div>
                        </div>
                    </div>

                    {/* Items Table */}
                    <div className="p-5 space-y-3">
                        <h3 className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">Rincian Item</h3>
                        <div className="bg-slate-50/50 rounded-xl border border-slate-100 overflow-hidden">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="border-b border-slate-100 bg-white/50">
                                        <th className="px-4 py-2.5 text-[9px] font-black text-slate-500 uppercase tracking-widest">Deskripsi</th>
                                        <th className="px-4 py-2.5 text-[9px] font-black text-slate-500 uppercase tracking-widest text-right">Jumlah</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100/50">
                                    {tagihan.tagihanItems?.map((item: any) => (
                                        <React.Fragment key={item.id}>
                                            <tr className="group">
                                                <td className="px-4 py-2.5">
                                                    <div className="text-xs font-extrabold text-slate-700 uppercase tracking-tight">{item.namaItem}</div>
                                                </td>
                                                <td className="px-4 py-2.5 text-xs font-black text-right text-slate-900 font-mono">
                                                    {formatCurrency(item.nominalAwal)}
                                                </td>
                                            </tr>
                                            {item.nominalDiskon > 0 && (
                                                <tr className="bg-emerald-50/20">
                                                    <td className="px-4 py-1.5">
                                                        <div className="text-[9px] text-emerald-600 font-black italic uppercase tracking-widest pl-3 flex items-center gap-1.5">
                                                            <div className="w-1 h-1 rounded-full bg-emerald-400" />
                                                            Potongan Diskon
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-1.5 text-[10px] font-black text-right text-emerald-600 italic font-mono">
                                                        -{formatCurrency(item.nominalDiskon)}
                                                    </td>
                                                </tr>
                                            )}
                                        </React.Fragment>
                                    ))}
                                </tbody>
                                <tfoot>
                                    <tr className="bg-white border-t border-slate-100">
                                        <td className="px-4 py-3 text-xs font-black text-slate-900 uppercase">Total Tagihan</td>
                                        <td className="px-4 py-3 text-base font-black text-indigo-600 text-right font-mono">
                                            {formatCurrency(tagihan.sisaTagihan)}
                                        </td>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>
                    </div>

                    {/* Payment Summary */}
                    <div className="px-5 pb-5 grid grid-cols-2 lg:grid-cols-3 gap-4">
                        <div className="p-3 bg-emerald-50/30 rounded-xl border border-emerald-100/50">
                            <p className="text-[9px] font-black text-emerald-600 uppercase tracking-widest mb-1 leading-none">Sudah Bayar</p>
                            <p className="text-xs font-black text-emerald-700 font-mono">{formatCurrency(tagihan.totalBayar)}</p>
                        </div>
                        <div className="p-3 bg-rose-50/30 rounded-xl border border-rose-100/50">
                            <p className="text-[9px] font-black text-rose-600 uppercase tracking-widest mb-1 leading-none">Sisa Piutang</p>
                            <p className="text-xs font-black text-rose-700 font-mono">{formatCurrency(tagihan.sisaTagihan)}</p>
                        </div>
                    </div>
                </div>

                {/* Footer Actions */}
                <div className="px-5 py-4 bg-slate-50/80 border-t border-slate-100 flex flex-col sm:flex-row gap-3 items-center justify-between">
                    <div className="flex items-center gap-2 text-[9px] text-slate-400 font-black uppercase tracking-widest">
                        <Receipt size={12} className="text-indigo-500" /> {formatDate(tagihan.tanggalTagihan)}
                    </div>
                    <div className="flex items-center gap-2.5 w-full sm:w-auto">
                        <button
                            onClick={handlePrint}
                            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-600 text-[10px] font-black rounded-lg hover:bg-slate-50 transition-all uppercase tracking-wider"
                        >
                            <Download size={14} /> PDF
                        </button>
                        {tagihan.status !== 'PAID' && (
                            <button
                                onClick={handlePayNow}
                                className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600 text-white text-[10px] font-black rounded-lg hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 uppercase tracking-wider"
                            >
                                <CreditCard size={14} /> Bayar
                            </button>
                        )}
                    </div>
                </div>
            </motion.div>
        </div>
    );
}
