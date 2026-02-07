import { prisma } from '../../../lib/prisma';
import ExcelJS from 'exceljs';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { formatCurrency, formatDate } from '@alizzah/shared';

export class LaporanService {
    /**
     * Get Tunggakan (Owed) per Rombel (Class)
     */
    async getTunggakanPerKelas(rombelId?: string) {
        const tagihans = await prisma.tagihan.findMany({
            where: {
                status: {
                    in: ['UNPAID', 'OVERDUE', 'PARTIAL']
                },
                ...(rombelId ? { siswa: { rombelId } } : {})
            },
            include: {
                siswa: {
                    include: {
                        rombel: true
                    }
                }
            },
            orderBy: [
                { siswa: { rombel: { nama: 'asc' } } },
                { siswa: { namaLengkap: 'asc' } }
            ]
        });

        // Group by Rombel and Siswa
        const result = tagihans.reduce((acc: any, tagihan: typeof tagihans[number]) => {
            const rombelName = tagihan.siswa.rombel?.nama || 'Tanpa Rombel';
            const studentId = tagihan.siswa.id;
            const studentName = tagihan.siswa.namaLengkap;

            if (!acc[rombelName]) acc[rombelName] = {};
            if (!acc[rombelName][studentId]) {
                acc[rombelName][studentId] = {
                    nama: studentName,
                    nis: tagihan.siswa.nis,
                    totalTunggakan: 0,
                    items: []
                };
            }

            acc[rombelName][studentId].totalTunggakan += Number(tagihan.sisaTagihan);
            acc[rombelName][studentId].items.push({
                periode: tagihan.periode,
                sisa: Number(tagihan.sisaTagihan)
            });

            return acc;
        }, {});

        return result;
    }

    /**
     * Get Tunggakan per Jenjang (Level)
     */
    async getTunggakanPerJenjang() {
        const tagihans = await prisma.tagihan.findMany({
            where: {
                status: {
                    in: ['UNPAID', 'OVERDUE', 'PARTIAL']
                }
            },
            include: {
                siswa: {
                    include: {
                        rombel: {
                            include: {
                                jenjang: true
                            }
                        }
                    }
                }
            },
            orderBy: {
                siswa: {
                    rombel: {
                        jenjang: {
                            urutan: 'asc'
                        }
                    }
                }
            }
        });

        const result = tagihans.reduce((acc: any, tagihan: typeof tagihans[number]) => {
            const jenjangName = tagihan.siswa.rombel?.jenjang?.nama || 'Tanpa Jenjang';
            if (!acc[jenjangName]) acc[jenjangName] = 0;
            acc[jenjangName] += Number(tagihan.sisaTagihan);
            return acc;
        }, {});

        return result;
    }

    /**
     * Get Daily Rekap for Cashier
     */
    async getRekapHarianKasir(tanggal: Date) {
        const start = new Date(tanggal);
        start.setHours(0, 0, 0, 0);
        const end = new Date(tanggal);
        end.setHours(23, 59, 59, 999);

        const pembayarans = await prisma.pembayaran.findMany({
            where: {
                tanggal: {
                    gte: start,
                    lte: end
                },
                status: 'AKTIF'
            },
            include: {
                kasir: true,
                siswa: true
            }
        });

        console.log(`[Rekap Kasir] Found ${pembayarans.length} transactions for ${tanggal.toISOString()}`);

        // Group by Cashier
        const rekap = pembayarans.reduce((acc: any, p: typeof pembayarans[number]) => {
            if (!p.kasir) {
                console.warn(`[Rekap Kasir] Warning: Transaction ${p.kode} has no kasir.`);
                return acc;
            }
            if (!p.siswa) {
                console.warn(`[Rekap Kasir] Warning: Transaction ${p.kode} has no siswa.`);
                return acc;
            }

            const kasirName = p.kasir.namaLengkap;
            if (!acc[kasirName]) {
                acc[kasirName] = {
                    totalTunai: 0,
                    totalTransfer: 0,
                    count: 0,
                    transactions: []
                };
            }

            const nominal = Number(p.totalBayar);
            if (p.metode === 'TUNAI') acc[kasirName].totalTunai += nominal;
            else acc[kasirName].totalTransfer += nominal;

            acc[kasirName].count += 1;
            acc[kasirName].transactions.push({
                kode: p.kode,
                siswa: p.siswa.namaLengkap,
                metode: p.metode,
                nominal: nominal
            });

            return acc;
        }, {});

        return rekap;
    }

    /**
     * Get Ledger (Buku Besar) for a specific Post
     */
    async getBukuBesarPerPos(posId: string, startDate: Date, endDate: Date) {
        const transactions = await prisma.transaksiKas.findMany({
            where: {
                posPengeluaranId: posId,
                createdAt: {
                    gte: startDate,
                    lte: endDate
                }
            },
            include: {
                kas: true,
                createdByUser: true
            },
            orderBy: {
                createdAt: 'asc'
            }
        });

        return transactions;
    }

    /**
     * EXPORT: Excel for Tunggakan
     */
    async exportTunggakanExcel(data: any): Promise<Buffer> {
        const workbook = new ExcelJS.Workbook();
        const sheet = workbook.addWorksheet('Laporan Tunggakan');

        sheet.columns = [
            { header: 'Rombel', key: 'rombel', width: 20 },
            { header: 'NIS', key: 'nis', width: 15 },
            { header: 'Nama Siswa', key: 'nama', width: 35 },
            { header: 'Total Tunggakan', key: 'total', width: 20 }
        ];

        // Style header
        sheet.getRow(1).font = { bold: true };

        Object.keys(data).forEach(rombelName => {
            Object.values(data[rombelName]).forEach((student: any) => {
                sheet.addRow({
                    rombel: rombelName,
                    nis: student.nis,
                    nama: student.nama,
                    total: student.totalTunggakan
                });
            });
        });

        // Format currency column
        sheet.getColumn('total').numFmt = '#,##0';

        return (await workbook.xlsx.writeBuffer()) as unknown as Buffer;
    }

    /**
     * EXPORT: PDF for Rekap Kasir
     */
    async exportRekapKasirPDF(data: any, tanggal: Date) {
        try {
            const doc = new jsPDF();
            const formattedDate = formatDate(tanggal);

            doc.setFontSize(18);
            doc.text('REKAP HARIAN KASIR', 105, 20, { align: 'center' });
            doc.setFontSize(12);
            doc.text(`Tanggal: ${formattedDate}`, 105, 30, { align: 'center' });

            let currentY = 40;

            const kasirNames = Object.keys(data);
            if (kasirNames.length === 0) {
                doc.text('Tidak ada transaksi pada tanggal ini.', 14, currentY);
            }

            kasirNames.forEach(kasirName => {
                const kasirData = data[kasirName];

                doc.setFontSize(14);
                doc.text(`Kasir: ${kasirName}`, 14, currentY);
                currentY += 5;

                autoTable(doc, {
                    startY: currentY,
                    head: [['Kode', 'Siswa', 'Metode', 'Nominal']],
                    body: kasirData.transactions.map((t: any) => [
                        t.kode,
                        t.siswa,
                        t.metode,
                        formatCurrency(t.nominal)
                    ]),
                    foot: [[
                        '',
                        'TOTAL',
                        '',
                        formatCurrency(kasirData.totalTunai + kasirData.totalTransfer)
                    ]],
                    theme: 'grid',
                    headStyles: { fillColor: [100, 100, 100], textColor: [255, 255, 255] },
                    footStyles: { fillColor: [240, 240, 240], textColor: [0, 0, 0], fontStyle: 'bold' }
                });

                currentY = (doc as any).lastAutoTable.finalY + 15;

                if (currentY > 270) {
                    doc.addPage();
                    currentY = 20;
                }
            });

            return Buffer.from(doc.output('arraybuffer'));
        } catch (error) {
            console.error('Error generating PDF:', error);
            throw error;
        }
    }
}
