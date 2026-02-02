
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
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                <div className="md:col-span-2 space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter ml-1">Jenis Pembayaran</label>
                    <select
                        value={selectedId}
                        onChange={(e) => {
                            const id = e.target.value;
                            setSelectedId(id);
                            const jp = availableItems.find(i => i.id === id);
                            if (jp) setNominal(parseCurrency(jp.nominalDefault));
                        }}
                        className="w-full px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    >
                        <option value="">Pilih Jenis...</option>
                        {availableItems.filter(jp => jp.sifat === 'OPSIONAL' || jp.tipe === 'INSIDENTIL').map(jp => (
                            <option key={jp.id} value={jp.id}>{jp.nama}</option>
                        ))}
                    </select>
                </div>

                <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter ml-1">Nominal</label>
                    <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400">Rp</span>
                        <input
                            type="number"
                            value={nominal || ''}
                            onChange={(e) => setNominal(parseCurrency(e.target.value))}
                            placeholder="0"
                            className="w-full pl-8 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 font-bold"
                        />
                    </div>
                </div>

                <div className="flex items-end">
                    <button
                        onClick={handleAdd}
                        disabled={!selectedId || nominal <= 0}
                        className="w-full py-2 bg-blue-600 text-white rounded-xl font-bold text-sm hover:bg-blue-700 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                        <Plus size={16} /> Tambah
                    </button>
                </div>
            </div>

            {/* List of Added Items */}
            <div className="space-y-2">
                {items.map((item, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-white border border-slate-100 rounded-2xl shadow-sm animate-in slide-in-from-top-2 duration-300">
                        <div className="flex items-center gap-4">
                            <div className="p-2 bg-amber-50 text-amber-600 rounded-lg">
                                <Banknote size={16} />
                            </div>
                            <div>
                                <div className="text-xs font-bold text-slate-900">{item.nama}</div>
                                {item.catatan && <div className="text-[10px] text-slate-400">{item.catatan}</div>}
                            </div>
                        </div>
                        <div className="flex items-center gap-6">
                            <div className="text-sm font-black text-slate-900">{formatCurrency(item.nominal)}</div>
                            <button
                                onClick={() => handleRemove(index)}
                                className="p-2 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-all"
                            >
                                <Trash2 size={16} />
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
