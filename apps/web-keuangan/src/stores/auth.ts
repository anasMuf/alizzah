import { atom } from 'jotai';

interface User {
    id: string;
    username: string;
    namaLengkap: string;
    role: string;
}

const getInitialToken = () => {
    if (typeof window !== 'undefined') {
        return localStorage.getItem('token');
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
export const logoutAtom = atom(null, (_get, set) => {
    set(tokenAtom, null);
    set(userAtom, null);
    if (typeof window !== 'undefined') {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
    }
});

export const loginSuccessAtom = atom(null, (_get, set, { token, user }: { token: string; user: User }) => {
    set(tokenAtom, token);
    set(userAtom, user);
    if (typeof window !== 'undefined') {
        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify(user));
    }
});
