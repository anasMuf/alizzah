import { z } from 'zod';

export const loginSchema = z.object({
    username: z.string().min(1, "Username wajib diisi"),
    password: z.string().min(1, "Password wajib diisi"),
});

export type LoginInput = z.infer<typeof loginSchema>;

export const registerSchema = z.object({
    username: z.string().min(3),
    email: z.string().email(),
    password: z.string().min(6),
    namaLengkap: z.string().min(3),
    role: z.enum(['ADMIN', 'KEPALA_SEKOLAH', 'BENDAHARA_YAYASAN']),
});

export type RegisterInput = z.infer<typeof registerSchema>;
