import { prisma } from '../../../lib/prisma';

export class SearchService {
    /**
     * Search across multiple entities
     */
    static async globalSearch(query: string) {
        if (!query || query.length < 2) return { siswa: [], tagihan: [], pembayaran: [] };

        const [siswas, tagihans, pembayarans] = await Promise.all([
            // Search Siswa
            prisma.siswa.findMany({
                where: {
                    OR: [
                        { namaLengkap: { contains: query, mode: 'insensitive' } },
                        { nis: { contains: query, mode: 'insensitive' } }
                    ]
                },
                take: 5,
                select: { id: true, namaLengkap: true, nis: true }
            }),
            // Search Tagihan
            prisma.tagihan.findMany({
                where: {
                    kode: { contains: query, mode: 'insensitive' }
                },
                take: 5,
                select: { id: true, kode: true, periode: true }
            }),
            // Search Pembayaran
            prisma.pembayaran.findMany({
                where: {
                    kode: { contains: query, mode: 'insensitive' }
                },
                take: 5,
                select: { id: true, kode: true, totalBayar: true }
            })
        ]);

        return {
            siswa: siswas.map(s => ({ id: s.id, title: s.namaLengkap, subtitle: `NIS: ${s.nis}`, type: 'SISWA', link: `/keuangan/pembayaran?siswaId=${s.id}` })),
            tagihan: tagihans.map(t => ({ id: t.id, title: t.kode, subtitle: `Periode: ${t.periode}`, type: 'TAGIHAN', link: `/keuangan/billing` })),
            pembayaran: pembayarans.map(p => ({ id: p.id, title: p.kode, subtitle: `Total: Rp ${p.totalBayar.toNumber().toLocaleString('id-ID')}`, type: 'PEMBAYARAN' }))
        };
    }
}
