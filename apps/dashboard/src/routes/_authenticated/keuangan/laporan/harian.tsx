import { useState } from 'react';
import { createFileRoute, Link } from '@tanstack/react-router';
import { useAtom } from 'jotai';
import {
  ChevronRight,
  Printer,
  ArrowUpRight,
  CheckCircle2,
  AlertTriangle,
  Lock,
  Clock,
} from 'lucide-react';
import { useGetV1ReportsDaily } from '../../../../api/endpoints/reports/reports';
import { academicYearAtom } from '../../../../store/global';
import { formatCurrency, formatDate } from '../../../../utils/format';
import { Button } from '../../../../components/atoms/Button';
import { Badge } from '../../../../components/atoms/Badge';
import { Alert } from '../../../../components/atoms/Alert';

export const Route = createFileRoute(
  '/_authenticated/keuangan/laporan/harian',
)({
  component: LaporanHarianPage,
});

function getTodayString() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

function LaporanHarianPage() {
  const [activeAy] = useAtom(academicYearAtom);
  const [date, setDate] = useState(getTodayString());

  const { data: reportData, isLoading, isError } = useGetV1ReportsDaily(
    {
      date,
      academic_year_id: activeAy?.id,
    },
    { query: { enabled: !!date && !!activeAy?.id } },
  );

  const report = (reportData?.data as any)?.data || null;

  const income = report?.income_summary;
  const expense = report?.expense_summary;
  const cash = report?.cash;
  const vault = report?.vault;
  const closing = report?.daily_closing;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between print:hidden">
        <div>
          <nav className="flex items-center text-sm text-gray-500 mb-2">
            <Link
              to="/keuangan/laporan"
              className="hover:text-indigo-600 transition-colors"
            >
              Laporan
            </Link>
            <ChevronRight className="w-4 h-4 mx-1" />
            <span className="text-gray-900 font-medium">Laporan Harian</span>
          </nav>
          <h2 className="text-2xl font-bold leading-7 text-gray-900 sm:truncate sm:tracking-tight">
            Laporan Harian
          </h2>
          <p className="mt-1 text-sm text-gray-500">TA {activeAy?.name || '-'}</p>
        </div>
        {report && (
          <Button variant="secondary" onClick={() => window.print()} className="print:hidden">
            <Printer className="w-4 h-4 mr-2" />
            Cetak
          </Button>
        )}
      </div>

      {/* Print Header */}
      <div className="hidden print:block border-b border-gray-300 pb-4 mb-6">
        <h1 className="text-lg font-bold">ALIZZAH MANAJEMEN</h1>
        <p className="text-sm text-gray-600">Laporan Keuangan</p>
        <div className="mt-2 text-sm text-gray-700 space-y-0.5">
          <p>Jenis: Laporan Harian</p>
          <p>Periode: {date ? formatDate(date) : '-'}</p>
          <p>TA: {activeAy?.name || '-'}</p>
        </div>
      </div>

      {/* Filter — always visible */}
      <div className="bg-white p-4 rounded-xl shadow-sm ring-1 ring-gray-900/5 print:hidden">
        <div className="flex flex-wrap gap-4 items-end">
          <div>
            <label className="block text-sm font-medium leading-6 text-gray-900 mb-1">Tanggal</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="block w-full sm:w-48 rounded-md border-0 py-1.5 px-3 text-gray-900 ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-indigo-600 sm:text-sm sm:leading-6"
            />
          </div>
          {date !== getTodayString() && (
            <button type="button" onClick={() => setDate(getTodayString())} className="text-sm font-medium text-indigo-600 hover:text-indigo-500">
              Reset ke Hari Ini
            </button>
          )}
        </div>
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="animate-pulse space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="h-40 bg-gray-200 rounded-xl" />
            <div className="h-40 bg-gray-200 rounded-xl" />
          </div>
          <div className="h-32 bg-gray-200 rounded-xl" />
          <div className="h-48 bg-gray-200 rounded-xl" />
        </div>
      )}

      {/* Error */}
      {isError && (
        <Alert variant="error" title="Gagal Memuat">
          Terjadi kesalahan saat memuat laporan. Silakan coba lagi.
        </Alert>
      )}

      {/* Report Content */}
      {report && !isLoading && (
        <>
          {/* Income & Expense side-by-side */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Income */}
            <div className="bg-white rounded-xl shadow-sm ring-1 ring-gray-900/5 p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Pemasukan
                </h3>
                <span className="text-lg font-bold text-green-600">
                  {formatCurrency(Number(income?.total || 0))}
                </span>
              </div>
              {income?.by_category && income.by_category.length > 0 ? (
                <div className="space-y-2">
                  <p className="text-xs text-gray-500 font-medium">
                    Per Kategori:
                  </p>
                  {income.by_category.map((cat: any, i: number) => (
                    <div
                      key={i}
                      className="flex justify-between text-sm"
                    >
                      <span className="text-gray-600">
                        {cat.sub_category
                          ? `${cat.category} > ${cat.sub_category}`
                          : cat.category}
                      </span>
                      <span className="font-medium text-gray-900 tabular-nums">
                        {formatCurrency(Number(cat.amount || 0))}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-400">
                  Tidak ada pemasukan pada tanggal ini.
                </p>
              )}
            </div>

            {/* Expense */}
            <div className="bg-white rounded-xl shadow-sm ring-1 ring-gray-900/5 p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Pengeluaran
                </h3>
                <span className="text-lg font-bold text-red-600">
                  {formatCurrency(Number(expense?.total || 0))}
                </span>
              </div>
              {expense?.by_category && expense.by_category.length > 0 ? (
                <div className="space-y-2">
                  <p className="text-xs text-gray-500 font-medium">
                    Per Kategori:
                  </p>
                  {expense.by_category.map((cat: any, i: number) => (
                    <div
                      key={i}
                      className="flex justify-between text-sm"
                    >
                      <span className="text-gray-600">
                        {cat.sub_category
                          ? `${cat.category} > ${cat.sub_category}`
                          : cat.category}
                      </span>
                      <span className="font-medium text-gray-900 tabular-nums">
                        {formatCurrency(Number(cat.amount || 0))}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-400">
                  Tidak ada pengeluaran pada tanggal ini.
                </p>
              )}
            </div>
          </div>

          {/* Cash Summary */}
          <div className="bg-white rounded-xl shadow-sm ring-1 ring-gray-900/5 p-6">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4">
              Ringkasan Kas
            </h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center py-2">
                <span className="text-sm text-gray-600">
                  Saldo Awal (kemarin)
                </span>
                <span className="text-sm font-semibold text-gray-900 tabular-nums">
                  {formatCurrency(Number(cash?.opening_balance || 0))}
                </span>
              </div>
              <div className="flex justify-between items-center py-2">
                <span className="text-sm text-green-600">
                  + Total Pemasukan
                </span>
                <span className="text-sm font-semibold text-green-600 tabular-nums">
                  {formatCurrency(Number(cash?.total_credit || 0))}
                </span>
              </div>
              <div className="flex justify-between items-center py-2">
                <span className="text-sm text-red-600">
                  - Total Pengeluaran
                </span>
                <span className="text-sm font-semibold text-red-600 tabular-nums">
                  {formatCurrency(Number(cash?.total_debit || 0))}
                </span>
              </div>
              <div className="border-t border-gray-200 pt-3 flex justify-between items-center">
                <span className="text-sm font-semibold text-gray-900">
                  = Saldo Kas Akhir
                </span>
                <span className="text-base font-bold text-gray-900 tabular-nums">
                  {formatCurrency(Number(cash?.closing_balance || 0))}
                </span>
              </div>
              <div className="flex justify-between items-center py-2">
                <span className="text-sm text-gray-600">Saldo Berangkas</span>
                <span className="text-sm font-semibold text-gray-900 tabular-nums">
                  {formatCurrency(Number(vault?.balance || 0))}
                </span>
              </div>
            </div>
          </div>

          {/* Daily Closing */}
          <div className="bg-white rounded-xl shadow-sm ring-1 ring-gray-900/5 p-6">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4">
              Tutup Buku Harian
            </h3>
            {closing ? (
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  {closing.is_confirmed ? (
                    <>
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-green-100">
                        <Lock className="w-4 h-4 text-green-600" />
                      </div>
                      <Badge variant="success">Dikonfirmasi</Badge>
                    </>
                  ) : (
                    <>
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-100">
                        <Clock className="w-4 h-4 text-amber-600" />
                      </div>
                      <Badge variant="warning">Menunggu Konfirmasi</Badge>
                    </>
                  )}
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div>
                    <p className="text-xs text-gray-500">Kas Fisik</p>
                    <p className="text-sm font-bold text-gray-900 tabular-nums">
                      {formatCurrency(
                        Number(closing.physical_cash_amount || 0),
                      )}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Kas Sistem</p>
                    <p className="text-sm font-bold text-gray-900 tabular-nums">
                      {formatCurrency(
                        Number(closing.system_cash_amount || 0),
                      )}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Selisih</p>
                    <p
                      className={`text-sm font-bold tabular-nums ${Number(closing.difference || 0) === 0 ? 'text-green-600' : 'text-amber-600'}`}
                    >
                      <span className="inline-flex items-center gap-1">
                        {Number(closing.difference || 0) === 0 ? (
                          <CheckCircle2 className="h-3.5 w-3.5" />
                        ) : (
                          <AlertTriangle className="h-3.5 w-3.5" />
                        )}
                        {formatCurrency(Number(closing.difference || 0))}
                      </span>
                    </p>
                  </div>
                  {closing.notes && (
                    <div className="col-span-2 sm:col-span-1">
                      <p className="text-xs text-gray-500">Catatan</p>
                      <p className="text-sm text-gray-700">{closing.notes}</p>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-amber-800">
                      Tutup buku belum dilakukan untuk tanggal ini.
                    </p>
                    <Link
                      to="/keuangan/kas/tutup-buku"
                      className="mt-1 inline-flex items-center text-sm font-medium text-indigo-600 hover:text-indigo-500 print:hidden"
                    >
                      Ke Tutup Buku
                      <ArrowUpRight className="ml-1 h-3.5 w-3.5" />
                    </Link>
                  </div>
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {/* Empty state — report fetched but no data */}
      {!!date && !isLoading && !isError && !report && (
        <div className="bg-white rounded-xl shadow-sm ring-1 ring-gray-900/5 p-12 text-center">
          <p className="text-sm text-gray-500">
            Belum ada transaksi pada tanggal ini.
          </p>
        </div>
      )}
    </div>
  );
}
