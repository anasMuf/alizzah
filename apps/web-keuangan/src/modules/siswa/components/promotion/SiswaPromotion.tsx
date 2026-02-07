
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
        <div className="max-w-5xl mx-auto space-y-8">
            {/* Stepper Indicator */}
            <div className="flex items-center justify-center mb-8">
                <StepIndicator current={step} step="CONFIG" label="1. Konfigurasi" />
                <div className={`w-12 h-1 bg-slate-200 mx-2 rounded ${step !== 'CONFIG' ? 'bg-blue-600' : ''}`} />
                <StepIndicator current={step} step="SELECTION" label="2. Seleksi Siswa" />
                <div className={`w-12 h-1 bg-slate-200 mx-2 rounded ${step === 'CONFIRM' ? 'bg-blue-600' : ''}`} />
                <StepIndicator current={step} step="CONFIRM" label="3. Konfirmasi" />
            </div>

            <AnimatePresence mode="wait">
                {/* STEP 1: CONFIGURATION */}
                {step === 'CONFIG' && (
                    <motion.div
                        key="config"
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 20 }}
                        className="grid grid-cols-1 md:grid-cols-2 gap-6"
                    >
                        {/* Source Selection */}
                        <div className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
                            <div className="flex items-center gap-3 mb-2">
                                <div className="p-2 bg-blue-50 text-blue-600 rounded-lg"><Users size={20} /></div>
                                <h3 className="font-bold text-slate-800">Pilih Rombel Asal</h3>
                            </div>
                            <select
                                value={sourceRombelId}
                                onChange={(e) => {
                                    setSourceRombelId(e.target.value);
                                    setTargetRombelId('');
                                    setSelectedSiswaIds([]);
                                }}
                                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-medium"
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
                        <div className="space-y-6">
                            <div className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
                                <div className="flex items-center gap-3 mb-2">
                                    <div className="p-2 bg-purple-50 text-purple-600 rounded-lg"><TrendingUp size={20} /></div>
                                    <h3 className="font-bold text-slate-800">Jenis Aksi</h3>
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <ActionCard
                                        active={action === 'PROMOTE'}
                                        onClick={() => setAction('PROMOTE')}
                                        icon={GraduationCap}
                                        label="Kenaikan Kelas"
                                        description="Pindahkan ke kelas baru"
                                    />
                                    <ActionCard
                                        active={action === 'GRADUATE'}
                                        onClick={() => setAction('GRADUATE')}
                                        icon={Award}
                                        label="Kelulusan"
                                        description="Set status LULUS"
                                        color="emerald"
                                    />
                                </div>
                            </div>

                            {action === 'PROMOTE' && (
                                <motion.div
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: 'auto' }}
                                    className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4 overflow-hidden"
                                >
                                    <div className="flex items-center gap-3 mb-2">
                                        <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg"><GraduationCap size={20} /></div>
                                        <h3 className="font-bold text-slate-800">Rombel Tujuan</h3>
                                    </div>
                                    <select
                                        value={targetRombelId}
                                        onChange={(e) => setTargetRombelId(e.target.value)}
                                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-medium"
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
                        className="space-y-6"
                    >
                        <div className="flex flex-col md:flex-row gap-6">
                            {/* Student List */}
                            <div className="flex-1 bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden flex flex-col h-[600px]">
                                <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
                                    <div className="relative flex-1 max-w-sm">
                                        <Search className="absolute left-3 top-2.5 text-slate-400" size={18} />
                                        <input
                                            type="text"
                                            value={search}
                                            onChange={(e) => setSearch(e.target.value)}
                                            placeholder="Cari Siswa..."
                                            className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                                        />
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <div className="text-xs font-bold text-slate-500 uppercase">
                                            {selectedSiswaIds.length} / {filteredSiswas.length} Dipilih
                                        </div>
                                        <button onClick={toggleSelectAll} className="p-2 hover:bg-slate-200 rounded-lg transition-colors">
                                            {selectedSiswaIds.length === filteredSiswas.length && filteredSiswas.length > 0 ? <CheckSquare size={20} className="text-blue-600" /> : <Square size={20} className="text-slate-400" />}
                                        </button>
                                    </div>
                                </div>

                                <div className="flex-1 overflow-y-auto p-2">
                                    {loadingSiswa ? (
                                        <div className="h-full flex items-center justify-center"><Loader2 className="animate-spin text-blue-500" /></div>
                                    ) : filteredSiswas.length === 0 ? (
                                        <div className="h-full flex items-center justify-center text-slate-400 text-sm">Tidak ada siswa ditemukan.</div>
                                    ) : (
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                            {filteredSiswas.map(siswa => (
                                                <div
                                                    key={siswa.id}
                                                    onClick={() => toggleSelectSiswa(siswa.id)}
                                                    className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all border ${selectedSiswaIds.includes(siswa.id) ? 'bg-blue-50 border-blue-200' : 'bg-white border-slate-100 hover:border-blue-200'}`}
                                                >
                                                    <div className={selectedSiswaIds.includes(siswa.id) ? 'text-blue-600' : 'text-slate-300'}>
                                                        {selectedSiswaIds.includes(siswa.id) ? <CheckSquare size={18} /> : <Square size={18} />}
                                                    </div>
                                                    <div>
                                                        <div className="text-sm font-bold text-slate-900">{siswa.namaLengkap}</div>
                                                        <div className="text-xs text-slate-500 font-mono">{siswa.nis}</div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Info Panel */}
                            <div className="w-full md:w-80 space-y-4">
                                {action === 'PROMOTE' && targetRombel && (
                                    <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm space-y-4">
                                        <h4 className="font-bold text-slate-800 text-sm">Kapasitas Kelas Tujuan</h4>
                                        <div className="space-y-2">
                                            <div className="flex justify-between text-xs text-slate-500">
                                                <span>Kapasitas</span>
                                                <span>{targetRombel.jumlahSiswa} / {targetRombel.kapasitas}</span>
                                            </div>
                                            <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                                                <div
                                                    className={`h-full transition-all ${isOverCapacity ? 'bg-rose-500' : 'bg-emerald-500'}`}
                                                    style={{ width: `${Math.min(100, ((targetRombel.jumlahSiswa + selectedSiswaIds.length) / targetRombel.kapasitas) * 100)}%` }}
                                                />
                                            </div>
                                            {isOverCapacity ? (
                                                <div className="p-3 bg-rose-50 text-rose-700 rounded-xl text-xs font-bold flex items-start gap-2">
                                                    <AlertTriangle size={14} className="shrink-0 mt-0.5" />
                                                    <span>Over Capacity! (+{(targetRombel.jumlahSiswa + selectedSiswaIds.length) - targetRombel.kapasitas})</span>
                                                </div>
                                            ) : (
                                                <div className="p-3 bg-emerald-50 text-emerald-700 rounded-xl text-xs font-bold flex items-center gap-2">
                                                    <CheckCircle2 size={14} />
                                                    <span>Kapasitas Aman (Sisa {targetRombel.kapasitas - (targetRombel.jumlahSiswa + selectedSiswaIds.length)})</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}
                                {action === 'GRADUATE' && (
                                    <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm space-y-4">
                                        <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg w-fit"><Award size={20} /></div>
                                        <h4 className="font-bold text-slate-800">Mode Kelulusan</h4>
                                        <p className="text-xs text-slate-500 leading-relaxed">
                                            Siswa yang dipilih akan diubah statusnya menjadi <strong>LULUS</strong>.
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
                        className="max-w-xl mx-auto"
                    >
                        <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-xl text-center space-y-6">
                            <div className={`w-20 h-20 mx-auto rounded-full flex items-center justify-center ${action === 'PROMOTE' ? 'bg-blue-100 text-blue-600' : 'bg-indigo-100 text-indigo-600'}`}>
                                {action === 'PROMOTE' ? <TrendingUp size={40} /> : <Award size={40} />}
                            </div>

                            <div>
                                <h2 className="text-2xl font-bold text-slate-900 mb-2">Konfirmasi {action === 'PROMOTE' ? 'Kenaikan Kelas' : 'Kelulusan'}</h2>
                                <p className="text-slate-500">Mohon periksa kembali data sebelum melanjutkan.</p>
                            </div>

                            <div className="bg-slate-50 rounded-2xl p-6 text-left space-y-4 border border-slate-100">
                                <SummaryItem label="Aksi" value={action === 'PROMOTE' ? 'Kenaikan Kelas' : 'Kelulusan Siswa'} />
                                <SummaryItem label="Dari Rombel" value={sourceRombel?.nama || '-'} />
                                {action === 'PROMOTE' && <SummaryItem label="Ke Rombel" value={targetRombel?.nama || '-'} />}
                                <SummaryItem label="Total Siswa" value={`${selectedSiswaIds.length} Siswa`} highlight />
                            </div>

                            <button
                                onClick={handleExecute}
                                disabled={promoteMutation.isPending}
                                className={`w-full py-4 rounded-xl font-bold text-white shadow-lg transition-transform active:scale-95 flex items-center justify-center gap-2 ${action === 'PROMOTE' ? 'bg-blue-600 hover:bg-blue-700 shadow-blue-200' : 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-200'}`}
                            >
                                {promoteMutation.isPending ? <Loader2 className="animate-spin" /> : <CheckCircle2 />}
                                <span>Eksekusi Sekarang</span>
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Navigation Buttons for Config/Selection */}
            {step !== 'CONFIRM' && (
                <div className="flex justify-between pt-4 border-t border-slate-200">
                    {step === 'SELECTION' ? (
                        <button onClick={handleBack} className="px-6 py-2.5 font-bold text-slate-500 hover:bg-slate-100 rounded-xl transition-colors">
                            Kembali
                        </button>
                    ) : <div></div>}

                    <button
                        onClick={handleNext}
                        disabled={
                            (step === 'CONFIG' && (!sourceRombelId || (action === 'PROMOTE' && !targetRombelId))) ||
                            (step === 'SELECTION' && selectedSiswaIds.length === 0)
                        }
                        className="px-8 py-2.5 bg-slate-900 text-white font-bold rounded-xl hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2"
                    >
                        <span>Lanjut</span>
                        <ArrowRight size={18} />
                    </button>
                </div>
            )}
        </div>
    );
}

// Helper Components
function StepIndicator({ current, step, label }: { current: string, step: string, label: string }) {
    const isActive = current === step;
    // const isPast = (current === 'SELECTION' && step === 'CONFIG') || (current === 'CONFIRM' && step !== 'CONFIRM'); // Simple logic for demo

    let color = 'text-slate-400 bg-slate-100';
    if (isActive) color = 'text-blue-600 bg-blue-50 border-2 border-blue-600';
    // Logic for 'past' steps could be added to make them green/checked

    return (
        <div className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold transition-all ${color}`}>
            {label}
        </div>
    );
}

function ActionCard({ active, onClick, icon: Icon, label, description, color = 'blue' }: any) {
    const activeClass = color === 'emerald' ? 'border-emerald-500 bg-emerald-50 ring-2 ring-emerald-500/20' : 'border-blue-500 bg-blue-50 ring-2 ring-blue-500/20';

    return (
        <div
            onClick={onClick}
            className={`p-4 rounded-2xl border-2 cursor-pointer transition-all hover:scale-[1.02] ${active ? activeClass : 'border-slate-100 hover:border-slate-200'}`}
        >
            <div className={`mb-2 ${active ? (color === 'emerald' ? 'text-emerald-600' : 'text-blue-600') : 'text-slate-400'}`}>
                <Icon size={24} />
            </div>
            <div className={`font-bold text-sm ${active ? 'text-slate-900' : 'text-slate-600'}`}>{label}</div>
            <div className="text-xs text-slate-400">{description}</div>
        </div>
    );
}

function SummaryItem({ label, value, highlight }: any) {
    return (
        <div className="flex justify-between items-center text-sm">
            <span className="text-slate-500 font-medium">{label}</span>
            <span className={`font-bold ${highlight ? 'text-lg text-blue-600' : 'text-slate-900'}`}>{value}</span>
        </div>
    );
}
