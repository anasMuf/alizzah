import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import {
    createKasSchema,
    updateKasSchema,
    kasirMasukSchema,
    kasirKeluarSchema,
    transferKasSchema,
    rekonsiliasiFisikSchema,
} from '@alizzah/validators';
import { KasService } from './kas.service';
import { APIResponse } from '@alizzah/shared';
import { authMiddleware, AuthUser } from '../../../middleware/auth.middleware';

const app = new Hono();

app.use('*', authMiddleware);

// ==================== KAS ACCOUNT ROUTES ====================

// Get Summary Statistics
app.get('/summary', async (c) => {
    const result = await KasService.getKasSummary();
    return c.json<APIResponse<typeof result>>({
        success: true,
        data: result
    });
});

// List all Kas accounts
app.get('/', async (c) => {
    const result = await KasService.findAllKas();
    return c.json<APIResponse<typeof result>>({
        success: true,
        data: result
    });
});

// ==================== TRANSACTION ROUTES ====================

// List Transactions
app.get('/transaksi', async (c) => {
    const kasId = c.req.query('kasId');
    const tipeTransaksi = c.req.query('tipeTransaksi') as 'MASUK' | 'KELUAR' | 'TRANSFER' | undefined;
    const tanggalMulai = c.req.query('tanggalMulai');
    const tanggalSelesai = c.req.query('tanggalSelesai');
    const search = c.req.query('search');
    const page = parseInt(c.req.query('page') || '1');
    const limit = parseInt(c.req.query('limit') || '20');

    const result = await KasService.findAllTransaksi({
        kasId,
        tipeTransaksi,
        tanggalMulai: tanggalMulai ? new Date(tanggalMulai) : undefined,
        tanggalSelesai: tanggalSelesai ? new Date(tanggalSelesai) : undefined,
        search,
        page,
        limit
    });
    return c.json<APIResponse<typeof result>>({
        success: true,
        data: result
    });
});

// Get Kas by ID
app.get('/:id', async (c) => {
    const id = c.req.param('id');
    const result = await KasService.getKasById(id);
    return c.json<APIResponse<typeof result>>({
        success: true,
        data: result
    });
});

// Create Kas
app.post('/', zValidator('json', createKasSchema), async (c) => {
    const input = c.req.valid('json');
    const result = await KasService.createKas(input);
    return c.json<APIResponse<typeof result>>({
        success: true,
        data: result
    }, 201);
});

// Update Kas
app.patch('/:id', zValidator('json', updateKasSchema), async (c) => {
    const id = c.req.param('id');
    const input = c.req.valid('json');
    const result = await KasService.updateKas(id, input);
    return c.json<APIResponse<typeof result>>({
        success: true,
        data: result
    });
});


// Cash In - Uang Masuk
app.post('/masuk', zValidator('json', kasirMasukSchema), async (c) => {
    const user = c.get('user') as AuthUser;
    const input = c.req.valid('json');

    const result = await KasService.kasirMasuk(input, user.id);
    return c.json<APIResponse<typeof result>>({
        success: true,
        data: result
    }, 201);
});

// Cash Out - Uang Keluar
app.post('/keluar', zValidator('json', kasirKeluarSchema), async (c) => {
    const user = c.get('user') as AuthUser;
    const input = c.req.valid('json');

    const result = await KasService.kasirKeluar(input, user.id);
    return c.json<APIResponse<typeof result>>({
        success: true,
        data: result
    }, 201);
});

// Transfer between Kas & Berangkas
app.post('/transfer', zValidator('json', transferKasSchema), async (c) => {
    const user = c.get('user') as AuthUser;
    const input = c.req.valid('json');

    const result = await KasService.transferKas(input, user.id);
    return c.json<APIResponse<typeof result>>({
        success: true,
        data: result
    }, 201);
});

// ==================== RECONCILIATION ROUTES ====================

// Get Daily Reconciliation Data
app.get('/rekonsiliasi/:kasId', async (c) => {
    const kasId = c.req.param('kasId');
    const tanggalParam = c.req.query('tanggal');
    const tanggal = tanggalParam ? new Date(tanggalParam) : new Date();

    const result = await KasService.getDailyReconciliation(kasId, tanggal);
    return c.json<APIResponse<typeof result>>({
        success: true,
        data: result
    });
});

// Submit Physical Cash Reconciliation
app.post('/rekonsiliasi', zValidator('json', rekonsiliasiFisikSchema), async (c) => {
    const user = c.get('user') as AuthUser;
    const input = c.req.valid('json');

    const result = await KasService.submitRekonsiliasi(input, user.id);
    return c.json<APIResponse<typeof result>>({
        success: true,
        data: result
    }, 201);
});

export const kasRoutes = app;
