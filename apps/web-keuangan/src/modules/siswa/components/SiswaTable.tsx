
import {
    createColumnHelper,
    flexRender,
    getCoreRowModel,
    useReactTable,
} from '@tanstack/react-table';
import { SiswaWithRelations } from '../hooks/useSiswaList';
import { Edit2, Trash2 } from 'lucide-react';

interface SiswaTableProps {
    data: SiswaWithRelations[];
    onEdit: (item: SiswaWithRelations) => void;
    onDelete: (id: string) => void;
}

const columnHelper = createColumnHelper<SiswaWithRelations>();

export function SiswaTable({ data, onEdit, onDelete }: SiswaTableProps) {
    const columns = [
        columnHelper.accessor('nis', {
            header: 'NIS',
            cell: info => <span className="font-mono font-medium text-slate-700">{info.getValue()}</span>,
        }),
        columnHelper.accessor('namaLengkap', {
            header: 'Nama Lengkap',
            cell: info => (
                <div>
                    <div className="font-bold text-slate-900">{info.getValue()}</div>
                    <div className="text-[11px] text-slate-500 font-medium">Ortu: {info.row.original.namaOrtu}</div>
                </div>
            ),
        }),
        columnHelper.accessor('jenisKelamin', {
            header: 'L/P',
            cell: info => (
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${info.getValue() === 'L' ? 'bg-blue-100 text-blue-700' : 'bg-pink-100 text-pink-700'
                    }`}>
                    {info.getValue()}
                </span>
            ),
        }),
        columnHelper.accessor('rombel', {
            header: 'Kelas',
            cell: info => {
                const rombel = info.getValue();
                return (
                    <div className="text-sm">
                        <span className="font-semibold text-slate-700">{rombel.nama}</span>
                        <div className="text-[10px] text-slate-400">{rombel.jenjang.kode}</div>
                    </div>
                )
            },
        }),
        columnHelper.accessor('status', {
            header: 'Status',
            cell: info => {
                const status = info.getValue();
                let colorClass = 'bg-slate-100 text-slate-600';
                if (status === 'AKTIF') colorClass = 'bg-green-100 text-green-700';
                if (status === 'CALON_SISWA') colorClass = 'bg-amber-100 text-amber-700';
                if (status === 'KELUAR') colorClass = 'bg-red-100 text-red-700';

                return (
                    <span className={`px-2 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wide ${colorClass}`}>
                        {status.replace('_', ' ')}
                    </span>
                );
            },
        }),
        columnHelper.display({
            id: 'actions',
            header: () => <div className="text-right">Aksi</div>,
            cell: info => (
                <div className="flex justify-end gap-2">
                    <button
                        onClick={() => onEdit(info.row.original)}
                        className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                        title="Edit Detail"
                    >
                        <Edit2 size={16} />
                    </button>
                    <button
                        onClick={() => onDelete(info.row.original.id)}
                        className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                        title="Hapus"
                    >
                        <Trash2 size={16} />
                    </button>
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
                <p className="text-slate-500 text-sm">Tidak ada data siswa ditemukan.</p>
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
                                    <th key={header.id} className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">
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
                                    <td key={cell.id} className="px-6 py-3">
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
