import { prisma } from '../../../lib/prisma';
import { Decimal } from '@prisma/client/runtime/library';

export class DashboardService {
    /**
     * Get aggregate statistics for the dashboard
     */
    static async getStats() {
        const [penerimaan, totalSiswa, tunggakan, saldoKas] = await Promise.all([
            // Total Penerimaan (Total Bayar of AKTIF payments)
            prisma.pembayaran.aggregate({
                where: { status: 'AKTIF' },
                _sum: { totalBayar: true }
            }),
            // Jumlah Siswa Aktif
            prisma.siswa.count({
                where: { status: 'AKTIF' }
            }),
            // Total Tunggakan (Sisa Tagihan of unpaid invoices)
            prisma.tagihan.aggregate({
                where: {
                    status: { in: ['UNPAID', 'PARTIAL', 'DUE', 'OVERDUE'] }
                },
                _sum: { sisaTagihan: true }
            }),
            // Total Saldo Kas
            prisma.kas.aggregate({
                _sum: { saldo: true }
            })
        ]);

        return {
            totalPenerimaan: Number(penerimaan._sum.totalBayar || 0),
            totalSiswa,
            totalTunggakan: Number(tunggakan._sum.sisaTagihan || 0),
            totalSaldoKas: Number(saldoKas._sum.saldo || 0)
        };
    }

    /**
     * Get recent financial activities
     */
    static async getRecentActivities() {
        // Fetch last 10 payments
        const recentPayments = await prisma.pembayaran.findMany({
            where: { status: 'AKTIF' },
            take: 7,
            orderBy: { createdAt: 'desc' },
            include: {
                siswa: {
                    select: { namaLengkap: true }
                }
            }
        });

        // Map into activity items
        return recentPayments.map(p => ({
            id: p.id,
            name: p.siswa?.namaLengkap || 'Unknown',
            action: `Pembayaran ${p.kode}`,
            time: p.createdAt,
            amount: Number(p.totalBayar),
            type: 'MASUK',
            color: 'emerald'
        }));
    }
}
