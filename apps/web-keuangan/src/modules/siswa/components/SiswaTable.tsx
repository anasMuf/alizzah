
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
            cell: info => <span className="font-mono font-black text-slate-400 text-xs">{info.getValue()}</span>,
        }),
        columnHelper.accessor('namaLengkap', {
            header: 'Nama Lengkap',
            cell: info => (
                <div>
                    <div className="font-black text-slate-900 text-xs uppercase tracking-tight italic">{info.getValue()}</div>
                    <div className="text-[9px] text-slate-400 font-bold uppercase tracking-widest leading-none mt-0.5 italic">Ortu: {info.row.original.namaOrtu}</div>
                </div>
            ),
        }),
        columnHelper.accessor('jenisKelamin', {
            header: 'L/P',
            cell: info => (
                <span className={`px-1.5 py-0.5 rounded text-[9px] font-black ${info.getValue() === 'L' ? 'bg-blue-50 text-blue-600 border border-blue-100' : 'bg-pink-50 text-pink-600 border border-pink-100'
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
                    <div>
                        <span className="text-xs font-black text-slate-900 uppercase tracking-tight italic">{rombel.nama}</span>
                        <div className="text-[8px] text-slate-400 font-black uppercase tracking-widest">{rombel.jenjang.kode}</div>
                    </div>
                )
            },
        }),
        columnHelper.accessor('status', {
            header: 'Status',
            cell: info => {
                const status = info.getValue();
                let colorClass = 'bg-slate-50 text-slate-400 border-slate-100';
                if (status === 'AKTIF') colorClass = 'bg-emerald-50 text-emerald-600 border-emerald-100';
                if (status === 'CALON_SISWA') colorClass = 'bg-amber-50 text-amber-600 border-amber-100';
                if (status === 'KELUAR') colorClass = 'bg-red-50 text-red-600 border-red-100';

                return (
                    <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-tighter border ${colorClass}`}>
                        {status.replace('_', ' ')}
                    </span>
                );
            },
        }),
        columnHelper.display({
            id: 'actions',
            header: () => <div className="text-right">Aksi</div>,
            cell: info => (
                <div className="flex justify-end gap-1">
                    <button
                        onClick={() => onEdit(info.row.original)}
                        className="p-1 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-all"
                        title="Edit Detail"
                    >
                        <Edit2 size={14} />
                    </button>
                    <button
                        onClick={() => onDelete(info.row.original.id)}
                        className="p-1 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded transition-all"
                        title="Hapus"
                    >
                        <Trash2 size={14} />
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
            <div className="text-center py-12 bg-white rounded-xl border border-dashed border-slate-300">
                <p className="text-slate-500 text-sm">Tidak ada data siswa ditemukan.</p>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                    <thead className="bg-slate-50 border-b border-slate-100">
                        {table.getHeaderGroups().map(headerGroup => (
                            <tr key={headerGroup.id}>
                                {headerGroup.headers.map(header => (
                                    <th key={header.id} className="px-4 py-2.5 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                        {flexRender(header.column.columnDef.header, header.getContext())}
                                    </th>
                                ))}
                            </tr>
                        ))}
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {table.getRowModel().rows.map(row => (
                            <tr key={row.id} className="hover:bg-slate-50/10 transition-colors">
                                {row.getVisibleCells().map(cell => (
                                    <td key={cell.id} className="px-4 py-2">
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
