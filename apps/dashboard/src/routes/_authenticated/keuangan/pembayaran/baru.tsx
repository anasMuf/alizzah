import { useState, useMemo, useEffect, useRef } from 'react';
import { createFileRoute, useNavigate, useSearch } from '@tanstack/react-router';
import { useAtom } from 'jotai';
import { useDebounce } from 'use-debounce';
import { useQueries } from '@tanstack/react-query';
import { Search, User, Wallet, FileText, AlertCircle, Plus, Trash2, X } from 'lucide-react';
import { useGetV1Students, useGetV1StudentsId } from '../../../../api/endpoints/students/students';
import { useGetV1StudentsIdInvoices, getGetV1InvoicesIdQueryOptions } from '../../../../api/endpoints/invoices/invoices';
import { usePostV1Payments } from '../../../../api/endpoints/payments/payments';
import { useGetV1StudentsIdSavings } from '../../../../api/endpoints/savings/savings';
import { academicYearAtom } from '../../../../store/global';
import { Button } from '../../../../components/atoms/Button';
import { formatCurrency } from '../../../../utils/format';
import { useToast } from '../../../../components/molecules/Toast';

export const Route = createFileRoute('/_authenticated/keuangan/pembayaran/baru')({
  component: KasirPembayaranPage,
  validateSearch: (search: Record<string, unknown>) => ({
    student_id: search.student_id ? Number(search.student_id) : undefined,
    invoice_id: search.invoice_id ? Number(search.invoice_id) : undefined,
  }),
});

function KasirPembayaranPage() {
  const navigate = useNavigate();
  const searchParams = useSearch({ from: '/_authenticated/keuangan/pembayaran/baru' }) as any;
  const initialStudentId = searchParams.student_id ? Number(searchParams.student_id) : null;
  const initialInvoiceId = searchParams.invoice_id ? Number(searchParams.invoice_id) : null;
  const searchInputRef = useRef<HTMLInputElement>(null);

  const [activeAy] = useAtom(academicYearAtom);
  const { addToast } = useToast();

  // ─── Student Search ────────────────────────────────────────────────
  const [searchStudent, setSearchStudent] = useState('');
  const [debouncedSearch] = useDebounce(searchStudent, 500);
  const [selectedStudent, setSelectedStudent] = useState<any>(null);

  const { data: studentsResp, isLoading: isStudentsLoading } = useGetV1Students(
    { page: 1, limit: 10, search: debouncedSearch },
    { query: { enabled: debouncedSearch.length > 1 && !selectedStudent } }
  );
  const students = (studentsResp?.data as any)?.data || [];

  const { data: initialStudentResp } = useGetV1StudentsId(initialStudentId || 0, {
    query: { enabled: !!initialStudentId }
  });
  const initialStudentData = (initialStudentResp?.data as any)?.data;

  useEffect(() => {
    if (initialStudentData && !selectedStudent) {
      setSelectedStudent(initialStudentData);
    }
  }, [initialStudentData]);

  const handleSelectStudent = (student: any) => {
    setSelectedStudent(student);
    setSearchStudent('');
    // Auto-select all unpaid invoices
    setSelectedInvoices([]);
    setPayAmounts({});
  };

  const handleClearStudent = () => {
    setSelectedStudent(null);
    setSearchStudent('');
    setSelectedInvoices([]);
    setPayAmounts({});
    setIncidentalItems([]);
    setCashReceived('');
    setDepositChange(false);
    setNotes('');
    setPaymentSource('cash');
    setTimeout(() => searchInputRef.current?.focus(), 100);
  };

  // ─── Invoices ──────────────────────────────────────────────────────
  const [selectedInvoices, setSelectedInvoices] = useState<number[]>([]);
  const [payAmounts, setPayAmounts] = useState<Record<number, number>>({});

  const { data: invoicesResp, isLoading: isInvoicesLoading } = useGetV1StudentsIdInvoices(
    selectedStudent?.id || 0,
    { academic_year_id: activeAy?.id, status: 'unpaid' },
    { query: { enabled: !!selectedStudent?.id } }
  );
  const allInvoices = (invoicesResp?.data as any)?.data || [];
  const unpaidInvoices = allInvoices.filter((inv: any) => inv.status !== 'paid');

  // Auto-select invoice only if navigated from tagihan detail (with invoice_id param)
  useEffect(() => {
    if (unpaidInvoices.length > 0 && initialInvoiceId && selectedInvoices.length === 0) {
      const matched = unpaidInvoices.find((inv: any) => inv.id === initialInvoiceId);
      if (matched) {
        setSelectedInvoices([matched.id]);
      }
    }
  }, [unpaidInvoices, initialInvoiceId]);

  const invoiceDetailQueries = useQueries({
    queries: selectedInvoices.map((invId) => ({
      ...getGetV1InvoicesIdQueryOptions(invId),
      enabled: selectedInvoices.length > 0,
    })),
  });

  const invoiceItems = useMemo(() => {
    const items: any[] = [];
    const hasDispensation = new Set<number>();

    invoiceDetailQueries.forEach((q) => {
      const detail = (q.data?.data as any)?.data;
      if (detail?.items) {
        detail.items.forEach((item: any) => {
          if (item.category === 'dispensation') hasDispensation.add(detail.id);
        });
      }
    });

    invoiceDetailQueries.forEach((q) => {
      const detail = (q.data?.data as any)?.data;
      if (detail?.items) {
        detail.items.forEach((item: any) => {
          const sisa = Number(item.amount || 0) - Number(item.paid_amount || 0);
          if (sisa > 0 || item.category === 'dispensation') {
            const isLockedBySpp = item.category === 'monthly_spp' && hasDispensation.has(detail.id);
            items.push({
              id: item.id,
              invoice_id: detail.id,
              name: item.name,
              category: item.category,
              sisa_tagihan: sisa,
              is_dispensation: item.category === 'dispensation',
              is_locked: isLockedBySpp,
            });
          }
        });
      }
    });

    items.sort((a, b) => {
      if (a.is_dispensation && !b.is_dispensation) return 1;
      if (!a.is_dispensation && b.is_dispensation) return -1;
      return 0;
    });

    return items;
  }, [invoiceDetailQueries.map((q) => q.data).join(',')]);

  useEffect(() => {
    if (invoiceItems.length > 0) {
      setPayAmounts((prev) => {
        const next = { ...prev };
        invoiceItems.forEach((item) => {
          if (next[item.id] === undefined) next[item.id] = item.sisa_tagihan;
        });
        Object.keys(next).forEach((key) => {
          if (!invoiceItems.find((i: any) => i.id === Number(key))) delete next[Number(key)];
        });
        return next;
      });
    }
  }, [invoiceItems]);

  // ─── Savings Balance ───────────────────────────────────────────────
  const { data: savingsResp } = useGetV1StudentsIdSavings(selectedStudent?.id || 0, {
    query: { enabled: !!selectedStudent?.id }
  });
  const savings = (savingsResp?.data as any)?.data;

  // ─── Payment State ─────────────────────────────────────────────────
  const [paymentSource, setPaymentSource] = useState<'cash' | 'savings'>('cash');
  const [cashReceived, setCashReceived] = useState<string>('');
  const [depositChange, setDepositChange] = useState(false);
  const [notes, setNotes] = useState('');

  // ─── Incidental Items ──────────────────────────────────────────────
  type IncidentalItem = { id: number; name: string; amount: number; isSavings: boolean };
  const [incidentalItems, setIncidentalItems] = useState<IncidentalItem[]>([]);
  const [nextIncId, setNextIncId] = useState(1);
  const [incName, setIncName] = useState('');
  const [incAmount, setIncAmount] = useState('');
  const [savingsAmount, setSavingsAmount] = useState('');

  const incidentalSuggestions = useMemo(() => {
    const stored = localStorage.getItem('incidental_item_names');
    const names: string[] = stored ? JSON.parse(stored) : [];
    return names.filter(n => n !== 'Tabungan Umum');
  }, []);

  const saveIncidentalName = (name: string) => {
    if (name === 'Tabungan Umum') return;
    const stored = localStorage.getItem('incidental_item_names');
    const names: string[] = stored ? JSON.parse(stored) : [];
    if (!names.includes(name)) { names.push(name); localStorage.setItem('incidental_item_names', JSON.stringify(names)); }
  };

  const handleAddSavings = () => {
    const amount = Number(savingsAmount);
    if (amount <= 0) return;
    setIncidentalItems(prev => [...prev, { id: nextIncId, name: 'Tabungan Umum', amount, isSavings: true }]);
    setNextIncId(prev => prev + 1);
    setSavingsAmount('');
  };

  const handleAddIncidental = () => {
    const name = incName.trim();
    const amount = Number(incAmount);
    if (!name || amount <= 0) return;
    setIncidentalItems(prev => [...prev, { id: nextIncId, name, amount, isSavings: false }]);
    setNextIncId(prev => prev + 1);
    saveIncidentalName(name);
    setIncName('');
    setIncAmount('');
  };

  const handleRemoveIncidental = (id: number) => {
    setIncidentalItems(prev => prev.filter(item => item.id !== id));
  };

  // ─── Derived ───────────────────────────────────────────────────────
  const tabunganUmumTotal = useMemo(() => incidentalItems.filter(i => i.isSavings).reduce((sum, i) => sum + i.amount, 0), [incidentalItems]);

  const totalPay = useMemo(() => {
    const invoiceTotal = Object.values(payAmounts).reduce((sum, amt) => sum + amt, 0);
    const incidentalTotal = incidentalItems.reduce((sum, item) => sum + item.amount, 0);
    return invoiceTotal + incidentalTotal;
  }, [payAmounts, incidentalItems]);

  const changeAmount = useMemo(() => {
    const cash = Number(cashReceived) || 0;
    return cash > totalPay ? cash - totalPay : 0;
  }, [cashReceived, totalPay]);

  const handleToggleInvoice = (invId: number) => {
    setSelectedInvoices(prev => prev.includes(invId) ? prev.filter(id => id !== invId) : [...prev, invId]);
  };

  const handleAmountChange = (itemId: number, val: string) => {
    setPayAmounts(prev => ({ ...prev, [itemId]: Number(val) }));
  };

  const canSubmit = selectedStudent && totalPay > 0 && (
    (paymentSource === 'cash' && Number(cashReceived) >= totalPay) ||
    (paymentSource === 'savings' && (savings?.general_balance || 0) >= totalPay)
  );

  // ─── Mutation ──────────────────────────────────────────────────────
  const paymentMutation = usePostV1Payments({
    mutation: {
      onSuccess: (res: any) => {
        const paymentId = res.data?.data?.id;
        addToast({ variant: 'success', title: 'Berhasil', message: 'Pembayaran berhasil dicatat.' });
        navigate({ to: '/keuangan/pembayaran/$id', params: { id: paymentId.toString() } });
      },
      onError: (err: any) => {
        addToast({ variant: 'error', title: 'Gagal', message: err.message || 'Gagal menyimpan pembayaran.' });
      }
    }
  });

  const handleSubmit = () => {
    if (paymentSource === 'savings' && totalPay > (savings?.general_balance || 0)) {
      addToast({ variant: 'error', title: 'Validasi', message: 'Saldo tabungan tidak mencukupi.' });
      return;
    }
    if (paymentSource === 'cash' && Number(cashReceived) < totalPay) {
      addToast({ variant: 'error', title: 'Validasi', message: 'Uang diterima kurang dari total pembayaran.' });
      return;
    }

    const totalSavingsDeposit = tabunganUmumTotal + (depositChange && changeAmount > 0 ? changeAmount : 0);
    const customIncidentals = incidentalItems.filter(i => !i.isSavings).map(i => ({ name: i.name, amount: i.amount }));

    const payload = {
      academic_year_id: activeAy?.id || 1,
      student_id: selectedStudent.id,
      source: paymentSource,
      payment_date: new Date().toISOString().split('T')[0],
      items: Object.entries(payAmounts).filter(([_, amt]) => amt > 0).map(([itemId, amt]) => ({ invoice_item_id: Number(itemId), amount: amt })),
      incidental_items: customIncidentals.length > 0 ? customIncidentals : undefined,
      notes: notes || undefined,
      savings_deposit: totalSavingsDeposit > 0 ? totalSavingsDeposit : undefined,
    };

    paymentMutation.mutate({ data: payload as any });
  };

  // ─── RENDER ────────────────────────────────────────────────────────
  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col">

      {/* ═══ TOP BAR: Search Siswa ═══ */}
      <div className="flex-shrink-0 bg-white border-b border-gray-200 px-6 py-3">
        <div className="flex items-center gap-4">
          <h2 className="text-lg font-bold text-gray-900 whitespace-nowrap">Pembayaran</h2>
          <div className="flex-1 max-w-xl relative">
            {selectedStudent ? (
              <div className="flex items-center gap-3 bg-indigo-50 border border-indigo-200 rounded-lg px-4 py-2">
                <User className="w-5 h-5 text-indigo-600 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <span className="text-sm font-semibold text-gray-900">{selectedStudent.full_name}</span>
                  <span className="text-xs text-gray-500 ml-2">{selectedStudent.active_enrollment?.class_group?.name || '-'}</span>
                </div>
                <button type="button" onClick={handleClearStudent} className="text-gray-400 hover:text-gray-600"><X className="w-4 h-4" /></button>
              </div>
            ) : (
              <>
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                  <Search className="h-4 w-4 text-gray-400" />
                </div>
                <input
                  ref={searchInputRef}
                  type="text"
                  className="block w-full rounded-lg border-0 py-2 pl-9 pr-3 text-gray-900 ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-indigo-600 sm:text-sm"
                  placeholder="Cari nama siswa..."
                  value={searchStudent}
                  onChange={(e) => setSearchStudent(e.target.value)}
                  autoFocus
                />
                {isStudentsLoading && <p className="absolute left-0 top-full mt-1 text-xs text-gray-500 bg-white px-3 py-1 rounded shadow">Mencari...</p>}
                {!isStudentsLoading && students.length > 0 && debouncedSearch.length > 1 && (
                  <ul className="absolute z-20 left-0 top-full mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-52 overflow-y-auto">
                    {students.map((s: any) => (
                      <li key={s.id} className="px-4 py-2.5 hover:bg-indigo-50 cursor-pointer text-sm border-b border-gray-100 last:border-0" onClick={() => handleSelectStudent(s)}>
                        <span className="font-medium">{s.full_name}</span>
                        <span className="text-gray-500 ml-2">— {s.active_enrollment?.class_group?.name || '-'}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* ═══ BODY: 2-Panel Layout ═══ */}
      {!selectedStudent ? (
        <div className="flex-1 flex items-center justify-center bg-gray-50">
          <div className="text-center">
            <User className="w-16 h-16 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">Cari dan pilih siswa untuk memulai pembayaran</p>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex min-h-0">

          {/* ─── Panel Kiri: Tagihan + Item Tambahan ─── */}
          <div className="w-1/2 border-r border-gray-200 flex flex-col bg-white">
            {/* Tagihan List (scrollable) */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Tagihan Belum Lunas</p>

              {isInvoicesLoading ? (
                <div className="animate-pulse space-y-2">{[1, 2, 3].map(n => <div key={n} className="h-12 bg-gray-100 rounded" />)}</div>
              ) : unpaidInvoices.length === 0 ? (
                <div className="bg-green-50 p-3 rounded-md text-sm text-green-700">Tidak ada tagihan tertunggak.</div>
              ) : (
                <>
                  {/* Invoice checkboxes */}
                  <div className="space-y-2">
                    {unpaidInvoices.map((inv: any) => {
                      const sisa = Number(inv.total_amount) - Number(inv.paid_amount);
                      const isSelected = selectedInvoices.includes(inv.id);
                      return (
                        <label key={inv.id} className={`flex items-center p-2.5 border rounded-lg cursor-pointer text-sm transition-colors ${isSelected ? 'border-indigo-500 bg-indigo-50' : 'border-gray-200 hover:bg-gray-50'}`}>
                          <input type="checkbox" className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-600" checked={isSelected} onChange={() => handleToggleInvoice(inv.id)} />
                          <span className="ml-2.5 flex-1 font-medium text-gray-900">{inv.type === 'monthly' ? `Bulanan ${inv.month}/${inv.year}` : 'Registrasi / Lainnya'}</span>
                          <span className="font-semibold text-rose-600 tabular-nums">{formatCurrency(sisa)}</span>
                        </label>
                      );
                    })}
                  </div>

                  {/* Item detail table */}
                  {invoiceItems.length > 0 && (
                    <div className="mt-3 border-t border-gray-200 pt-3">
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Detail Item</p>
                      <div className="space-y-1">
                        {invoiceItems.map((item: any) => (
                          <div key={item.id} className={`flex items-center gap-2 py-1.5 px-2 rounded text-sm ${item.is_dispensation ? 'bg-green-50' : ''}`}>
                            <span className={`flex-1 ${item.is_dispensation ? 'text-green-700 italic text-xs' : 'text-gray-800'}`}>
                              {item.name}
                              {item.is_locked && <span className="ml-1 text-xs text-indigo-500">(dispensasi)</span>}
                            </span>
                            <span className={`text-xs tabular-nums ${item.is_dispensation ? 'text-green-600' : 'text-gray-500'}`}>{formatCurrency(item.sisa_tagihan)}</span>
                            <div className="w-24">
                              {item.is_dispensation || item.is_locked ? (
                                <span className={`block text-right text-xs font-medium tabular-nums ${item.is_dispensation ? 'text-green-600' : 'text-gray-900'}`}>{formatCurrency(payAmounts[item.id] ?? item.sisa_tagihan)}</span>
                              ) : (
                                <input
                                  type="number"
                                  className="block w-full rounded border-0 py-1 px-2 text-xs text-gray-900 ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-indigo-600 text-right tabular-nums"
                                  value={payAmounts[item.id] ?? ''}
                                  onChange={(e) => handleAmountChange(item.id, e.target.value)}
                                  max={item.sisa_tagihan}
                                  min={0}
                                />
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Item Tambahan (fixed bottom) */}
            <div className="flex-shrink-0 border-t border-gray-200 p-4 bg-gray-50 space-y-3">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Item Tambahan</p>
              {/* Tabungan Umum */}
              <div className="flex gap-2">
                <input type="number" className="flex-1 rounded border-0 py-1.5 px-3 text-sm ring-1 ring-inset ring-green-300 focus:ring-2 focus:ring-green-600 text-right" placeholder="Tab. Umum (Rp)" value={savingsAmount} onChange={(e) => setSavingsAmount(e.target.value)} min={0} />
                <button type="button" onClick={handleAddSavings} disabled={Number(savingsAmount) <= 0} className="px-2 py-1.5 rounded bg-green-100 text-green-700 hover:bg-green-200 disabled:opacity-40 text-xs font-medium"><Plus className="w-3.5 h-3.5" /></button>
              </div>
              {/* Insidental */}
              <div className="flex gap-2">
                <input list="incidental-suggestions" type="text" className="flex-1 rounded border-0 py-1.5 px-3 text-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-indigo-600" placeholder="Nama item" value={incName} onChange={(e) => setIncName(e.target.value)} />
                <datalist id="incidental-suggestions">{incidentalSuggestions.map(name => <option key={name} value={name} />)}</datalist>
                <input type="number" className="w-24 rounded border-0 py-1.5 px-2 text-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-indigo-600 text-right" placeholder="Nominal" value={incAmount} onChange={(e) => setIncAmount(e.target.value)} min={0} />
                <button type="button" onClick={handleAddIncidental} disabled={!incName.trim() || Number(incAmount) <= 0} className="px-2 py-1.5 rounded bg-gray-100 text-gray-600 hover:bg-gray-200 disabled:opacity-40 text-xs font-medium"><Plus className="w-3.5 h-3.5" /></button>
              </div>
              {/* Added items */}
              {incidentalItems.length > 0 && (
                <div className="space-y-1">
                  {incidentalItems.map(item => (
                    <div key={item.id} className="flex items-center justify-between text-xs py-1">
                      <span className={`${item.isSavings ? 'text-green-700' : 'text-gray-700'}`}>{item.isSavings ? '💰' : '📌'} {item.name}</span>
                      <div className="flex items-center gap-2">
                        <span className="font-medium tabular-nums">{formatCurrency(item.amount)}</span>
                        <button type="button" onClick={() => handleRemoveIncidental(item.id)} className="text-red-400 hover:text-red-600"><Trash2 className="w-3 h-3" /></button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* ─── Panel Kanan: Ringkasan + Pembayaran ─── */}
          <div className="w-1/2 flex flex-col bg-gray-50">
            {/* Ringkasan (grow, scrollable) */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Ringkasan Pembayaran</p>

              {/* Item summary */}
              <div className="bg-white rounded-lg border border-gray-200 divide-y divide-gray-100">
                {invoiceItems.filter(i => payAmounts[i.id] !== 0).map((item: any) => (
                  <div key={item.id} className={`flex justify-between px-3 py-2 text-sm ${item.is_dispensation ? 'bg-green-50' : ''}`}>
                    <span className={`${item.is_dispensation ? 'text-green-700 italic' : 'text-gray-700'} truncate flex-1 pr-2`}>{item.name}</span>
                    <span className={`font-medium tabular-nums whitespace-nowrap ${item.is_dispensation ? 'text-green-600' : 'text-gray-900'}`}>{formatCurrency(payAmounts[item.id] ?? item.sisa_tagihan)}</span>
                  </div>
                ))}
                {incidentalItems.map(item => (
                  <div key={`inc-${item.id}`} className="flex justify-between px-3 py-2 text-sm">
                    <span className={`${item.isSavings ? 'text-green-700' : 'text-gray-700'} truncate flex-1 pr-2`}>{item.name}</span>
                    <span className="font-medium tabular-nums text-gray-900">{formatCurrency(item.amount)}</span>
                  </div>
                ))}
                {(invoiceItems.length > 0 || incidentalItems.length > 0) && (
                  <div className="flex justify-between px-3 py-3 bg-indigo-50">
                    <span className="font-bold text-indigo-900">TOTAL</span>
                    <span className="text-xl font-bold text-indigo-700 tabular-nums">{formatCurrency(totalPay)}</span>
                  </div>
                )}
              </div>

              {/* Sumber Pembayaran */}
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Sumber Pembayaran</p>
                <div className="grid grid-cols-2 gap-2">
                  <label className={`border rounded-lg p-3 cursor-pointer flex items-center gap-2 text-sm ${paymentSource === 'cash' ? 'border-indigo-600 bg-indigo-50 ring-1 ring-indigo-600' : 'border-gray-200 bg-white hover:bg-gray-50'}`}>
                    <input type="radio" className="sr-only" checked={paymentSource === 'cash'} onChange={() => setPaymentSource('cash')} />
                    <Wallet className={`w-5 h-5 ${paymentSource === 'cash' ? 'text-indigo-600' : 'text-gray-400'}`} />
                    <span className="font-medium">Tunai</span>
                  </label>
                  <label className={`border rounded-lg p-3 cursor-pointer flex items-center gap-2 text-sm ${paymentSource === 'savings' ? 'border-indigo-600 bg-indigo-50 ring-1 ring-indigo-600' : 'border-gray-200 bg-white hover:bg-gray-50'}`}>
                    <input type="radio" className="sr-only" checked={paymentSource === 'savings'} onChange={() => setPaymentSource('savings')} />
                    <FileText className={`w-5 h-5 ${paymentSource === 'savings' ? 'text-indigo-600' : 'text-gray-400'}`} />
                    <div>
                      <span className="font-medium">Tabungan</span>
                      <span className="block text-xs text-gray-500">{formatCurrency(savings?.general_balance || 0)}</span>
                    </div>
                  </label>
                </div>
              </div>

              {/* Savings insufficient warning */}
              {paymentSource === 'savings' && (savings?.general_balance || 0) < totalPay && totalPay > 0 && (
                <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-lg p-3">
                  <AlertCircle className="h-4 w-4 text-red-400 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-red-700">Saldo tabungan tidak mencukupi.</p>
                </div>
              )}

              {/* Cash input */}
              {paymentSource === 'cash' && totalPay > 0 && (
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Uang Diterima (Rp)</label>
                    <input
                      type="number"
                      className="block w-full rounded-lg border-0 py-2.5 px-4 text-lg font-bold text-gray-900 ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-indigo-600 tabular-nums"
                      value={cashReceived}
                      onChange={(e) => setCashReceived(e.target.value)}
                      placeholder="0"
                    />
                  </div>
                  {Number(cashReceived) >= totalPay && (
                    <div className="bg-white rounded-lg border border-gray-200 p-3 space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">Kembalian</span>
                        <span className="font-bold text-gray-900 tabular-nums">{formatCurrency(changeAmount)}</span>
                      </div>
                      {changeAmount > 0 && (
                        <label className="flex items-center pt-2 border-t border-gray-100">
                          <input type="checkbox" className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-600" checked={depositChange} onChange={(e) => setDepositChange(e.target.checked)} />
                          <span className="ml-2 text-xs text-gray-700">Kembalian ({formatCurrency(changeAmount)}) → Tabungan Umum</span>
                        </label>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Catatan */}
              {totalPay > 0 && (
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Catatan (Opsional)</label>
                  <input type="text" className="block w-full rounded-lg border-0 py-1.5 px-3 text-sm text-gray-900 ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-indigo-600" placeholder="Catatan tambahan..." value={notes} onChange={(e) => setNotes(e.target.value)} />
                </div>
              )}
            </div>

            {/* Submit button (fixed bottom) */}
            <div className="flex-shrink-0 border-t border-gray-200 p-4 bg-white">
              <Button
                variant="primary"
                className="w-full justify-center py-3 text-base"
                onClick={handleSubmit}
                disabled={!canSubmit || paymentMutation.isPending}
              >
                {paymentMutation.isPending ? 'Memproses...' : `Proses & Cetak Struk — ${formatCurrency(totalPay)}`}
              </Button>
            </div>
          </div>

        </div>
      )}
    </div>
  );
}
