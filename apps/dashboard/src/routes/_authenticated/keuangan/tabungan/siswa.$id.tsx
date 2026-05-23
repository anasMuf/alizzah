import { useState } from 'react';
import { createFileRoute, Link } from '@tanstack/react-router';
import { useQueryClient } from '@tanstack/react-query';
import { ChevronRight, ArrowUpCircle, ArrowDownCircle, Banknote } from 'lucide-react';
import { 
  useGetV1StudentsIdSavings, 
  useGetV1StudentsIdSavingsTransactions, 
  usePostV1StudentsIdSavingsWithdrawals 
} from '../../../../api/endpoints/savings/savings';
import { useGetV1StudentsId } from '../../../../api/endpoints/students/students';
import { Button } from '../../../../components/atoms/Button';
import { formatCurrency, formatDate } from '../../../../utils/format';
import { useToast } from '../../../../components/molecules/Toast';
import { SlideOver } from '../../../../components/molecules/SlideOver';
import { FormField } from '../../../../components/molecules/FormField';

export const Route = createFileRoute('/_authenticated/keuangan/tabungan/siswa/$id')({
  component: DetailTabunganSiswaPage,
});

function DetailTabunganSiswaPage() {
  const { id } = Route.useParams();
  const queryClient = useQueryClient();
  const { addToast } = useToast();

  const { data: studentResp, isLoading: isStudentLoading } = useGetV1StudentsId(Number(id));
  const student = (studentResp?.data as any)?.data;

  const { data: savingsResp, isLoading: isSavingsLoading } = useGetV1StudentsIdSavings(Number(id), {
    query: { enabled: !!id }
  });
  const savings = (savingsResp?.data as any)?.data;

  const [page, setPage] = useState(1);
  const { data: transactionsResp, isLoading: isTransactionsLoading } = useGetV1StudentsIdSavingsTransactions(
    Number(id), 
    { page, limit: 10 },
    { query: { enabled: !!id } }
  );
  const transactions = (transactionsResp?.data as any)?.data || [];
  const meta = (transactionsResp?.data as any)?.meta;

  const [isWithdrawOpen, setIsWithdrawOpen] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [withdrawNotes, setWithdrawNotes] = useState('');

  const withdrawMutation = usePostV1StudentsIdSavingsWithdrawals({
    mutation: {
      onSuccess: () => {
        addToast({ variant: 'success', title: 'Berhasil', message: 'Penarikan tabungan berhasil dicatat.' });
        queryClient.invalidateQueries({ queryKey: ['/v1/students', Number(id), 'savings'] });
        setIsWithdrawOpen(false);
        setWithdrawAmount('');
        setWithdrawNotes('');
      },
      onError: (err: any) => {
        addToast({ variant: 'error', title: 'Gagal', message: err.message || 'Gagal memproses penarikan.' });
      }
    }
  });

  const handleWithdraw = (e: React.FormEvent) => {
    e.preventDefault();
    if (Number(withdrawAmount) > (savings?.general_balance || 0)) {
      addToast({ variant: 'error', title: 'Validasi Gagal', message: 'Nominal penarikan tidak boleh melebihi saldo Tabungan Umum.' });
      return;
    }

    withdrawMutation.mutate({
      id: Number(id),
      data: {
        amount: Number(withdrawAmount),
        notes: withdrawNotes
      }
    });
  };

  if (isStudentLoading || isSavingsLoading) return <div className="p-8 text-center text-gray-500">Memuat data tabungan...</div>;
  if (!student) return <div className="p-8 text-center text-red-500">Siswa tidak ditemukan.</div>;

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Breadcrumb */}
      <nav className="flex" aria-label="Breadcrumb">
        <ol role="list" className="flex items-center space-x-2 text-sm text-gray-500">
          <li><Link to="/keuangan/tabungan" className="hover:text-gray-900">Tabungan</Link></li>
          <li><ChevronRight className="h-4 w-4" /></li>
          <li className="font-medium text-gray-900">{student.full_name}</li>
        </ol>
      </nav>

      <div className="border-b border-gray-200 pb-5">
        <h2 className="text-2xl font-bold leading-7 text-gray-900 sm:truncate sm:tracking-tight flex items-center">
          Detail Tabungan: {student.full_name}
        </h2>
        <p className="mt-1 text-sm text-gray-500">
          {student.nisn ? `NISN: ${student.nisn}` : 'Belum ada NISN'} &bull; {student.active_enrollment?.class_group?.name || 'Tanpa Rombel'}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Tabungan Umum */}
        <div className="overflow-hidden rounded-lg bg-white shadow ring-1 ring-gray-900/5">
          <div className="p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Banknote className="h-8 w-8 text-indigo-500" aria-hidden="true" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Saldo Tabungan Umum</dt>
                  <dd>
                    <div className="text-2xl font-bold text-gray-900">{formatCurrency(savings?.general_balance || 0)}</div>
                  </dd>
                </dl>
              </div>
            </div>
            <div className="mt-6">
              <Button 
                variant="primary" 
                className="w-full justify-center" 
                onClick={() => setIsWithdrawOpen(true)}
                disabled={Number(savings?.general_balance) <= 0}
              >
                Tarik Saldo
              </Button>
            </div>
          </div>
        </div>

        {/* Tabungan Wajib */}
        <div className="overflow-hidden rounded-lg bg-white shadow ring-1 ring-gray-900/5 bg-slate-50">
          <div className="p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Banknote className="h-8 w-8 text-amber-500" aria-hidden="true" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Saldo Tabungan Wajib (Berlian)</dt>
                  <dd>
                    <div className="text-2xl font-bold text-gray-900">{formatCurrency(savings?.mandatory_balance || 0)}</div>
                  </dd>
                </dl>
              </div>
            </div>
            <div className="mt-6 flex items-center justify-center text-sm text-gray-500 h-[38px]">
              (Estimasi Pencairan Otomatis Saat Lulus)
            </div>
          </div>
        </div>
      </div>

      {/* Riwayat Transaksi */}
      <div className="bg-white rounded-xl shadow-sm ring-1 ring-gray-900/5 overflow-hidden mt-8">
        <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
          <h3 className="text-base font-semibold leading-6 text-gray-900">Riwayat Mutasi Tabungan</h3>
        </div>
        
        {isTransactionsLoading ? (
          <div className="p-8 text-center text-gray-500">Memuat riwayat transaksi...</div>
        ) : transactions.length === 0 ? (
          <div className="p-8 text-center text-gray-500">Belum ada riwayat mutasi tabungan.</div>
        ) : (
          <ul role="list" className="divide-y divide-gray-100">
            {transactions.map((trx: any) => (
              <li key={trx.id} className="relative flex justify-between gap-x-6 px-4 py-5 sm:px-6 hover:bg-gray-50">
                <div className="flex gap-x-4 items-center">
                  {trx.type === 'deposit' ? (
                    <ArrowDownCircle className="h-8 w-8 flex-none text-green-500 bg-green-50 rounded-full" />
                  ) : (
                    <ArrowUpCircle className="h-8 w-8 flex-none text-rose-500 bg-rose-50 rounded-full" />
                  )}
                  <div className="min-w-0 flex-auto">
                    <p className="text-sm font-semibold leading-6 text-gray-900">
                      {trx.type === 'deposit' ? 'Setoran Masuk' : 'Penarikan Keluar'}
                    </p>
                    <p className="mt-1 flex text-xs leading-5 text-gray-500">
                      {formatDate(trx.created_at)} &bull; {trx.notes || (trx.payment_id ? `Dari Pembayaran #${trx.payment_id}` : 'Tanpa Keterangan')}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-x-4">
                  <div className={`text-sm font-bold leading-6 ${trx.type === 'deposit' ? 'text-green-600' : 'text-rose-600'}`}>
                    {trx.type === 'deposit' ? '+' : '-'}{formatCurrency(Number(trx.amount))}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}

        {meta && meta.total_pages > 1 && (
          <div className="border-t border-gray-200 px-4 py-3 flex items-center justify-between sm:px-6">
            <div className="flex flex-1 justify-between sm:hidden">
              <Button variant="secondary" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>Previous</Button>
              <Button variant="secondary" onClick={() => setPage(p => p + 1)} disabled={page >= meta.total_pages}>Next</Button>
            </div>
            <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-gray-700">
                  Menampilkan <span className="font-medium">{(page - 1) * 10 + 1}</span> sampai <span className="font-medium">{Math.min(page * 10, meta.total_items)}</span> dari <span className="font-medium">{meta.total_items}</span> riwayat
                </p>
              </div>
              <div>
                <nav className="isolate inline-flex -space-x-px rounded-md shadow-sm" aria-label="Pagination">
                  <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="relative inline-flex items-center rounded-l-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50">
                    <span className="sr-only">Previous</span>
                    <ChevronRight className="h-5 w-5 rotate-180" aria-hidden="true" />
                  </button>
                  <span className="relative inline-flex items-center px-4 py-2 text-sm font-semibold text-gray-900 ring-1 ring-inset ring-gray-300">
                    {page}
                  </span>
                  <button onClick={() => setPage(p => p + 1)} disabled={page >= meta.total_pages} className="relative inline-flex items-center rounded-r-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50">
                    <span className="sr-only">Next</span>
                    <ChevronRight className="h-5 w-5" aria-hidden="true" />
                  </button>
                </nav>
              </div>
            </div>
          </div>
        )}
      </div>

      <SlideOver
        isOpen={isWithdrawOpen}
        onClose={() => setIsWithdrawOpen(false)}
        title="Tarik Saldo Tabungan"
      >
        <form onSubmit={handleWithdraw} className="flex h-full flex-col bg-white">
          <div className="flex-1 overflow-y-auto px-4 py-6 sm:px-6 space-y-6">
            <div className="bg-indigo-50 p-4 rounded-lg flex justify-between items-center">
              <div>
                <p className="text-sm font-medium text-indigo-900">Saldo Tersedia</p>
                <p className="text-2xl font-bold text-indigo-700">{formatCurrency(savings?.general_balance || 0)}</p>
              </div>
            </div>
            
            <FormField
              id="withdrawAmount"
              type="number"
              label="Nominal Penarikan (Rp)"
              value={withdrawAmount}
              onChange={(e: any) => setWithdrawAmount(e.target.value)}
              required
              min="1"
              max={savings?.general_balance || 0}
            />
            
            <FormField
              id="withdrawNotes"
              label="Keterangan (Opsional)"
              value={withdrawNotes}
              onChange={(e: any) => setWithdrawNotes(e.target.value)}
              placeholder="Contoh: Diambil oleh Ibunda siswa"
            />

            <div className="text-sm text-gray-500 bg-gray-50 p-3 rounded border border-gray-200">
              <p>Penarikan ini hanya memotong <strong>Tabungan Umum</strong>. Tabungan Wajib (Berlian) tidak dapat ditarik secara manual di halaman ini.</p>
            </div>
          </div>
          <div className="flex-shrink-0 border-t border-gray-200 px-4 py-5 sm:px-6 flex justify-end gap-3">
            <Button type="button" variant="secondary" onClick={() => setIsWithdrawOpen(false)}>Batal</Button>
            <Button type="submit" variant="primary" disabled={withdrawMutation.isPending || !withdrawAmount || Number(withdrawAmount) > (savings?.general_balance || 0)}>
              Proses Penarikan
            </Button>
          </div>
        </form>
      </SlideOver>
    </div>
  );
}
