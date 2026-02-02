
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
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                <input
                    type="text"
                    placeholder="Ketik Nama atau NIS Siswa..."
                    value={searchTerm}
                    onChange={(e) => {
                        setSearchTerm(e.target.value);
                        setIsOpen(true);
                    }}
                    onFocus={() => setIsOpen(true)}
                    className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-bold text-lg"
                />
            </div>

            {isOpen && searchTerm.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-slate-200 rounded-3xl shadow-2xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-300">
                    <div className="p-2">
                        {isLoading ? (
                            <div className="p-4 flex items-center justify-center gap-3 text-slate-400">
                                <Users size={20} className="animate-pulse" />
                                <span className="text-sm font-medium">Mencari siswa...</span>
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
                                    className="w-full flex items-center gap-4 p-4 hover:bg-blue-50 rounded-2xl transition-all group text-left"
                                >
                                    <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center font-bold text-sm shrink-0">
                                        {siswa.namaLengkap.charAt(0)}
                                    </div>
                                    <div className="flex-1 overflow-hidden">
                                        <div className="font-bold text-slate-900 group-hover:text-blue-600 transition-colors uppercase tracking-tight truncate">{siswa.namaLengkap}</div>
                                        <div className="text-[10px] text-slate-500 font-mono tracking-tighter uppercase truncate">
                                            {siswa.nis} • {siswa.rombel.nama}
                                        </div>
                                    </div>
                                    <CheckCircle size={20} className="text-blue-500 opacity-0 group-hover:opacity-100 transition-opacity" />
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
