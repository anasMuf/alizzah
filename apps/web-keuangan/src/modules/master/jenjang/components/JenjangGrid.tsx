'use client';

import { useJenjangList } from '../hooks/useJenjangList';
import { useAtomValue } from 'jotai';
import { tokenAtom } from '~/stores/auth';

export function JenjangGrid() {
    const token = useAtomValue(tokenAtom);
    const { data, isLoading, error, refetch } = useJenjangList(token);

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="bg-red-50 border border-red-200 text-red-700 px-6 py-4 rounded-xl shadow-sm">
                <p className="font-semibold">Error</p>
                <p className="text-sm">{(error as Error).message}</p>
                <button
                    onClick={() => refetch()}
                    className="mt-3 bg-red-600 text-white px-4 py-1.5 rounded-lg text-sm hover:bg-red-700 transition-colors"
                >
                    Coba Lagi
                </button>
            </div>
        );
    }

    if (!token) {
        return (
            <div className="text-center py-20 bg-white rounded-2xl border border-dashed border-slate-300">
                <p className="text-slate-500">Silakan login terlebih dahulu untuk melihat data.</p>
            </div>
        );
    }

    if (!data || data.length === 0) {
        return (
            <div className="text-center py-20 bg-white rounded-2xl border border-dashed border-slate-300">
                <p className="text-slate-500">Belum ada data jenjang.</p>
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {data.map((item) => (
                <div key={item.id} className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm hover:shadow-md transition-all group relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-blue-50 rounded-bl-full -mr-10 -mt-10 group-hover:bg-blue-100 transition-colors z-0"></div>

                    <div className="relative z-10">
                        <div className="flex items-start justify-between mb-4">
                            <div className="bg-blue-600 text-white w-10 h-10 rounded-xl flex items-center justify-center font-bold shadow-lg shadow-blue-100">
                                {item.kode}
                            </div>
                            <span className="text-slate-400 text-xs font-mono">#{item.urutan}</span>
                        </div>

                        <h3 className="text-lg font-bold text-slate-900 mb-1">{item.nama}</h3>
                        <p className="text-slate-500 text-sm mb-4">Kelompok: <span className="text-slate-700 font-medium">{item.kelompok}</span></p>

                        <div className="flex items-center justify-end gap-3 mt-2 border-t pt-4 border-slate-50">
                            <button className="text-slate-400 hover:text-blue-600 transition-colors">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                    <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                                </svg>
                            </button>
                            <button className="text-slate-400 hover:text-red-500 transition-colors">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                                </svg>
                            </button>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
}
