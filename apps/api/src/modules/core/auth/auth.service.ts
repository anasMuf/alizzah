import { prisma } from '../../../lib/prisma';
import { compare } from 'bcryptjs';
import jwt from 'jsonwebtoken';
const { sign } = jwt;
import { LoginInput } from '@alizzah/validators';
import { AppError } from '../../../lib/error';

const JWT_SECRET = process.env.JWT_SECRET || 'secret123';

export class AuthService {
    static async login(data: LoginInput) {
        const user = await prisma.user.findUnique({
            where: { username: data.username },
        });

        if (!user) {
            throw new AppError('Username atau password salah', 401);
        }

        if (!user.isAktif) {
            throw new AppError('Akun dinonaktifkan', 403);
        }

        const isValid = await compare(data.password, user.password);
        if (!isValid) {
            throw new AppError('Username atau password salah', 401);
        }

        const token = sign(
            { id: user.id, role: user.role, username: user.username },
            JWT_SECRET,
            { expiresIn: '7d' }
        );

        return {
            token,
            user: {
                id: user.id,
                username: user.username,
                namaLengkap: user.namaLengkap,
                role: user.role,
            },
        };
    }
}
