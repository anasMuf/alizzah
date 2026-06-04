import { useState } from 'react';
import { createFileRoute, Link } from '@tanstack/react-router';
import { useAtom } from 'jotai';
import { ChevronRight, Printer } from 'lucide-react';
import { useGetReportsPosisiKas } from '../../../../api/endpoints/reports/posisi-kas';
import type { PosisiKasPost } from '../../../../api/endpoints/reports/posisi-kas';
import { academicYearAtom } from '../../../../store/global';
import { Button } from '../../../../components/atoms/Button';
import { Alert } from '../../../../components/atoms/Alert';

export const Route = createFileRoute(
  '/_authenticated/keuangan/laporan/posisi-kas',
)({
  component: LaporanPosisiKasPage,
});

const MONTH_NAMES = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
];

/**
 * Format angka dengan pemisah ribuan titik, angka negatif dalam kurung
 * contoh: 75597000 → "75.597.000", -3458000 → "(3.458.000)"
 */
function formatRupiah(amount: number): string {
  if (amount === 0) return '0';
  const isNegative = amount < 0;
  const abs = Math.abs(amount);
  const formatted = new Intl.NumberFormat('id-ID', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(abs);
  return isNegative ? `(${formatted})` : formatted;
}

function LaporanPosisiKasPage() {
  const [activeAy] = useAtom(academicYearAtom);
  const now = new Date();

  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [reportMonth, setReportMonth] = useState(0);
  const [reportYear, setReportYear] = useState(0);

  const shouldFetch = reportMonth > 0 && reportYear > 0 && !!activeAy?.id;

  const { data: reportData, isLoading, isError } = useGetReportsPosisiKas(
    {
      month: reportMonth,
      year: reportYear,
      academic_year_id: activeAy?.id,
    },
    { query: { enabled: shouldFetch } },
  );

  const report = shouldFetch ? (reportData?.data as any)?.data : null;
  const posts: PosisiKasPost[] = report?.posts || [];
  const grandTotal = report?.grand_total;

  const handleShow = () => {
    setReportMonth(selectedMonth);
    setReportYear(selectedYear);
  };

  const handleChangeFilter = () => {
    setReportMonth(0);
    setReportYear(0);
  };

  const currentYear = now.getFullYear();
  const yearOptions = Array.from({ length: 3 }, (_, i) => currentYear - i);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <nav className="flex items-center text-sm text-gray-500 mb-2">
            <Link to="/keuangan/laporan" className="hover:text-indigo-600 transition-colors">
              Laporan
            </Link>
            <ChevronRight className="w-4 h-4 mx-1" />
            <span className="text-gray-900 font-medium">Posisi Kas</span>
          </nav>
          <h2 className="text-2xl font-bold leading-7 text-gray-900 sm:truncate sm:tracking-tight">
            {report
              ? `Laporan Posisi Kas — ${MONTH_NAMES[reportMonth - 1]} ${reportYear}`
              : 'Laporan Posisi Kas'}
          </h2>
          {report && (
            <p className="mt-1 text-sm text-gray-500">TA {report.academic_year || activeAy?.name || '-'}</p>
          )}
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
        <h1 className="text-lg font-bold text-center">PAUD AL-IZZAH</h1>
        <p className="text-sm text-gray-600 text-center">Laporan Posisi Kas</p>
        <div className="mt-2 text-sm text-gray-700 space-y-0.5">
          <p>Periode: {reportMonth > 0 ? `${MONTH_NAMES[reportMonth - 1]} ${reportYear}` : '-'}</p>
          <p>TA: {report?.academic_year || activeAy?.name || '-'}</p>
        </div>
      </div>

      {/* Filter */}
      <div className="bg-white p-4 rounded-xl shadow-sm ring-1 ring-gray-900/5 print:hidden">
        <div className="flex flex-wrap gap-4 items-end">
          <div>
            <label className="block text-sm font-medium leading-6 text-gray-900 mb-1">Bulan</label>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(Number(e.target.value))}
              className="block w-full sm:w-40 rounded-md border-0 py-1.5 pl-3 pr-10 text-gray-900 ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-indigo-600 sm:text-sm sm:leading-6"
            >
              {MONTH_NAMES.map((name, idx) => (
                <option key={idx} value={idx + 1}>{name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium leading-6 text-gray-900 mb-1">Tahun</label>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="block w-full sm:w-28 rounded-md border-0 py-1.5 pl-3 pr-10 text-gray-900 ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-indigo-600 sm:text-sm sm:leading-6"
            >
              {yearOptions.map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium leading-6 text-gray-900 mb-1">TA</label>
            <input
              type="text"
              value={activeAy?.name || '-'}
              disabled
              className="block w-full sm:w-36 rounded-md border-0 py-1.5 px-3 text-gray-500 bg-gray-50 ring-1 ring-inset ring-gray-300 sm:text-sm sm:leading-6"
            />
          </div>
          {!report ? (
            <Button onClick={handleShow} disabled={!activeAy?.id}>
              Tampilkan Laporan
            </Button>
          ) : (
            <button
              type="button"
              onClick={handleChangeFilter}
              className="text-sm font-medium text-indigo-600 hover:text-indigo-500"
            >
              Ganti Filter
            </button>
          )}
        </div>
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="animate-pulse space-y-4">
          <div className="h-64 bg-gray-200 rounded-xl" />
        </div>
      )}

      {isError && (
        <Alert variant="error" title="Gagal Memuat">
          Terjadi kesalahan saat memuat laporan posisi kas.
        </Alert>
      )}

      {/* Report Table */}
      {report && !isLoading && (
        <div className="bg-white rounded-xl shadow-sm ring-1 ring-gray-900/5 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-300">
              <thead className="bg-gray-50">
                <tr>
                  <th className="py-3 pl-6 pr-3 text-left text-sm font-semibold text-gray-900 w-[280px]">
                    Nama Pos
                  </th>
                  <th className="px-3 py-3 text-right text-sm font-semibold text-gray-900">
                    Saldo Sebelum
                  </th>
                  <th className="px-3 py-3 text-right text-sm font-semibold text-gray-900">
                    Penerimaan
                  </th>
                  <th className="px-3 py-3 text-right text-sm font-semibold text-gray-900">
                    Pengeluaran
                  </th>
                  <th className="px-3 py-3 text-right text-sm font-semibold text-gray-900">
                    Saldo
                  </th>
                  <th className="px-3 py-3 text-right text-sm font-semibold text-gray-900 pr-6">
                    Saldo Sampai
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {posts.length > 0 ? (
                  <>
                    {posts.map((post) => (
                      <PostRows key={post.category} post={post} />
                    ))}

                    {/* Grand Total */}
                    {grandTotal && (
                      <tr className="bg-gray-50 border-t-2 border-gray-400 font-bold">
                        <td className="py-3 pl-6 pr-3 text-sm text-gray-900">
                          Grand Total
                        </td>
                        <td className="px-3 py-3 text-sm text-right tabular-nums text-gray-900">
                          {formatRupiah(grandTotal.saldo_sebelum)}
                        </td>
                        <td className="px-3 py-3 text-sm text-right tabular-nums text-gray-900">
                          {formatRupiah(grandTotal.penerimaan)}
                        </td>
                        <td className="px-3 py-3 text-sm text-right tabular-nums text-gray-900">
                          {formatRupiah(grandTotal.pengeluaran)}
                        </td>
                        <td className={`px-3 py-3 text-sm text-right tabular-nums ${grandTotal.saldo_bulan < 0 ? 'text-red-600' : 'text-gray-900'}`}>
                          {formatRupiah(grandTotal.saldo_bulan)}
                        </td>
                        <td className={`px-3 py-3 text-sm text-right tabular-nums pr-6 ${grandTotal.saldo_sampai < 0 ? 'text-red-600' : 'text-gray-900'}`}>
                          {formatRupiah(grandTotal.saldo_sampai)}
                        </td>
                      </tr>
                    )}
                  </>
                ) : (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-sm text-gray-500">
                      Belum ada data untuk periode ini.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {shouldFetch && !isLoading && !isError && !report && (
        <div className="bg-white rounded-xl shadow-sm ring-1 ring-gray-900/5 p-12 text-center">
          <p className="text-sm text-gray-500">Belum ada data untuk bulan ini.</p>
        </div>
      )}
    </div>
  );
}

/** Renders a post row (bold) + expense detail sub-rows (indented) */
function PostRows({ post }: { post: PosisiKasPost }) {
  const details = post.expense_details || [];

  return (
    <>
      {/* Parent post row */}
      <tr className="bg-white hover:bg-gray-50">
        <td className="py-2.5 pl-6 pr-3 text-sm font-semibold text-gray-900">
          {post.name}
        </td>
        <td className={`px-3 py-2.5 text-sm text-right tabular-nums ${post.saldo_sebelum < 0 ? 'text-red-600' : 'text-gray-900'}`}>
          {formatRupiah(post.saldo_sebelum)}
        </td>
        <td className="px-3 py-2.5 text-sm text-right tabular-nums text-gray-900">
          {formatRupiah(post.penerimaan)}
        </td>
        <td className="px-3 py-2.5 text-sm text-right tabular-nums text-gray-900">
          {formatRupiah(post.pengeluaran)}
        </td>
        <td className={`px-3 py-2.5 text-sm text-right tabular-nums ${post.saldo_bulan < 0 ? 'text-red-600' : 'text-gray-900'}`}>
          {formatRupiah(post.saldo_bulan)}
        </td>
        <td className={`px-3 py-2.5 text-sm text-right tabular-nums pr-6 ${post.saldo_sampai < 0 ? 'text-red-600' : 'text-gray-900'}`}>
          {formatRupiah(post.saldo_sampai)}
        </td>
      </tr>

      {/* Child expense detail rows */}
      {details.length > 0 ? (
        details.map((detail, i) => (
          <tr key={`${post.category}-${i}`} className="bg-white">
            <td className="py-1.5 pl-10 pr-3 text-sm text-gray-500">
              <span className="text-gray-400 mr-1">&middot;</span>
              {detail.name}
            </td>
            <td className="px-3 py-1.5 text-sm text-right tabular-nums text-gray-400" />
            <td className="px-3 py-1.5 text-sm text-right tabular-nums text-gray-400" />
            <td className="px-3 py-1.5 text-sm text-right tabular-nums text-gray-500">
              {formatRupiah(detail.amount)}
            </td>
            <td className="px-3 py-1.5 text-sm text-right tabular-nums text-gray-400" />
            <td className="px-3 py-1.5 text-sm text-right tabular-nums text-gray-400 pr-6" />
          </tr>
        ))
      ) : (
        <tr className="bg-white">
          <td className="py-1.5 pl-10 pr-3 text-sm text-gray-400 italic">
            <span className="text-gray-300 mr-1">&middot;</span>
            (belum ada pengeluaran)
          </td>
          <td colSpan={5} />
        </tr>
      )}
    </>
  );
}
