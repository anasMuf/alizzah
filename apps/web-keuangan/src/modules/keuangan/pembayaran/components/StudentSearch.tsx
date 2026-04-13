
import { useState, useEffect } from 'react';
import { Search, Users, CheckCircle, Info } from 'lucide-react';
import { useSiswaList } from '~/modules/siswa/hooks/useSiswaList';

interface StudentSearchProps {
    onSelect: (siswa: any) => void;
}

export function StudentSearch({ onSelect }: StudentSearchProps) {
    const [searchTerm, setSearchTerm] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [isOpen, setIsOpen] = useState(false);

    useEffect(() => {
        const timer = setTimeout(() => setDebouncedSearch(searchTerm), 500);
        return () => clearTimeout(timer);
    }, [searchTerm]);

    const { data: searchResults, isLoading } = useSiswaList({
        search: debouncedSearch,
        limit: 5,
        status: 'AKTIF'
    });

    return (
        <div className="relative">
            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input
                    type="text"
                    placeholder="Ketik Nama atau NIS Siswa..."
                    value={searchTerm}
                    onChange={(e) => {
                        setSearchTerm(e.target.value);
                        setIsOpen(true);
                    }}
                    onFocus={() => setIsOpen(true)}
                    className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-bold text-sm"
                />
            </div>

            {isOpen && searchTerm.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1.5 bg-white border border-slate-200 rounded-xl shadow-2xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-300">
                    <div className="p-1">
                        {isLoading ? (
                            <div className="p-3 flex items-center justify-center gap-2 text-slate-400">
                                <Users size={16} className="animate-pulse" />
                                <span className="text-xs font-medium">Mencari siswa...</span>
                            </div>
                        ) : searchResults?.data?.length ? (
                            searchResults.data.map((siswa: any) => (
                                <button
                                    key={siswa.id}
                                    onClick={() => {
                                        onSelect(siswa);
                                        setSearchTerm('');
                                        setIsOpen(false);
                                    }}
                                    className="w-full flex items-center gap-3 p-3 hover:bg-blue-50 rounded-lg transition-all group text-left"
                                >
                                    <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-lg flex items-center justify-center font-black text-xs shrink-0 border border-indigo-100">
                                        {siswa.namaLengkap.charAt(0)}
                                    </div>
                                    <div className="flex-1 overflow-hidden">
                                        <div className="font-extrabold text-slate-900 group-hover:text-blue-600 transition-colors uppercase tracking-tight truncate text-xs">{siswa.namaLengkap}</div>
                                        <div className="text-[9px] text-slate-400 font-mono tracking-tighter uppercase truncate font-medium">
                                            {siswa.nis} • {siswa.rombel.nama}
                                        </div>
                                    </div>
                                    <CheckCircle size={16} className="text-blue-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                                </button>
                            ))
                        ) : (
                            <div className="p-8 text-center space-y-2">
                                <div className="p-3 bg-slate-50 text-slate-300 rounded-full w-fit mx-auto">
                                    <Info size={24} />
                                </div>
                                <p className="text-sm text-slate-400 font-medium italic">Siswa tidak ditemukan.</p>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
