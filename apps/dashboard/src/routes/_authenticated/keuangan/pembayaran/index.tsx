import { useState } from 'react';
import { createFileRoute, Link } from '@tanstack/react-router';
import { useAtom } from 'jotai';
import { ChevronRight, Filter, Receipt, Plus } from 'lucide-react';
import { useGetV1Payments } from '../../../../api/endpoints/payments/payments';
import { academicYearAtom } from '../../../../store/global';
import { Badge } from '../../../../components/atoms/Badge';
import { formatCurrency, formatDate } from '../../../../utils/format';
import { Button } from '../../../../components/atoms/Button';

export const Route = createFileRoute('/_authenticated/keuangan/pembayaran/')({
  component: PembayaranListPage,
});

function PembayaranListPage() {
  const [activeAy] = useAtom(academicYearAtom);

  // Filters
  const [selectedSource, setSelectedSource] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [page, setPage] = useState(1);

  // Fetch data
  const { data: paymentsData, isLoading } = useGetV1Payments(
    {
      page,
      limit: 20,
      academic_year_id: activeAy?.id,
      ...(selectedSource ? { source: selectedSource } : {}),
      ...(startDate ? { start_date: startDate } : {}),
      ...(endDate ? { end_date: endDate } : {}),
    },
    { query: { enabled: !!activeAy?.id } }
  );

  const payments = (paymentsData?.data as any)?.data || [];
  const meta = (paymentsData?.data as any)?.meta;

  const handleReset = () => {
    setSelectedSource('');
    setStartDate('');
    setEndDate('');
    setPage(1);
  };

  const getSourceBadge = (source: string) => {
    if (source === 'savings') return <Badge variant="info">Tabungan Umum</Badge>;
    return <Badge variant="secondary">Uang Tunai (Kas)</Badge>;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="sm:flex sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold leading-7 text-gray-900 sm:truncate sm:tracking-tight flex items-center">
            <Receipt className="w-6 h-6 mr-2 text-gray-400" /> Riwayat Pembayaran
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            Daftar seluruh transaksi pembayaran yang diterima dari siswa.
          </p>
        </div>
        <div className="mt-4 sm:ml-4 sm:mt-0 flex gap-2">
          <Link to="/keuangan/pembayaran/baru">
            <Button variant="primary">
              <Plus className="-ml-0.5 mr-1.5 h-5 w-5" aria-hidden="true" />
              Catat Pembayaran Baru
            </Button>
          </Link>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-xl shadow-sm ring-1 ring-gray-900/5 space-y-4">
        <div className="flex flex-wrap gap-4 items-end">
          <div className="w-full sm:w-auto">
            <label className="block text-sm font-medium leading-6 text-gray-900 mb-1">Sumber Dana</label>
            <select
              value={selectedSource}
              onChange={(e) => setSelectedSource(e.target.value)}
              className="block w-full rounded-md border-0 py-1.5 pl-3 pr-10 text-gray-900 ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-indigo-600 sm:text-sm sm:leading-6"
            >
              <option value="">Semua Sumber</option>
              <option value="cash">Uang Tunai (Kas)</option>
              <option value="savings">Tabungan Umum</option>
            </select>
          </div>

          <div className="w-full sm:w-auto">
            <label className="block text-sm font-medium leading-6 text-gray-900 mb-1">Dari Tanggal</label>
            <input
              type="date"
              className="block w-full rounded-md border-0 py-1.5 px-3 text-gray-900 ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-indigo-600 sm:text-sm sm:leading-6"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>

          <div className="w-full sm:w-auto">
            <label className="block text-sm font-medium leading-6 text-gray-900 mb-1">Sampai Tanggal</label>
            <input
              type="date"
              className="block w-full rounded-md border-0 py-1.5 px-3 text-gray-900 ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-indigo-600 sm:text-sm sm:leading-6"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>

          <div className="w-full sm:w-auto">
            <Button variant="secondary" onClick={handleReset}>
              <Filter className="w-4 h-4 mr-2" />
              Reset
            </Button>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm ring-1 ring-gray-900/5 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-300">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-6">
                  Waktu & ID
                </th>
                <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                  Siswa
                </th>
                <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                  Sumber Dana
                </th>
                <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                  Total Bayar
                </th>
                <th scope="col" className="relative py-3.5 pl-3 pr-4 sm:pr-6">
                  <span className="sr-only">Aksi</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="px-3 py-8 text-center text-sm text-gray-500">
                    Memuat data pembayaran...
                  </td>
                </tr>
              ) : payments.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-3 py-12 text-center text-sm text-gray-500">
                    Tidak ada transaksi pembayaran yang sesuai dengan filter.
                  </td>
                </tr>
              ) : (
                payments.map((payment: any) => {
                  return (
                    <tr key={payment.id} className="hover:bg-gray-50 group">
                      <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm text-gray-900 sm:pl-6">
                        <div className="font-medium text-gray-900">{formatDate(payment.created_at)}</div>
                        <div className="text-xs text-gray-500 font-mono mt-1">#{payment.id}</div>
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-900">
                        <span className="font-semibold">{payment.student?.full_name}</span>
                        <div className="text-xs text-gray-500 mt-1">
                          {payment.student?.active_enrollment?.class_group?.name || 'Tanpa Rombel'}
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                        {getSourceBadge(payment.source)}
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm font-bold text-gray-900">
                        {formatCurrency(Number(payment.total_amount))}
                      </td>
                      <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6">
                        <Link
                          to="/keuangan/pembayaran/$id" params={{ id: payment.id.toString() }}
                          className="inline-flex items-center text-indigo-600 hover:text-indigo-900 bg-indigo-50 px-2 py-1 rounded-md opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          Detail Struk <ChevronRight className="w-4 h-4 ml-1" />
                        </Link>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination placeholder if needed */}
        {meta && meta.total_pages > 1 && (
          <div className="border-t border-gray-200 px-4 py-3 flex items-center justify-between sm:px-6">
            <div className="flex flex-1 justify-between sm:hidden">
              <Button variant="secondary" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>Previous</Button>
              <Button variant="secondary" onClick={() => setPage(p => p + 1)} disabled={page >= meta.total_pages}>Next</Button>
            </div>
            <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-gray-700">
                  Menampilkan <span className="font-medium">{(page - 1) * 20 + 1}</span> sampai <span className="font-medium">{Math.min(page * 20, meta.total_items)}</span> dari <span className="font-medium">{meta.total_items}</span> pembayaran
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
    </div>
  );
}
