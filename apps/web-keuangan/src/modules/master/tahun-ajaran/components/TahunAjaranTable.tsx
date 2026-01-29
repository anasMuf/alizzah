'use client';

import { useTahunAjaranList } from '../hooks/useTahunAjaranList';
import { useAtomValue } from 'jotai';
import { tokenAtom } from '~/stores/auth';

export function TahunAjaranTable() {
    const token = useAtomValue(tokenAtom);
    const { data, isLoading, error, refetch } = useTahunAjaranList(token);

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

    return (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-slate-50/50">
                    <tr>
                        <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Nama Periode</th>
                        <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Tanggal Mulai</th>
                        <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Tanggal Selesai</th>
                        <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Status</th>
                        <th className="px-6 py-4 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">Aksi</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                    {data?.map((item) => (
                        <tr key={item.id} className="hover:bg-slate-50/50 transition-colors group">
                            <td className="px-6 py-4 whitespace-nowrap">
                                <div className="font-medium text-slate-900">{item.nama}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-slate-600 text-sm">
                                {new Date(item.tanggalMulai).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-slate-600 text-sm">
                                {new Date(item.tanggalSelesai).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                                <span
                                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${item.isAktif
                                        ? 'bg-green-100 text-green-700 border border-green-200'
                                        : 'bg-slate-100 text-slate-600 border border-slate-200'
                                        }`}
                                >
                                    <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${item.isAktif ? 'bg-green-500' : 'bg-slate-400'}`}></span>
                                    {item.isAktif ? 'Aktif' : 'Tidak Aktif'}
                                </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                                <button className="text-blue-600 hover:text-blue-800 font-medium mr-3">Edit</button>
                                <button className="text-red-500 hover:text-red-700 font-medium">Hapus</button>
                            </td>
                        </tr>
                    ))}
                    {(!data || data.length === 0) && (
                        <tr>
                            <td colSpan={5} className="px-6 py-20 text-center text-slate-500">
                                Belum ada data tahun ajaran.
                            </td>
                        </tr>
                    )}
                </tbody>
            </table>
        </div>
    );
}
