import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import {
    queryTunggakanSchema,
    queryRekapHarianSchema,
    queryBukuBesarSchema
} from '@alizzah/validators';
import { LaporanService } from './laporan.service';
import { authMiddleware } from '../../../middleware/auth.middleware';
import { successResponse } from '../../../lib/response';

export const laporanRoutes = new Hono()
    .use('*', authMiddleware)

    /**
     * GET /keuangan/laporan/tunggakan
     */
    .get('/tunggakan',
        zValidator('query', queryTunggakanSchema),
        async (c) => {
            const { rombelId } = c.req.valid('query');
            const service = new LaporanService();
            const data = await service.getTunggakanPerKelas(rombelId);
            return successResponse(c, data);
        }
    )

    /**
     * GET /keuangan/laporan/tunggakan-jenjang
     */
    .get('/tunggakan-jenjang',
        async (c) => {
            const service = new LaporanService();
            const data = await service.getTunggakanPerJenjang();
            return successResponse(c, data);
        }
    )

    /**
     * GET /keuangan/laporan/tunggakan/export
     */
    .get('/tunggakan/export',
        zValidator('query', queryTunggakanSchema),
        async (c) => {
            const { rombelId } = c.req.valid('query');
            const service = new LaporanService();
            const data = await service.getTunggakanPerKelas(rombelId);
            const buffer = await service.exportTunggakanExcel(data);

            c.header('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
            c.header('Content-Disposition', 'attachment; filename="Laporan_Tunggakan.xlsx"');

            return c.body(new Uint8Array(buffer));
        }
    )

    /**
     * GET /keuangan/laporan/rekap-kasir
     */
    .get('/rekap-kasir',
        zValidator('query', queryRekapHarianSchema),
        async (c) => {
            const { tanggal } = c.req.valid('query');
            const date = tanggal ? new Date(tanggal) : new Date();
            const service = new LaporanService();
            const data = await service.getRekapHarianKasir(date);
            return successResponse(c, data);
        }
    )

    /**
     * GET /keuangan/laporan/rekap-kasir/export
     */
    .get('/rekap-kasir/export',
        zValidator('query', queryRekapHarianSchema),
        async (c) => {
            try {
                const { tanggal } = c.req.valid('query');
                const date = tanggal ? new Date(tanggal) : new Date();
                const service = new LaporanService();
                const data = await service.getRekapHarianKasir(date);
                const buffer = await service.exportRekapKasirPDF(data, date);

                c.header('Content-Type', 'application/pdf');
                c.header('Content-Disposition', `attachment; filename="Rekap_Kasir_${date.toISOString().split('T')[0]}.pdf"`);

                return c.body(new Uint8Array(buffer));
            } catch (error) {
                console.error('🔥 EXPORT ERROR:', error);
                return c.json({ success: false, message: 'Gagal mengekspor laporan' }, 500);
            }
        }
    )

    /**
     * GET /keuangan/laporan/buku-besar
     */
    .get('/buku-besar',
        zValidator('query', queryBukuBesarSchema),
        async (c) => {
            const { posId, startDate, endDate } = c.req.valid('query');
            const service = new LaporanService();
            const data = await service.getBukuBesarPerPos(
                posId,
                new Date(startDate),
                new Date(endDate)
            );
            return successResponse(c, data);
        }
    );
