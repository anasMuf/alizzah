import { useState, useMemo, useEffect } from 'react';
import { createFileRoute, useNavigate, useSearch } from '@tanstack/react-router';
import { useAtom } from 'jotai';
import { useDebounce } from 'use-debounce';
import { useQueries } from '@tanstack/react-query';
import { Check, Search, User, FileText, Wallet, AlertCircle } from 'lucide-react';
import { useGetV1Students, useGetV1StudentsId } from '../../../../api/endpoints/students/students';
import { useGetV1StudentsIdInvoices, getGetV1InvoicesIdQueryOptions } from '../../../../api/endpoints/invoices/invoices';
import { usePostV1Payments } from '../../../../api/endpoints/payments/payments';
import { useGetV1StudentsIdSavings } from '../../../../api/endpoints/savings/savings';
import { academicYearAtom } from '../../../../store/global';
import { Button } from '../../../../components/atoms/Button';
import { formatCurrency } from '../../../../utils/format';
import { useToast } from '../../../../components/molecules/Toast';

export const Route = createFileRoute('/_authenticated/keuangan/pembayaran/baru')({
  component: WizardPembayaranPage,
  validateSearch: (search: Record<string, unknown>) => ({
    student_id: search.student_id ? Number(search.student_id) : undefined,
  }),
});

const STEPS = [
  { id: 1, name: 'Pilih Siswa', icon: User },
  { id: 2, name: 'Pilih Tagihan', icon: FileText },
  { id: 3, name: 'Metode Pembayaran', icon: Wallet },
  { id: 4, name: 'Konfirmasi', icon: Check },
];

function WizardPembayaranPage() {
  const navigate = useNavigate();
  const searchParams = useSearch({ from: '/_authenticated/keuangan/pembayaran/baru' }) as any;
  const initialStudentId = searchParams.student_id ? Number(searchParams.student_id) : null;

  const [activeAy] = useAtom(academicYearAtom);
  const { addToast } = useToast();

  const [currentStep, setCurrentStep] = useState(1);

  // State Step 1
  const [searchStudent, setSearchStudent] = useState('');
  const [debouncedSearch] = useDebounce(searchStudent, 500);
  const [selectedStudent, setSelectedStudent] = useState<any>(null);

  // Queries Step 1
  const { data: studentsResp, isLoading: isStudentsLoading } = useGetV1Students(
    { page: 1, limit: 10, search: debouncedSearch },
    { query: { enabled: currentStep === 1 && debouncedSearch.length > 1 } }
  );
  const students = (studentsResp?.data as any)?.data || [];

  // Fetch student data when pre-filling from URL param
  const { data: initialStudentResp } = useGetV1StudentsId(initialStudentId || 0, {
    query: { enabled: !!initialStudentId }
  });
  const initialStudentData = (initialStudentResp?.data as any)?.data;

  // Effect for pre-filling student from URL param
  useEffect(() => {
    if (initialStudentData && currentStep === 1 && !selectedStudent) {
      setSelectedStudent(initialStudentData);
      setCurrentStep(2);
    }
  }, [initialStudentData]);

  // State Step 2
  const [selectedInvoices, setSelectedInvoices] = useState<number[]>([]);
  const [payAmounts, setPayAmounts] = useState<Record<number, number>>({});

  // Queries Step 2 — fetch unpaid invoices list
  const { data: invoicesResp, isLoading: isInvoicesLoading } = useGetV1StudentsIdInvoices(
    selectedStudent?.id || 0,
    { academic_year_id: activeAy?.id, status: 'unpaid' },
    { query: { enabled: currentStep >= 2 && !!selectedStudent?.id } }
  );
  const allInvoices = (invoicesResp?.data as any)?.data || [];
  const unpaidInvoices = allInvoices.filter((inv: any) => inv.status !== 'paid');

  // Fetch detail (items) for each selected invoice using useQueries
  const invoiceDetailQueries = useQueries({
    queries: selectedInvoices.map((invId) => ({
      ...getGetV1InvoicesIdQueryOptions(invId),
      enabled: selectedInvoices.length > 0,
    })),
  });

  // Flatten all invoice items from selected invoices
  const invoiceItems = useMemo(() => {
    const items: any[] = [];
    invoiceDetailQueries.forEach((q) => {
      const detail = (q.data?.data as any)?.data;
      if (detail?.items) {
        detail.items.forEach((item: any) => {
          const sisa = Number(item.amount || 0) - Number(item.paid_amount || 0);
          if (sisa > 0) {
            items.push({
              id: item.id,
              invoice_id: detail.id,
              name: item.name,
              category: item.category,
              sisa_tagihan: sisa,
            });
          }
        });
      }
    });
    return items;
  }, [invoiceDetailQueries.map((q) => q.data).join(',')]);

  // Auto-populate pay amounts when invoice items change
  useEffect(() => {
    if (invoiceItems.length > 0) {
      setPayAmounts((prev) => {
        const next = { ...prev };
        invoiceItems.forEach((item) => {
          if (next[item.id] === undefined) {
            next[item.id] = item.sisa_tagihan; // Default pay full
          }
        });
        // Remove items that are no longer in the list
        Object.keys(next).forEach((key) => {
          if (!invoiceItems.find((i: any) => i.id === Number(key))) {
            delete next[Number(key)];
          }
        });
        return next;
      });
    }
  }, [invoiceItems]);

  // Queries Step 3 (Savings Balance)
  const { data: savingsResp } = useGetV1StudentsIdSavings(selectedStudent?.id || 0, {
    query: { enabled: currentStep === 3 && !!selectedStudent?.id }
  });
  const savings = (savingsResp?.data as any)?.data;

  // State Step 3
  const [paymentSource, setPaymentSource] = useState<'cash' | 'savings'>('cash');
  const [cashReceived, setCashReceived] = useState<string>('');
  const [depositChange, setDepositChange] = useState(false);
  const [notes, setNotes] = useState('');

  // Derived
  const totalPay = useMemo(() => {
    return Object.values(payAmounts).reduce((sum, amt) => sum + amt, 0);
  }, [payAmounts]);

  const changeAmount = useMemo(() => {
    const cash = Number(cashReceived) || 0;
    return cash > totalPay ? cash - totalPay : 0;
  }, [cashReceived, totalPay]);

  const handleToggleInvoice = (invId: number) => {
    setSelectedInvoices(prev => 
      prev.includes(invId) ? prev.filter(id => id !== invId) : [...prev, invId]
    );
  };

  const handleAmountChange = (itemId: number, val: string) => {
    setPayAmounts(prev => ({
      ...prev,
      [itemId]: Number(val)
    }));
  };

  // Mutation
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

    const payload = {
      academic_year_id: activeAy?.id || 1,
      student_id: selectedStudent.id,
      source: paymentSource,
      payment_date: new Date().toISOString().split('T')[0],
      items: Object.entries(payAmounts)
        .filter(([_, amt]) => amt > 0)
        .map(([itemId, amt]) => ({
          invoice_item_id: Number(itemId),
          amount: amt
        })),
      notes: notes || undefined,
      savings_deposit: depositChange && changeAmount > 0 ? changeAmount : undefined
    };

    paymentMutation.mutate({ data: payload as any });
  };

  return (
    <div className="space-y-8 max-w-4xl mx-auto pb-12">
      <div>
        <h2 className="text-2xl font-bold leading-7 text-gray-900">Catat Pembayaran Baru</h2>
        <p className="mt-1 text-sm text-gray-500">Ikuti langkah-langkah berikut untuk mencatat pembayaran siswa.</p>
      </div>

      {/* Stepper */}
      <nav aria-label="Progress">
        <ol role="list" className="divide-y divide-gray-300 rounded-md border border-gray-300 md:flex md:divide-y-0 bg-white">
          {STEPS.map((step, stepIdx) => (
            <li key={step.name} className="relative md:flex md:flex-1">
              <div className="group flex w-full items-center">
                <span className="flex items-center px-6 py-4 text-sm font-medium">
                  <span className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full border-2 ${
                    currentStep > step.id ? 'border-indigo-600 bg-indigo-600' : 
                    currentStep === step.id ? 'border-indigo-600' : 'border-gray-300'
                  }`}>
                    {currentStep > step.id ? (
                      <Check className="h-6 w-6 text-white" />
                    ) : (
                      <step.icon className={`h-5 w-5 ${currentStep === step.id ? 'text-indigo-600' : 'text-gray-500'}`} />
                    )}
                  </span>
                  <span className={`ml-4 text-sm font-medium ${currentStep >= step.id ? 'text-indigo-600' : 'text-gray-500'}`}>
                    {step.name}
                  </span>
                </span>
              </div>
              {stepIdx !== STEPS.length - 1 ? (
                <div className="absolute right-0 top-0 hidden h-full w-5 md:block" aria-hidden="true">
                  <svg className="h-full w-full text-gray-300" viewBox="0 0 22 80" fill="none" preserveAspectRatio="none">
                    <path d="M0 -2L20 40L0 82" vectorEffect="non-scaling-stroke" stroke="currentcolor" strokeLinejoin="round" />
                  </svg>
                </div>
              ) : null}
            </li>
          ))}
        </ol>
      </nav>

      <div className="bg-white shadow-sm ring-1 ring-gray-900/5 sm:rounded-xl p-6 sm:p-8">
        
        {/* STEP 1: Pilih Siswa */}
        {currentStep === 1 && (
          <div className="space-y-6">
            <h3 className="text-lg font-medium leading-6 text-gray-900">Cari & Pilih Siswa</h3>
            <div className="relative">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                <Search className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                className="block w-full rounded-md border-0 py-2 pl-10 text-gray-900 ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
                placeholder="Ketik nama atau NISN (min 2 karakter)..."
                value={searchStudent}
                onChange={(e) => setSearchStudent(e.target.value)}
              />
            </div>
            
            {isStudentsLoading && <p className="text-sm text-gray-500">Mencari...</p>}
            
            {!isStudentsLoading && students.length > 0 && (
              <ul className="divide-y divide-gray-100 border border-gray-200 rounded-md">
                {students.map((student: any) => (
                  <li 
                    key={student.id} 
                    className={`flex items-center justify-between gap-x-6 p-4 hover:bg-gray-50 cursor-pointer ${selectedStudent?.id === student.id ? 'bg-indigo-50 border-l-4 border-indigo-600' : ''}`}
                    onClick={() => setSelectedStudent(student)}
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-semibold leading-6 text-gray-900">{student.full_name}</p>
                      <p className="mt-1 truncate text-xs leading-5 text-gray-500">
                        {student.nisn ? `NISN: ${student.nisn}` : '-'} &bull; {student.active_enrollment?.class_group?.name || 'Tanpa Rombel'}
                      </p>
                    </div>
                    {selectedStudent?.id === student.id && <Check className="w-5 h-5 text-indigo-600" />}
                  </li>
                ))}
              </ul>
            )}

            <div className="flex justify-end pt-4 border-t border-gray-200">
              <Button variant="primary" onClick={() => setCurrentStep(2)} disabled={!selectedStudent}>
                Lanjut ke Pilih Tagihan
              </Button>
            </div>
          </div>
        )}

        {/* STEP 2: Pilih Tagihan */}
        {currentStep === 2 && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-medium leading-6 text-gray-900">Tagihan Belum Lunas - {selectedStudent?.full_name}</h3>
            </div>

            {isInvoicesLoading ? (
              <p className="text-sm text-gray-500">Memuat tagihan...</p>
            ) : unpaidInvoices.length === 0 ? (
              <div className="bg-green-50 p-4 rounded-md">
                <p className="text-sm text-green-700">Siswa tidak memiliki tagihan tertunggak pada tahun ajaran ini.</p>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 max-h-64 overflow-y-auto">
                  <p className="text-sm font-medium text-gray-700 mb-3">1. Pilih Tagihan (Invoices)</p>
                  <div className="space-y-3">
                    {unpaidInvoices.map((inv: any) => {
                      const sisa = Number(inv.total_amount) - Number(inv.paid_amount);
                      const isSelected = selectedInvoices.includes(inv.id);
                      return (
                        <label key={inv.id} className={`flex items-start p-3 border rounded-md cursor-pointer transition-colors ${isSelected ? 'border-indigo-600 bg-indigo-50' : 'border-gray-300 bg-white hover:bg-gray-50'}`}>
                          <div className="flex h-6 items-center">
                            <input
                              type="checkbox"
                              className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-600"
                              checked={isSelected}
                              onChange={() => handleToggleInvoice(inv.id)}
                            />
                          </div>
                          <div className="ml-3 flex-1 flex justify-between">
                            <div>
                              <span className="block text-sm font-medium text-gray-900">{inv.type === 'monthly' ? `Bulanan (${inv.month}/${inv.year})` : 'Registrasi / Lainnya'}</span>
                              <span className="block text-xs text-gray-500">Total: {formatCurrency(Number(inv.total_amount))}</span>
                            </div>
                            <div className="text-sm font-bold text-rose-600">
                              Sisa: {formatCurrency(sisa)}
                            </div>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                </div>

                {selectedInvoices.length > 0 && (
                  <div className="border border-gray-200 rounded-lg p-4">
                    <p className="text-sm font-medium text-gray-700 mb-4">2. Tentukan Nominal Bayar per Item</p>
                    <table className="min-w-full divide-y divide-gray-300">
                      <thead>
                        <tr>
                          <th className="py-2 text-left text-xs font-semibold text-gray-500">Item Tagihan</th>
                          <th className="py-2 text-right text-xs font-semibold text-gray-500">Sisa Tagihan</th>
                          <th className="py-2 text-right text-xs font-semibold text-gray-500">Akan Dibayar (Rp)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {invoiceItems.map((item: any) => (
                          <tr key={item.id}>
                            <td className="py-3 text-sm text-gray-900">{item.name}</td>
                            <td className="py-3 text-sm text-gray-500 text-right">{formatCurrency(item.sisa_tagihan)}</td>
                            <td className="py-3 text-right">
                              <input
                                type="number"
                                className="block w-32 ml-auto rounded-md border-0 py-1.5 text-gray-900 ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6 text-right"
                                value={payAmounts[item.id] || ''}
                                onChange={(e) => handleAmountChange(item.id, e.target.value)}
                                max={item.sisa_tagihan}
                                min={0}
                              />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr>
                          <td colSpan={2} className="py-4 text-right text-sm font-bold text-gray-900">Total Pembayaran</td>
                          <td className="py-4 text-right text-lg font-bold text-indigo-600">{formatCurrency(totalPay)}</td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                )}
              </div>
            )}

            <div className="flex justify-between pt-4 border-t border-gray-200">
              <Button variant="secondary" onClick={() => setCurrentStep(1)}>Kembali</Button>
              <Button variant="primary" onClick={() => setCurrentStep(3)} disabled={selectedInvoices.length === 0 || totalPay <= 0}>
                Lanjut ke Pembayaran
              </Button>
            </div>
          </div>
        )}

        {/* STEP 3: Metode & Kalkulasi */}
        {currentStep === 3 && (
          <div className="space-y-6">
            <h3 className="text-lg font-medium leading-6 text-gray-900">Metode Pembayaran</h3>
            
            <div className="bg-indigo-50 p-4 rounded-lg flex justify-between items-center">
              <span className="text-sm font-medium text-indigo-900">Total Harus Dibayar</span>
              <span className="text-2xl font-bold text-indigo-700">{formatCurrency(totalPay)}</span>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <label className={`border rounded-lg p-4 cursor-pointer flex flex-col items-center gap-2 ${paymentSource === 'cash' ? 'border-indigo-600 bg-indigo-50 ring-1 ring-indigo-600' : 'border-gray-200 hover:bg-gray-50'}`}>
                <input type="radio" className="sr-only" checked={paymentSource === 'cash'} onChange={() => setPaymentSource('cash')} />
                <Wallet className={`w-8 h-8 ${paymentSource === 'cash' ? 'text-indigo-600' : 'text-gray-400'}`} />
                <span className="font-medium text-sm">Uang Tunai (Kas)</span>
              </label>
              
              <label className={`border rounded-lg p-4 cursor-pointer flex flex-col items-center gap-2 ${paymentSource === 'savings' ? 'border-indigo-600 bg-indigo-50 ring-1 ring-indigo-600' : 'border-gray-200 hover:bg-gray-50'}`}>
                <input type="radio" className="sr-only" checked={paymentSource === 'savings'} onChange={() => setPaymentSource('savings')} />
                <FileText className={`w-8 h-8 ${paymentSource === 'savings' ? 'text-indigo-600' : 'text-gray-400'}`} />
                <span className="font-medium text-sm text-center">Potong Tabungan Umum</span>
                <span className="text-xs text-gray-500">Saldo: {formatCurrency(savings?.general_balance || 0)}</span>
              </label>
            </div>

            {paymentSource === 'savings' && (savings?.general_balance || 0) < totalPay && (
              <div className="rounded-md bg-red-50 p-4">
                <div className="flex">
                  <AlertCircle className="h-5 w-5 text-red-400" aria-hidden="true" />
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-red-800">Saldo Tidak Mencukupi</h3>
                    <p className="text-sm text-red-700 mt-1">Saldo Tabungan Umum siswa kurang dari total yang harus dibayar.</p>
                  </div>
                </div>
              </div>
            )}

            {paymentSource === 'cash' && (
              <div className="space-y-4 border-t border-gray-200 pt-6">
                <div>
                  <label className="block text-sm font-medium leading-6 text-gray-900 mb-1">Jumlah Uang Diterima (Rp)</label>
                  <input
                    type="number"
                    className="block w-full sm:w-1/2 rounded-md border-0 py-2 px-3 text-gray-900 ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6 text-lg font-semibold"
                    value={cashReceived}
                    onChange={(e) => setCashReceived(e.target.value)}
                  />
                </div>

                {Number(cashReceived) >= totalPay && (
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <div className="flex justify-between text-sm mb-2">
                      <span className="text-gray-500">Kembalian:</span>
                      <span className="font-bold text-gray-900">{formatCurrency(changeAmount)}</span>
                    </div>
                    {changeAmount > 0 && (
                      <div className="mt-4 pt-4 border-t border-gray-200">
                        <label className="flex items-center">
                          <input
                            type="checkbox"
                            className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-600"
                            checked={depositChange}
                            onChange={(e) => setDepositChange(e.target.checked)}
                          />
                          <span className="ml-2 text-sm text-gray-900">Masukkan kembalian (<span className="font-semibold">{formatCurrency(changeAmount)}</span>) ke Tabungan Umum?</span>
                        </label>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            <div className="flex justify-between pt-4 border-t border-gray-200">
              <Button type="button" variant="secondary" onClick={() => setCurrentStep(2)}>Kembali</Button>
              <Button 
                variant="primary" 
                onClick={() => setCurrentStep(4)} 
                disabled={
                  (paymentSource === 'cash' && Number(cashReceived) < totalPay) || 
                  (paymentSource === 'savings' && (savings?.general_balance || 0) < totalPay)
                }
              >
                Lanjut Konfirmasi
              </Button>
            </div>
          </div>
        )}

        {/* STEP 4: Konfirmasi */}
        {currentStep === 4 && (
          <div className="space-y-6">
            <h3 className="text-lg font-medium leading-6 text-gray-900">Konfirmasi Pembayaran</h3>
            
            <div className="bg-gray-50 rounded-lg p-6 border border-gray-200 space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="text-gray-500">Siswa</div>
                <div className="font-medium text-gray-900 text-right">{selectedStudent?.full_name}</div>
                
                <div className="text-gray-500">Metode Bayar</div>
                <div className="font-medium text-gray-900 text-right">{paymentSource === 'savings' ? 'Potong Tabungan' : 'Uang Tunai (Kas)'}</div>

                <div className="text-gray-500">Item Dibayar</div>
                <div className="font-medium text-gray-900 text-right">{Object.values(payAmounts).filter(a => a > 0).length} Item</div>

                {paymentSource === 'cash' && changeAmount > 0 && depositChange && (
                  <>
                    <div className="text-gray-500">Masuk Tabungan</div>
                    <div className="font-medium text-green-600 text-right">+{formatCurrency(changeAmount)}</div>
                  </>
                )}
              </div>

              <div className="pt-4 border-t border-gray-200 flex justify-between items-center">
                <span className="font-bold text-gray-900">Total Transaksi</span>
                <span className="text-2xl font-bold text-indigo-600">{formatCurrency(totalPay)}</span>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium leading-6 text-gray-900 mb-1">Catatan Tambahan (Opsional)</label>
              <textarea
                rows={2}
                className="block w-full rounded-md border-0 py-1.5 px-3 text-gray-900 ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-indigo-600 sm:text-sm sm:leading-6"
                placeholder="Tambahkan catatan jika perlu..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>

            <div className="flex justify-between pt-4 border-t border-gray-200">
              <Button variant="secondary" onClick={() => setCurrentStep(3)} disabled={paymentMutation.isPending}>Kembali</Button>
              <Button variant="primary" onClick={handleSubmit} disabled={paymentMutation.isPending}>
                {paymentMutation.isPending ? 'Memproses...' : 'Proses & Cetak Struk'}
              </Button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
