import { Hono } from 'hono';
import { tahunAjaranRoutes } from './tahun-ajaran/tahun-ajaran.routes';
import { jenjangRoutes } from './jenjang/jenjang.routes';

export const masterRoutes = new Hono()
    .route('/tahun-ajaran', tahunAjaranRoutes)
    .route('/jenjang', jenjangRoutes);
