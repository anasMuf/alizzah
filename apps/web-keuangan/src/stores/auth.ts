import { atom } from 'jotai';
import Cookies from 'js-cookie';

export interface User {
    id: string;
    username: string;
    namaLengkap: string;
    role: string;
}

const getInitialToken = () => {
    if (typeof window !== 'undefined') {
        const token = Cookies.get('token') || localStorage.getItem('token');
        if (token) return token;
    }
    return null;
};

const getInitialUser = () => {
    if (typeof window !== 'undefined') {
        const user = localStorage.getItem('user');
        return user ? (JSON.parse(user) as User) : null;
    }
    return null;
};

// Base atoms
export const tokenAtom = atom<string | null>(getInitialToken());
export const userAtom = atom<User | null>(getInitialUser());

// Read-only atoms
export const isAuthenticatedAtom = atom((get) => !!get(tokenAtom));

// Write-only atoms (Actions)
export const initializeAuthAtom = atom(null, (_get, set, { token, user }: { token: string | null; user: User | null }) => {
    if (token) set(tokenAtom, token);
    if (user) set(userAtom, user);
});

export const logoutAtom = atom(null, (_get, set) => {
    set(tokenAtom, null);
    set(userAtom, null);
    if (typeof window !== 'undefined') {
        Cookies.remove('token', { path: '/' });
        Cookies.remove('user', { path: '/' });
        localStorage.removeItem('token');
        localStorage.removeItem('user');
    }
});

export const loginSuccessAtom = atom(null, (_get, set, { token, user }: { token: string; user: User }) => {
    set(tokenAtom, token);
    set(userAtom, user);
    if (typeof window !== 'undefined') {
        Cookies.set('token', token, { expires: 7, path: '/' });
        Cookies.set('user', JSON.stringify(user), { expires: 7, path: '/' });
        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify(user));
    }
});
