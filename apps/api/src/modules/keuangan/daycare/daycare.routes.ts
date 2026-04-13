import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { 
  createPesertaDaycareSchema, 
  updatePesertaDaycareSchema, 
  listPesertaDaycareQuerySchema,
  createTagihanHarianSchema,
  batchTagihanHarianSchema
} from '@alizzah/validators';
import { DaycareService } from './daycare.service';
import { authMiddleware } from '../../../middleware/auth.middleware';
import { successResponse, errorResponse } from '../../../lib/response';

export const daycareRoutes = new Hono();

daycareRoutes.use('*', authMiddleware);

daycareRoutes.get('/peserta', zValidator('query', listPesertaDaycareQuerySchema), async (c) => {
  const query = c.req.valid('query');
  try {
    const result = await DaycareService.findAll(query);
    return successResponse(c, result);
  } catch (error: any) {
    return errorResponse(c, error.message, 400);
  }
});

daycareRoutes.get('/peserta/:id', async (c) => {
  const id = c.req.param('id');
  try {
    const result = await DaycareService.findById(id);
    return successResponse(c, result);
  } catch (error: any) {
    return errorResponse(c, error.message, 400);
  }
});

daycareRoutes.post('/peserta', zValidator('json', createPesertaDaycareSchema), async (c) => {
  const data = c.req.valid('json');
  try {
    const result = await DaycareService.create(data);
    return successResponse(c, result, 'Peserta daycare berhasil didaftarkan', 201);
  } catch (error: any) {
    return errorResponse(c, error.message, 400);
  }
});

daycareRoutes.put('/peserta/:id', zValidator('json', updatePesertaDaycareSchema), async (c) => {
  const id = c.req.param('id');
  const data = c.req.valid('json');
  try {
    const result = await DaycareService.update(id, data);
    return successResponse(c, result, 'Data peserta daycare berhasil diperbarui');
  } catch (error: any) {
    return errorResponse(c, error.message, 400);
  }
});

daycareRoutes.delete('/peserta/:id', async (c) => {
  const id = c.req.param('id');
  try {
    const result = await DaycareService.deactivate(id);
    return successResponse(c, result, 'Peserta daycare berhasil dinonaktifkan');
  } catch (error: any) {
    return errorResponse(c, error.message, 400);
  }
});

daycareRoutes.post('/tagihan-harian', zValidator('json', createTagihanHarianSchema), async (c) => {
  const data = c.req.valid('json');
  try {
    const result = await DaycareService.createTagihanHarian(data);
    return successResponse(c, result, 'Tagihan harian daycare berhasil dibuat', 201);
  } catch (error: any) {
    return errorResponse(c, error.message, 400);
  }
});

daycareRoutes.post('/tagihan-harian/batch', zValidator('json', batchTagihanHarianSchema), async (c) => {
  const data = c.req.valid('json');
  try {
    const result = await DaycareService.batchCreateTagihanHarian(data);
    return successResponse(c, result, 'Proses pembuatan tagihan harian massal selesai');
  } catch (error: any) {
    return errorResponse(c, error.message, 400);
  }
});

daycareRoutes.get('/export', async (c) => {
  try {
    const buffer = await DaycareService.exportExcel();
    c.header('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    c.header('Content-Disposition', 'attachment; filename="data-peserta-daycare.xlsx"');
    return c.body(buffer as any);
  } catch (error: any) {
    return errorResponse(c, error.message, 400);
  }
});

