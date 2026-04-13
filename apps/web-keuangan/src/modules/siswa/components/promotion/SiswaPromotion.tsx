
import { useState, useMemo } from 'react';
import { useSiswaList } from '../../hooks/useSiswaList';
import { useRombelList } from '~/modules/master/rombel/hooks/useRombelList';
import { useSiswaMutations } from '../../hooks/useSiswaMutations';
import { useAtomValue } from 'jotai';
import { tokenAtom } from '~/stores/auth';
import {
    Users,
    ArrowRight,
    CheckCircle2,
    AlertTriangle,
    Search,
    // ChevronRight,
    GraduationCap,
    CheckSquare,
    Square,
    Loader2,
    TrendingUp,
    Award
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

type ActionType = 'PROMOTE' | 'GRADUATE';
type Step = 'CONFIG' | 'SELECTION' | 'CONFIRM';

export function SiswaPromotion() {
    const token = useAtomValue(tokenAtom);
    const { promoteMutation } = useSiswaMutations(token);

    // State
    const [step, setStep] = useState<Step>('CONFIG');
    const [action, setAction] = useState<ActionType>('PROMOTE');
    const [sourceRombelId, setSourceRombelId] = useState<string>('');
    const [targetRombelId, setTargetRombelId] = useState<string>('');
    const [selectedSiswaIds, setSelectedSiswaIds] = useState<string[]>([]);
    const [search, setSearch] = useState('');

    // Data fetching
    const { data: rombelList } = useRombelList();
    const { data: siswaData, isLoading: loadingSiswa } = useSiswaList({
        rombelId: sourceRombelId,
        limit: 100 // Consider increasing or handling pagination
    });

    const siswas = siswaData?.data || [];

    // Filtered students based on search
    const filteredSiswas = useMemo(() => {
        if (!search) return siswas;
        return siswas.filter(s =>
            s.namaLengkap.toLowerCase().includes(search.toLowerCase()) ||
            s.nis?.includes(search)
        );
    }, [siswas, search]);

    const sourceRombel = rombelList?.find(r => r.id === sourceRombelId);
    const targetRombel = rombelList?.find(r => r.id === targetRombelId);

    const toggleSelectAll = () => {
        if (selectedSiswaIds.length === filteredSiswas.length) {
            setSelectedSiswaIds([]);
        } else {
            setSelectedSiswaIds(filteredSiswas.map(s => s.id));
        }
    };

    const toggleSelectSiswa = (id: string) => {
        setSelectedSiswaIds(prev =>
            prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
        );
    };

    const handleNext = () => {
        if (step === 'CONFIG') {
            if (!sourceRombelId) return;
            if (action === 'PROMOTE' && !targetRombelId) return;
            setStep('SELECTION');
        } else if (step === 'SELECTION') {
            if (selectedSiswaIds.length === 0) return;
            setStep('CONFIRM');
        }
    };

    const handleBack = () => {
        if (step === 'SELECTION') setStep('CONFIG');
        if (step === 'CONFIRM') setStep('SELECTION');
    };

    const handleExecute = async () => {
        if (selectedSiswaIds.length === 0) return;
        if (action === 'PROMOTE' && !targetRombelId) return;

        try {
            await promoteMutation.mutateAsync({
                action,
                targetRombelId: action === 'PROMOTE' ? targetRombelId : undefined,
                siswaIds: selectedSiswaIds
            });
            // Reset after success
            setSelectedSiswaIds([]);
            setSearch('');
            setStep('CONFIG');
            setSourceRombelId('');
            setTargetRombelId('');
        } catch (error) {
            // Error handled by mutation
        }
    };

    const isOverCapacity = action === 'PROMOTE' && targetRombel &&
        (targetRombel.jumlahSiswa + selectedSiswaIds.length) > targetRombel.kapasitas;

    return (
        <div className="max-w-5xl mx-auto space-y-6">
            {/* Stepper Indicator */}
            <div className="flex items-center justify-center mb-6">
                <StepIndicator current={step} step="CONFIG" label="1. CONFIG" />
                <div className={`w-8 h-0.5 bg-slate-200 mx-1 rounded-full ${step !== 'CONFIG' ? 'bg-blue-600' : ''}`} />
                <StepIndicator current={step} step="SELECTION" label="2. SELEKSI" />
                <div className={`w-8 h-0.5 bg-slate-200 mx-1 rounded-full ${step === 'CONFIRM' ? 'bg-blue-600' : ''}`} />
                <StepIndicator current={step} step="CONFIRM" label="3. KONFIRMASI" />
            </div>

            <AnimatePresence mode="wait">
                {/* STEP 1: CONFIGURATION */}
                {step === 'CONFIG' && (
                    <motion.div
                        key="config"
                        initial={{ opacity: 0, scale: 0.98 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.98 }}
                        className="grid grid-cols-1 md:grid-cols-2 gap-4"
                    >
                        {/* Source Selection */}
                        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-3">
                            <div className="flex items-center gap-2 mb-1">
                                <div className="p-1.5 bg-blue-50 text-blue-600 rounded-lg"><Users size={16} /></div>
                                <h3 className="font-black text-[10px] text-slate-400 uppercase tracking-widest italic">Pilih Rombel Asal</h3>
                            </div>
                            <select
                                value={sourceRombelId}
                                onChange={(e) => {
                                    setSourceRombelId(e.target.value);
                                    setTargetRombelId('');
                                    setSelectedSiswaIds([]);
                                }}
                                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-4 focus:ring-blue-500/10 font-black text-xs text-slate-900 cursor-pointer"
                            >
                                <option value="">Pilih Rombel...</option>
                                {rombelList?.map(r => (
                                    <option key={r.id} value={r.id}>
                                        {r.nama} ({r.jenjang.nama} - {r.tahunAjaran.nama})
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Action & Target Selection */}
                        <div className="space-y-4">
                            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-3">
                                <div className="flex items-center gap-2 mb-1">
                                    <div className="p-1.5 bg-purple-50 text-purple-600 rounded-lg"><TrendingUp size={16} /></div>
                                    <h3 className="font-black text-[10px] text-slate-400 uppercase tracking-widest italic">Jenis Aksi</h3>
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                    <ActionCard
                                        active={action === 'PROMOTE'}
                                        onClick={() => setAction('PROMOTE')}
                                        icon={GraduationCap}
                                        label="KENAIKAN KELAS"
                                        description="PINDAH KE KELAS BARU"
                                    />
                                    <ActionCard
                                        active={action === 'GRADUATE'}
                                        onClick={() => setAction('GRADUATE')}
                                        icon={Award}
                                        label="KELULUSAN"
                                        description="SET STATUS LULUS"
                                        color="emerald"
                                    />
                                </div>
                            </div>

                            {action === 'PROMOTE' && (
                                <motion.div
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-3 overflow-hidden"
                                >
                                    <div className="flex items-center gap-2 mb-1">
                                        <div className="p-1.5 bg-emerald-50 text-emerald-600 rounded-lg"><GraduationCap size={16} /></div>
                                        <h3 className="font-black text-[10px] text-slate-400 uppercase tracking-widest italic">Rombel Tujuan</h3>
                                    </div>
                                    <select
                                        value={targetRombelId}
                                        onChange={(e) => setTargetRombelId(e.target.value)}
                                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-4 focus:ring-emerald-500/10 font-black text-xs text-emerald-900 cursor-pointer"
                                    >
                                        <option value="">Pilih Rombel Tujuan...</option>
                                        {rombelList?.filter(r => r.id !== sourceRombelId).map(r => (
                                            <option key={r.id} value={r.id}>
                                                {r.nama} ({r.jenjang.nama} - {r.tahunAjaran.nama})
                                            </option>
                                        ))}
                                    </select>
                                </motion.div>
                            )}
                        </div>
                    </motion.div>
                )}

                {/* STEP 2: SELECTION */}
                {step === 'SELECTION' && (
                    <motion.div
                        key="selection"
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        className="space-y-4"
                    >
                        <div className="flex flex-col md:flex-row gap-4">
                            {/* Student List */}
                            <div className="flex-1 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col h-[500px]">
                                <div className="p-3 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
                                    <div className="relative flex-1 max-w-sm">
                                        <Search className="absolute left-3 top-2 text-slate-400" size={14} />
                                        <input
                                            type="text"
                                            value={search}
                                            onChange={(e) => setSearch(e.target.value)}
                                            placeholder="Cari Siswa..."
                                            className="w-full pl-9 pr-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-black placeholder:italic focus:outline-none focus:ring-4 focus:ring-blue-500/10"
                                        />
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest italic">
                                            {selectedSiswaIds.length} / {filteredSiswas.length} TERPILIH
                                        </div>
                                        <button onClick={toggleSelectAll} className="p-1 hover:bg-slate-200 rounded transition-colors text-slate-500">
                                            {selectedSiswaIds.length === filteredSiswas.length && filteredSiswas.length > 0 ? <CheckSquare size={16} className="text-blue-600" /> : <Square size={16} />}
                                        </button>
                                    </div>
                                </div>

                                <div className="flex-1 overflow-y-auto p-2">
                                    {loadingSiswa ? (
                                        <div className="h-full flex items-center justify-center"><Loader2 className="animate-spin text-blue-500" size={20} /></div>
                                    ) : filteredSiswas.length === 0 ? (
                                        <div className="h-full flex items-center justify-center text-slate-400 text-[10px] font-black uppercase tracking-widest italic">Tidak ada siswa ditemukan.</div>
                                    ) : (
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-1.5">
                                            {filteredSiswas.map(siswa => (
                                                <div
                                                    key={siswa.id}
                                                    onClick={() => toggleSelectSiswa(siswa.id)}
                                                    className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-all border ${selectedSiswaIds.includes(siswa.id) ? 'bg-blue-50 border-blue-200' : 'bg-white border-slate-100 hover:border-blue-200'}`}
                                                >
                                                    <div className={selectedSiswaIds.includes(siswa.id) ? 'text-blue-600' : 'text-slate-300'}>
                                                        {selectedSiswaIds.includes(siswa.id) ? <CheckSquare size={14} /> : <Square size={14} />}
                                                    </div>
                                                    <div>
                                                        <div className="text-[11px] font-black text-slate-900 uppercase tracking-tight italic">{siswa.namaLengkap}</div>
                                                        <div className="text-[9px] text-slate-400 font-black uppercase tracking-widest font-mono">{siswa.nis}</div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Info Panel */}
                            <div className="w-full md:w-72 space-y-3">
                                {action === 'PROMOTE' && targetRombel && (
                                    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-3">
                                        <h4 className="font-black text-[10px] text-slate-400 uppercase tracking-widest italic">KAPASITAS TUJUAN</h4>
                                        <div className="space-y-2">
                                            <div className="flex justify-between text-[10px] font-black text-slate-500 uppercase tracking-tighter">
                                                <span>KUOTA</span>
                                                <span>{targetRombel.jumlahSiswa} / {targetRombel.kapasitas}</span>
                                            </div>
                                            <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                                <div
                                                    className={`h-full transition-all ${isOverCapacity ? 'bg-rose-500' : 'bg-emerald-500'}`}
                                                    style={{ width: `${Math.min(100, ((targetRombel.jumlahSiswa + selectedSiswaIds.length) / targetRombel.kapasitas) * 100)}%` }}
                                                />
                                            </div>
                                            {isOverCapacity ? (
                                                <div className="p-2 bg-rose-50 text-rose-700 rounded-lg text-[9px] font-black uppercase tracking-tight flex items-start gap-1.5 border border-rose-100">
                                                    <AlertTriangle size={12} className="shrink-0" />
                                                    <span>OVER CAPACITY! (+{(targetRombel.jumlahSiswa + selectedSiswaIds.length) - targetRombel.kapasitas})</span>
                                                </div>
                                            ) : (
                                                <div className="p-2 bg-emerald-50 text-emerald-700 rounded-lg text-[9px] font-black uppercase tracking-tight flex items-center gap-1.5 border border-emerald-100">
                                                    <CheckCircle2 size={12} />
                                                    <span>KAPASITAS AMAN (SISA {targetRombel.kapasitas - (targetRombel.jumlahSiswa + selectedSiswaIds.length)})</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}
                                {action === 'GRADUATE' && (
                                    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-3">
                                        <div className="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg w-fit"><Award size={16} /></div>
                                        <h4 className="font-black text-[10px] text-slate-400 uppercase tracking-widest italic leading-none">MODE KELULUSAN</h4>
                                        <p className="text-[10px] text-slate-500 leading-relaxed font-bold italic">
                                            Siswa yang dipilih akan diubah statusnya menjadi <strong className="font-black text-slate-900 uppercase">LULUS</strong>.
                                            Mereka tidak akan menempati kuota rombel manapun.
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </motion.div>
                )}

                {/* STEP 3: CONFIRMATION */}
                {step === 'CONFIRM' && (
                    <motion.div
                        key="confirm"
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="max-w-md mx-auto"
                    >
                        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xl text-center space-y-4">
                            <div className={`w-16 h-16 mx-auto rounded-full flex items-center justify-center ${action === 'PROMOTE' ? 'bg-blue-50 text-blue-600 border border-blue-100' : 'bg-indigo-50 text-indigo-600 border border-indigo-100'}`}>
                                {action === 'PROMOTE' ? <TrendingUp size={32} /> : <Award size={32} />}
                            </div>

                            <div>
                                <h2 className="text-lg font-black text-slate-900 uppercase tracking-tight italic">KONFIRMASI {action === 'PROMOTE' ? 'KENAIKAN' : 'KELULUSAN'}</h2>
                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest italic leading-none mt-1">Mohon periksa kembali data sebelum melanjutkan.</p>
                            </div>

                            <div className="bg-slate-50 rounded-lg p-4 text-left space-y-3 border border-slate-100">
                                <SummaryItem label="AKSI" value={action === 'PROMOTE' ? 'KENAIKAN KELAS' : 'KELULUSAN SISWA'} />
                                <SummaryItem label="DARI ROMBEL" value={sourceRombel?.nama || '-'} />
                                {action === 'PROMOTE' && <SummaryItem label="KE ROMBEL" value={targetRombel?.nama || '-'} />}
                                <SummaryItem label="TOTAL SISWA" value={`${selectedSiswaIds.length} SISWA`} highlight />
                            </div>

                            <button
                                onClick={handleExecute}
                                disabled={promoteMutation.isPending}
                                className={`w-full py-3 rounded-lg font-black text-xs uppercase tracking-widest text-white shadow-lg transition-transform active:scale-95 flex items-center justify-center gap-2 italic ${action === 'PROMOTE' ? 'bg-blue-600 hover:bg-blue-700 shadow-blue-200' : 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-200'}`}
                            >
                                {promoteMutation.isPending ? <Loader2 className="animate-spin" size={16} /> : <CheckCircle2 size={16} />}
                                <span>EKSEKUSI SEKARANG</span>
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Navigation Buttons for Config/Selection */}
            {step !== 'CONFIRM' && (
                <div className="flex justify-between pt-4 border-t border-slate-200">
                    {step === 'SELECTION' ? (
                        <button onClick={handleBack} className="px-5 py-2 text-[10px] font-black text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors uppercase tracking-widest italic">
                            KEMBALI
                        </button>
                    ) : <div></div>}

                    <button
                        onClick={handleNext}
                        disabled={
                            (step === 'CONFIG' && (!sourceRombelId || (action === 'PROMOTE' && !targetRombelId))) ||
                            (step === 'SELECTION' && selectedSiswaIds.length === 0)
                        }
                        className="px-6 py-2 bg-slate-900 text-white text-[10px] font-black rounded-lg hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2 uppercase tracking-widest italic"
                    >
                        <span>LANJUT</span>
                        <ArrowRight size={14} />
                    </button>
                </div>
            )}
        </div>
    );
}

// Helper Components
function StepIndicator({ current, step, label }: { current: string, step: string, label: string }) {
    const isActive = current === step;

    let color = 'text-slate-300 bg-slate-50';
    if (isActive) color = 'text-blue-600 bg-blue-50 border border-blue-200';

    return (
        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-[10px] font-black tracking-widest transition-all italic border border-transparent shrink-0 ${color}`}>
            {label}
        </div>
    );
}

function ActionCard({ active, onClick, icon: Icon, label, description, color = 'blue' }: any) {
    const activeClass = color === 'emerald' ? 'border-emerald-500 bg-emerald-50 ring-4 ring-emerald-500/10' : 'border-blue-500 bg-blue-50 ring-4 ring-blue-500/10';

    return (
        <div
            onClick={onClick}
            className={`p-3 rounded-xl border-2 cursor-pointer transition-all hover:scale-[1.02] active:scale-95 ${active ? activeClass : 'border-slate-100 hover:border-slate-200 bg-white'}`}
        >
            <div className={`mb-1 ${active ? (color === 'emerald' ? 'text-emerald-600' : 'text-blue-600') : 'text-slate-300'}`}>
                <Icon size={20} />
            </div>
            <div className={`font-black text-[11px] uppercase tracking-tight italic ${active ? 'text-slate-900' : 'text-slate-600'}`}>{label}</div>
            <div className="text-[9px] text-slate-400 font-bold uppercase tracking-widest leading-none mt-0.5">{description}</div>
        </div>
    );
}

function SummaryItem({ label, value, highlight }: any) {
    return (
        <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest">
            <span className="text-slate-400 italic">{label}</span>
            <span className={`italic ${highlight ? 'text-sm text-blue-600 font-mono' : 'text-slate-900'}`}>{value}</span>
        </div>
    );
}
