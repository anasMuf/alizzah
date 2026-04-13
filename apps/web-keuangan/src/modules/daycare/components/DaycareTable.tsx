import {
    createColumnHelper,
    flexRender,
    getCoreRowModel,
    useReactTable,
} from '@tanstack/react-table';
import { PesertaWithRelations } from '../hooks/useDaycareList';
import { Edit2, Ban, Eye, User, Home } from 'lucide-react';
import { Link } from '@tanstack/react-router';

interface DaycareTableProps {
    data: PesertaWithRelations[];
    onEdit: (item: PesertaWithRelations) => void;
    onDeactivate: (id: string) => void;
}

const columnHelper = createColumnHelper<PesertaWithRelations>();

export function DaycareTable({ data, onEdit, onDeactivate }: DaycareTableProps) {
    const columns = [
        columnHelper.accessor('namaLengkap', {
            header: 'Nama Lengkap',
            cell: info => {
                const item = info.row.original;
                const isInternal = !!item.siswaId;
                return (
                    <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${isInternal ? 'bg-indigo-50 text-indigo-600' : 'bg-orange-50 text-orange-600'}`}>
                            {isInternal ? <User size={16} /> : <Home size={16} />}
                        </div>
                        <div>
                            <div className="font-bold text-slate-900">{info.getValue() || item.siswa?.namaLengkap}</div>
                            <div className="flex items-center gap-2">
                                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${isInternal ? 'bg-indigo-100 text-indigo-700' : 'bg-orange-100 text-orange-700'}`}>
                                    {isInternal ? 'Internal' : 'Anak Luar'}
                                </span>
                                <span className="text-[10px] text-slate-500 font-medium whitespace-nowrap">
                                    Ortu: {item.siswa?.namaOrtu || item.namaOrtu}
                                </span>
                            </div>
                        </div>
                    </div>
                )
            },
        }),
        columnHelper.accessor('jenjangSetara', {
            header: 'Jenjang Setara',
            cell: info => (
                <div className="text-sm">
                    <span className="font-semibold text-slate-700">{info.getValue().nama}</span>
                    <div className="text-[10px] text-slate-400">{info.getValue().kode}</div>
                </div>
            ),
        }),
        columnHelper.accessor('modeDaycare', {
            header: 'Mode',
            cell: info => {
                const mode = info.getValue();
                const isRutin = mode === 'RUTIN';
                return (
                    <span className={`px-2 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wide ${isRutin ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'
                        }`}>
                        {mode}
                    </span>
                )
            },
        }),
        columnHelper.accessor('status', {
            header: 'Status',
            cell: info => {
                const status = info.getValue();
                const isActive = status === 'AKTIF';
                return (
                    <span className={`px-2 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wide ${isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                        }`}>
                        {status}
                    </span>
                );
            },
        }),
        columnHelper.accessor('tanggalMulai', {
            header: 'Mulai',
            cell: info => <span className="text-sm text-slate-600 font-medium">{new Date(info.getValue()).toLocaleDateString('id-ID')}</span>,
        }),
        columnHelper.display({
            id: 'actions',
            header: () => <div className="text-right">Aksi</div>,
            cell: info => (
                <div className="flex justify-end gap-2">
                    <Link
                        to={`/daycare/${info.row.original.id}` as any}
                        className="p-1.5 text-slate-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-all"
                        title="Detail"
                    >
                        <Eye size={16} />
                    </Link>
                    <button
                        onClick={() => onEdit(info.row.original)}
                        className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                        title="Edit"
                    >
                        <Edit2 size={16} />
                    </button>
                    {info.row.original.status === 'AKTIF' && (
                        <button
                            onClick={() => onDeactivate(info.row.original.id)}
                            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                            title="Nonaktifkan"
                        >
                            <Ban size={16} />
                        </button>
                    )}
                </div>
            ),
        }),
    ];

    const table = useReactTable({
        data,
        columns,
        getCoreRowModel: getCoreRowModel(),
    });

    if (data.length === 0) {
        return (
            <div className="text-center py-12 bg-white rounded-2xl border border-dashed border-slate-300">
                <p className="text-slate-500 text-sm">Tidak ada data peserta daycare ditemukan.</p>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                    <thead className="bg-slate-50 border-b border-slate-100">
                        {table.getHeaderGroups().map(headerGroup => (
                            <tr key={headerGroup.id}>
                                {headerGroup.headers.map(header => (
                                    <th key={header.id} className="px-4 sm:px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">
                                        {flexRender(header.column.columnDef.header, header.getContext())}
                                    </th>
                                ))}
                            </tr>
                        ))}
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {table.getRowModel().rows.map(row => (
                            <tr key={row.id} className="hover:bg-slate-50/50 transition-colors">
                                {row.getVisibleCells().map(cell => (
                                    <td key={cell.id} className="px-4 sm:px-6 py-3">
                                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                    </td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
