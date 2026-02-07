'use client';

import { useState } from 'react';
import { useSetAtom } from 'jotai';
import { useRouter } from '@tanstack/react-router';
import { useLogin } from '../hooks/useLogin';
import { loginSuccessAtom } from '~/stores/auth';

export function LoginForm() {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const router = useRouter();
    const setLoginSuccess = useSetAtom(loginSuccessAtom);

    const loginMutation = useLogin();

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const data = await loginMutation.mutateAsync({ username, password });
            setLoginSuccess({ token: data.token, user: data.user });
            router.navigate({ to: '/' });
        } catch (err) {
            // Error handling handled by mutation state
        }
    };

    return (
        <div className="w-full max-w-md bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-xl shadow-slate-200/50">
            <div className="mb-8 text-center">
                <h2 className="text-3xl font-bold text-slate-900 mb-2">Selamat Datang</h2>
                <p className="text-slate-500">Silakan masuk menggunakan akun administratif Anda.</p>
            </div>

            {loginMutation.isError && (
                <div className="mb-6 p-4 rounded-2xl bg-red-50 border border-red-100 text-red-600 flex items-center gap-3">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 shrink-0" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    <span className="text-sm font-medium">{loginMutation.error.message}</span>
                </div>
            )}

            <form onSubmit={handleLogin} className="space-y-5">
                <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-700 ml-1">Username</label>
                    <div className="relative group">
                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-blue-500 transition-colors">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                            </svg>
                        </div>
                        <input
                            type="text"
                            required
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            className="block w-full pl-11 pr-4 py-3 bg-white border border-slate-200 rounded-2xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all placeholder:text-slate-400"
                            placeholder="Masukkan username"
                            disabled={loginMutation.isPending}
                        />
                    </div>
                </div>

                <div className="space-y-2">
                    <div className="flex items-center justify-between ml-1">
                        <label className="text-sm font-semibold text-slate-700">Password</label>
                    </div>
                    <div className="relative group">
                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-blue-500 transition-colors">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                            </svg>
                        </div>
                        <input
                            type="password"
                            required
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="block w-full pl-11 pr-4 py-3 bg-white border border-slate-200 rounded-2xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all placeholder:text-slate-400"
                            placeholder="••••••••"
                            disabled={loginMutation.isPending}
                        />
                    </div>
                </div>

                <button
                    type="submit"
                    disabled={loginMutation.isPending}
                    className="w-full flex items-center justify-center py-3.5 px-4 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white font-bold rounded-2xl transition-all shadow-lg shadow-blue-200 active:scale-[0.98]"
                >
                    {loginMutation.isPending ? (
                        <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                    ) : 'Masuk ke Sistem'}
                </button>
            </form>
        </div>
    );
}
