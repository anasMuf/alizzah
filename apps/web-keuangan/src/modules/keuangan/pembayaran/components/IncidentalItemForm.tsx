
import { useState } from 'react';
import { Plus, Trash2, Tag, Banknote } from 'lucide-react';
import { formatCurrency, parseCurrency } from '@alizzah/shared';

interface IncidentalItem {
    jenisPembayaranId: string;
    nama: string;
    nominal: number;
    catatan?: string;
}

interface IncidentalItemFormProps {
    availableItems: any[];
    items: IncidentalItem[];
    onChange: (items: IncidentalItem[]) => void;
}

export function IncidentalItemForm({ availableItems, items, onChange }: IncidentalItemFormProps) {
    const [selectedId, setSelectedId] = useState('');
    const [nominal, setNominal] = useState(0);
    const [catatan, setCatatan] = useState('');

    const handleAdd = () => {
        if (!selectedId || nominal <= 0) return;

        const jp = availableItems.find(i => i.id === selectedId);
        if (!jp) return;

        const newItem: IncidentalItem = {
            jenisPembayaranId: selectedId,
            nama: jp.nama,
            nominal,
            catatan
        };

        onChange([...items, newItem]);
        setSelectedId('');
        setNominal(0);
        setCatatan('');
    };

    const handleRemove = (index: number) => {
        const newItems = items.filter((_, i) => i !== index);
        onChange(newItems);
    };

    return (
        <div className="space-y-4">
            <div className="flex items-center gap-2 mb-2">
                <Tag size={16} className="text-blue-500" />
                <h4 className="text-sm font-bold text-slate-700 uppercase tracking-widest">Item Tambahan (Optional)</h4>
            </div>

            {/* Input Row */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-2.5 bg-slate-50 p-3 rounded-xl border border-slate-100">
                <div className="md:col-span-2 space-y-1">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-tighter ml-1 leading-none">Jenis Pembayaran</label>
                    <select
                        value={selectedId}
                        onChange={(e) => {
                            const id = e.target.value;
                            setSelectedId(id);
                            const jp = availableItems.find(i => i.id === id);
                            if (jp) setNominal(parseCurrency(jp.nominalDefault));
                        }}
                        className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    >
                        <option value="">Pilih Jenis...</option>
                        {availableItems.filter(jp => jp.sifat === 'OPSIONAL' || jp.tipe === 'INSIDENTIL').map(jp => (
                            <option key={jp.id} value={jp.id}>{jp.nama}</option>
                        ))}
                    </select>
                </div>

                <div className="space-y-1">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-tighter ml-1 leading-none">Nominal</label>
                    <div className="relative">
                        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[9px] font-black text-slate-400 font-mono">Rp</span>
                        <input
                            type="number"
                            value={nominal || ''}
                            onChange={(e) => setNominal(parseCurrency(e.target.value))}
                            placeholder="0"
                            className="w-full pl-7 pr-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-black focus:outline-none focus:ring-2 focus:ring-blue-500/20 font-mono"
                        />
                    </div>
                </div>

                <div className="flex items-end">
                    <button
                        onClick={handleAdd}
                        disabled={!selectedId || nominal <= 0}
                        className="w-full py-1.5 bg-blue-600 text-white rounded-lg font-black text-[10px] uppercase tracking-widest hover:bg-blue-700 transition-all disabled:opacity-50 flex items-center justify-center gap-1.5 shadow-sm active:scale-95"
                    >
                        <Plus size={14} /> Tambah
                    </button>
                </div>
            </div>

            {/* List of Added Items */}
            <div className="space-y-1.5">
                {items.map((item, index) => (
                    <div key={index} className="flex items-center justify-between p-2.5 bg-white border border-slate-100 rounded-xl shadow-sm animate-in slide-in-from-top-2 duration-300">
                        <div className="flex items-center gap-3">
                            <div className="p-1.5 bg-amber-50 text-amber-600 rounded-lg">
                                <Banknote size={14} />
                            </div>
                            <div>
                                <div className="text-[11px] font-black text-slate-900 uppercase tracking-tight">{item.nama}</div>
                                {item.catatan && <div className="text-[8px] text-slate-400 font-medium font-mono">{item.catatan}</div>}
                            </div>
                        </div>
                        <div className="flex items-center gap-4">
                            <div className="text-xs font-black text-slate-900 font-mono">{formatCurrency(item.nominal)}</div>
                            <button
                                onClick={() => handleRemove(index)}
                                className="p-1.5 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-all"
                            >
                                <Trash2 size={14} />
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
