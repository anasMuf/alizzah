
import {
    X,
    Printer,
    Receipt
} from 'lucide-react';
import { motion } from 'framer-motion';
import { formatCurrency } from '@alizzah/shared';
import { useRef } from 'react';

interface ReceiptModalProps {
    isOpen: boolean;
    onClose: () => void;
    pembayaran: any;
}

export function ReceiptModal({ isOpen, onClose, pembayaran }: ReceiptModalProps) {
    const printRef = useRef<HTMLDivElement>(null);

    const handlePrint = () => {
        const content = printRef.current;
        if (!content) return;

        const printWindow = window.open('', '_blank');
        if (!printWindow) return;

        printWindow.document.write(`
            <html>
                <head>
                    <title>Kuitansi Pembayaran - ${pembayaran?.kode}</title>
                    <style>
                        body { font-family: 'Inter', sans-serif; padding: 40px; color: #1e293b; background: white; }
                        .header { text-align: center; border-bottom: 2px solid #e2e8f0; padding-bottom: 20px; margin-bottom: 30px; }
                        .logo { font-size: 24px; font-weight: 800; color: #2563eb; margin-bottom: 5px; }
                        .address { font-size: 10px; color: #64748b; }
                        .title { font-size: 18px; font-weight: 700; text-transform: uppercase; margin: 20px 0; }
                        .grid { display: grid; grid-template-cols: 1fr 1fr; gap: 40px; margin-bottom: 30px; }
                        .label { font-size: 10px; font-weight: 700; color: #64748b; text-transform: uppercase; }
                        .value { font-size: 14px; font-weight: 600; }
                        table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
                        th { text-align: left; font-size: 10px; color: #64748b; text-transform: uppercase; padding: 10px; border-bottom: 1px solid #e2e8f0; }
                        td { padding: 15px 10px; border-bottom: 1px solid #f1f5f9; font-size: 13px; }
                        .total-row { background: #f8fafc !important; -webkit-print-color-adjust: exact; font-weight: 800; }
                        .footer { margin-top: 60px; display: flex; justify-content: space-between; }
                        .signature { text-align: center; width: 220px; }
                        .signature-line { border-top: 1px solid #000; margin-top: 80px; padding-top: 5px; font-size: 12px; font-weight: 700; }
                        @media print {
                            body { padding: 0; }
                            .no-print { display: none; }
                            .p-6 { padding: 0 !important; border: none !important; box-shadow: none !important; }
                        }
                    </style>
                </head>
                <body>
                    ${content.innerHTML}
                    <script>window.print(); setTimeout(() => window.close(), 500);</script>
                </body>
            </html>
        `);
        printWindow.document.close();
    };

    if (!isOpen || !pembayaran) return null;

    return (
        <div className="fixed inset-0 z-100 flex items-center justify-center p-4 overflow-y-auto">
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
                className="relative w-full max-w-2xl bg-white rounded-[2.5rem] shadow-2xl overflow-hidden border border-slate-200 flex flex-col"
            >
                {/* Modal Header */}
                <div className="px-8 py-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-blue-600 text-white rounded-2xl shadow-lg shadow-blue-100">
                            <Receipt size={24} />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-slate-900 leading-none">Bukti Pembayaran</h2>
                            <p className="text-xs text-slate-400 font-mono mt-1 lowercase tracking-tighter">{pembayaran.kode}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={handlePrint}
                            className="p-2 text-slate-400 hover:bg-white hover:text-blue-600 rounded-full transition-all border border-transparent hover:border-slate-100"
                        >
                            <Printer size={20} />
                        </button>
                        <button onClick={onClose} className="p-2 hover:bg-white rounded-full transition-all text-slate-400 border border-transparent hover:border-slate-100">
                            <X size={20} />
                        </button>
                    </div>
                </div>

                <div className="overflow-y-auto max-h-[70vh] p-8">
                    <div ref={printRef} className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
                        <div className="header text-center border-b-2 border-slate-100 pb-6 mb-8">
                            <div className="text-2xl font-black text-blue-600 tracking-tighter">AL IZZAH SCHOOL</div>
                            <div className="text-[10px] text-slate-400 font-medium mt-1 uppercase tracking-widest">
                                Sistem Keuangan Sekolah Terpadu
                            </div>
                        </div>

                        <div className="text-center mb-8">
                            <h3 className="text-lg font-black text-slate-900 uppercase tracking-[0.2em]">Kuitansi Pembayaran</h3>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 sm:gap-10 mb-10">
                            <div className="space-y-4">
                                <div>
                                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">No. Transaksi</div>
                                    <div className="text-sm font-black text-slate-900">{pembayaran.kode}</div>
                                </div>
                                <div>
                                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Tanggal Bayar</div>
                                    <div className="text-sm font-bold text-slate-700">{new Date(pembayaran.tanggal).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</div>
                                </div>
                            </div>
                            <div className="space-y-4">
                                <div>
                                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Nama Siswa</div>
                                    <div className="text-sm font-black text-blue-600 uppercase tracking-tight">{pembayaran.siswa.namaLengkap}</div>
                                </div>
                                <div>
                                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">NIS / Rombel</div>
                                    <div className="text-sm font-bold text-slate-700 uppercase tracking-tighter">{pembayaran.siswa.nis} • {pembayaran.siswa.rombel?.nama || 'N/A'}</div>
                                </div>
                            </div>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full mb-10 border-collapse min-w-[500px] sm:min-w-0">
                                <thead>
                                    <tr className="border-b border-slate-200">
                                        <th className="text-left py-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Keterangan Alokasi</th>
                                        <th className="text-right py-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Nominal</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {pembayaran.pembayaranAlokasis?.map((alokasi: any) => (
                                        <tr key={alokasi.id}>
                                            <td className="py-4">
                                                <div className="text-xs font-bold text-slate-800">Tagihan Periode {alokasi.tagihan.periode}</div>
                                                <div className="text-[9px] text-slate-400 font-mono uppercase mb-2">{alokasi.tagihan.kode}</div>

                                                {/* Detailed Items Breakdown */}
                                                <div className="space-y-1 ml-2 border-l-2 border-slate-100 pl-3">
                                                    {alokasi.tagihan.tagihanItems?.map((item: any) => (
                                                        <div key={item.id} className="flex justify-between items-center text-[10px] text-slate-500">
                                                            <span>• {item.namaItem}</span>
                                                            <span className="font-medium">{formatCurrency(item.nominalAkhir)}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </td>
                                            <td className="text-right font-black text-slate-900 text-sm align-top pt-4">
                                                {formatCurrency(alokasi.nominalAlokasi)}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                                <tfoot>
                                    <tr className="bg-slate-50 border-t-2 border-slate-200">
                                        <td className="py-5 px-4 text-xs font-black text-slate-900 uppercase">Total Dibayar ({pembayaran.metode})</td>
                                        <td className="py-5 px-4 text-right text-xl font-black text-blue-600">
                                            {formatCurrency(pembayaran.totalBayar)}
                                        </td>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>

                        <div className="flex flex-col sm:flex-row justify-between items-center sm:items-start gap-12 sm:gap-0 mt-12 mb-6">
                            <div className="text-center w-48">
                                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-16">Penerima (Kasir)</div>
                                <div className="border-t border-slate-900 pt-2 text-xs font-black uppercase">{pembayaran.kasir.namaLengkap}</div>
                            </div>
                            <div className="text-center w-48">
                                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-16">Penyetor / Wali Murid</div>
                                <div className="border-t border-slate-900 pt-2 text-xs font-black uppercase">&nbsp;</div>
                            </div>
                        </div>

                        <div className="text-center pt-6 border-t border-dashed border-slate-200">
                            <p className="text-[9px] text-slate-400 font-medium italic">
                                * Dokumen ini adalah bukti pembayaran sah yang dikeluarkan secara elektronik oleh Al Izzah School.
                            </p>
                        </div>
                    </div>
                </div>

                {/* Modal Footer */}
                <div className="px-8 py-6 bg-slate-50 border-t border-slate-100 flex gap-4">
                    <button
                        onClick={handlePrint}
                        className="flex-1 flex items-center justify-center gap-2 py-4 bg-blue-600 text-white font-black rounded-2xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-100"
                    >
                        <Printer size={18} /> Cetak Bukti
                    </button>
                    <button
                        onClick={onClose}
                        className="px-8 py-4 bg-white border border-slate-200 text-slate-600 font-bold rounded-2xl hover:bg-slate-50 transition-all"
                    >
                        Tutup
                    </button>
                </div>
            </motion.div>
        </div>
    );
}
