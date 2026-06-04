import { useState } from 'react';
import { createFileRoute, Link } from '@tanstack/react-router';
import { useDebounce } from 'use-debounce';
import { ChevronRight, Printer, Search, User } from 'lucide-react';
import { useGetV1Students } from '../../../../api/endpoints/students/students';
import {
  useGetReportsTabunganSiswa,
  type TabunganSiswaRow,
} from '../../../../api/endpoints/reports/tabungan';
import { Button } from '../../../../components/atoms/Button';
import { Alert } from '../../../../components/atoms/Alert';

export const Route = createFileRoute(
  '/_authenticated/keuangan/laporan/tabungan-siswa',
)({
  component: LaporanTabunganSiswaPage,
});

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

function formatDateID(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function formatPeriodID(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
}

function LaporanTabunganSiswaPage() {
  // Student search
  const [searchStudent, setSearchStudent] = useState('');
  const [debouncedSearch] = useDebounce(searchStudent, 500);
  const [selectedStudent, setSelectedStudent] = useState<any>(null);

  // Period filter
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Fetch students
  const { data: studentsResp, isLoading: studentsLoading } = useGetV1Students(
    { page: 1, limit: 10, search: debouncedSearch },
    { query: { enabled: debouncedSearch.length > 1 && !selectedStudent } },
  );
  const students = (studentsResp?.data as any)?.data || [];

  // Fetch report
  const shouldFetch = !!selectedStudent;
  const { data: reportResp, isLoading: reportLoading, isError } = useGetReportsTabunganSiswa(
    selectedStudent?.id || 0,
    {
      ...(startDate ? { start_date: startDate } : {}),
      ...(endDate ? { end_date: endDate } : {}),
    },
    { query: { enabled: shouldFetch } },
  );
  const report = shouldFetch ? ((reportResp as any)?.data as any)?.data : null;
  const rows: TabunganSiswaRow[] = report?.rows || [];

  const handleSelectStudent = (student: any) => {
    setSelectedStudent(student);
    setSearchStudent('');
  };

  const handleClearStudent = () => {
    setSelectedStudent(null);
    setSearchStudent('');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between print:hidden">
        <div>
          <nav className="flex items-center text-sm text-gray-500 mb-2">
            <Link to="/keuangan/laporan" className="hover:text-indigo-600 transition-colors">
              Laporan
            </Link>
            <ChevronRight className="w-4 h-4 mx-1" />
            <Link to="/keuangan/laporan/tabungan" className="hover:text-indigo-600 transition-colors">
              Tabungan
            </Link>
            <ChevronRight className="w-4 h-4 mx-1" />
            <span className="text-gray-900 font-medium">Per Siswa</span>
          </nav>
          <h2 className="text-2xl font-bold leading-7 text-gray-900 sm:truncate sm:tracking-tight">
            Laporan Tabungan Umum Per Siswa
          </h2>
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
        <p className="text-sm text-gray-600 text-center">Laporan Tabungan Umum Per Siswa</p>
        {report && (
          <div className="mt-2 text-sm text-gray-700 space-y-0.5">
            <p>Nama: {report.student.full_name}</p>
            <p>Rombel: {report.student.class_group || '-'}</p>
            <p>Periode: {formatPeriodID(report.period.start_date)} — {formatPeriodID(report.period.end_date)}</p>
          </div>
        )}
      </div>

      {/* Search & Filter */}
      <div className="bg-white p-4 rounded-xl shadow-sm ring-1 ring-gray-900/5 print:hidden">
        <div className="flex flex-wrap gap-4 items-end">
          {/* Student search */}
          <div className="flex-1 min-w-[250px]">
            <label className="block text-sm font-medium leading-6 text-gray-900 mb-1">Siswa</label>
            {selectedStudent ? (
              <div className="flex items-center gap-2 p-2 border border-indigo-300 bg-indigo-50 rounded-md">
                <User className="w-4 h-4 text-indigo-600" />
                <span className="text-sm font-medium text-gray-900 flex-1">
                  {selectedStudent.full_name}
                  <span className="text-gray-500 ml-1">
                    — {selectedStudent.active_enrollment?.class_group?.name || 'Tanpa Rombel'}
                  </span>
                </span>
                <button
                  type="button"
                  onClick={handleClearStudent}
                  className="text-xs text-indigo-600 hover:text-indigo-800 font-medium"
                >
                  Ganti
                </button>
              </div>
            ) : (
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                  <Search className="h-4 w-4 text-gray-400" />
                </div>
                <input
                  type="text"
                  className="block w-full rounded-md border-0 py-1.5 pl-9 text-gray-900 ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-indigo-600 sm:text-sm sm:leading-6"
                  placeholder="Cari nama siswa (min 2 karakter)..."
                  value={searchStudent}
                  onChange={(e) => setSearchStudent(e.target.value)}
                />
                {studentsLoading && <p className="text-xs text-gray-500 mt-1">Mencari...</p>}
                {!studentsLoading && students.length > 0 && debouncedSearch.length > 1 && (
                  <ul className="absolute z-10 mt-1 w-full bg-white border border-gray-200 rounded-md shadow-lg max-h-48 overflow-y-auto">
                    {students.map((s: any) => (
                      <li
                        key={s.id}
                        className="px-3 py-2 hover:bg-indigo-50 cursor-pointer text-sm"
                        onClick={() => handleSelectStudent(s)}
                      >
                        <span className="font-medium">{s.full_name}</span>
                        <span className="text-gray-500 ml-1">— {s.active_enrollment?.class_group?.name || '-'}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium leading-6 text-gray-900 mb-1">Dari Tanggal</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="block w-full sm:w-40 rounded-md border-0 py-1.5 px-3 text-gray-900 ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-indigo-600 sm:text-sm sm:leading-6"
            />
          </div>
          <div>
            <label className="block text-sm font-medium leading-6 text-gray-900 mb-1">Sampai Tanggal</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="block w-full sm:w-40 rounded-md border-0 py-1.5 px-3 text-gray-900 ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-indigo-600 sm:text-sm sm:leading-6"
            />
          </div>
        </div>
      </div>

      {/* Loading */}
      {reportLoading && (
        <div className="animate-pulse space-y-4">
          <div className="h-64 bg-gray-200 rounded-xl" />
        </div>
      )}
      {isError && <Alert variant="error" title="Gagal Memuat">Terjadi kesalahan saat memuat laporan tabungan siswa.</Alert>}

      {/* Prompt to select student */}
      {!selectedStudent && !reportLoading && (
        <div className="bg-white rounded-xl shadow-sm ring-1 ring-gray-900/5 p-12 text-center print:hidden">
          <User className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-sm text-gray-500">Pilih siswa terlebih dahulu untuk melihat laporan tabungan.</p>
        </div>
      )}

      {/* Report Table */}
      {report && !reportLoading && (
        <div className="bg-white rounded-xl shadow-sm ring-1 ring-gray-900/5 overflow-hidden">
          {/* Student info bar (screen only) */}
          <div className="px-6 py-4 bg-gray-50 border-b border-gray-200 print:hidden">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-semibold text-gray-900">{report.student.full_name}</h3>
                <p className="text-sm text-gray-500">
                  {report.student.class_group || '-'} &bull; Periode: {formatPeriodID(report.period.start_date)} — {formatPeriodID(report.period.end_date)}
                </p>
              </div>
              <div className="text-right">
                <div className="text-sm text-gray-500">Saldo Akhir</div>
                <div className={`text-xl font-bold ${report.saldo_akhir < 0 ? 'text-red-600' : 'text-green-600'}`}>
                  Rp {formatRupiah(report.saldo_akhir)}
                </div>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-300">
              <thead className="bg-gray-50">
                <tr>
                  <th className="py-3 pl-6 pr-3 text-left text-sm font-semibold text-gray-900 w-12">No.</th>
                  <th className="px-3 py-3 text-left text-sm font-semibold text-gray-900 w-28">Tanggal</th>
                  <th className="px-3 py-3 text-left text-sm font-semibold text-gray-900">Keterangan</th>
                  <th className="px-3 py-3 text-right text-sm font-semibold text-gray-900">Debit (Masuk)</th>
                  <th className="px-3 py-3 text-right text-sm font-semibold text-gray-900">Kredit (Keluar)</th>
                  <th className="px-3 py-3 text-right text-sm font-semibold text-gray-900 pr-6">Saldo</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {/* Saldo Awal */}
                <tr className="bg-gray-50/50">
                  <td className="py-2.5 pl-6 pr-3 text-sm text-gray-500" />
                  <td className="px-3 py-2.5 text-sm text-gray-500 italic" colSpan={2}>
                    Saldo Awal Periode
                  </td>
                  <td className="px-3 py-2.5" />
                  <td className="px-3 py-2.5" />
                  <td className={`px-3 py-2.5 text-sm text-right tabular-nums font-semibold pr-6 ${report.saldo_awal < 0 ? 'text-red-600' : 'text-gray-900'}`}>
                    {formatRupiah(report.saldo_awal)}
                  </td>
                </tr>

                {rows.length > 0 ? (
                  rows.map((row: TabunganSiswaRow, idx: number) => (
                    <tr key={idx} className="hover:bg-gray-50">
                      <td className="py-2 pl-6 pr-3 text-sm text-gray-500 tabular-nums">{idx + 1}.</td>
                      <td className="px-3 py-2 text-sm text-gray-900 tabular-nums whitespace-nowrap">
                        {formatDateID(row.date)}
                      </td>
                      <td className="px-3 py-2 text-sm text-gray-900">{row.description}</td>
                      <td className="px-3 py-2 text-sm text-right tabular-nums text-gray-900">
                        {row.debit ? formatRupiah(row.debit) : ''}
                      </td>
                      <td className="px-3 py-2 text-sm text-right tabular-nums text-gray-900">
                        {row.credit ? formatRupiah(row.credit) : ''}
                      </td>
                      <td className={`px-3 py-2 text-sm text-right tabular-nums pr-6 ${row.saldo < 0 ? 'text-red-600' : 'text-gray-900'}`}>
                        {formatRupiah(row.saldo)}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center text-sm text-gray-500">
                      Tidak ada transaksi tabungan pada periode ini.
                    </td>
                  </tr>
                )}

                {/* Total */}
                {rows.length > 0 && (
                  <tr className="bg-gray-50 border-t-2 border-gray-300 font-semibold">
                    <td className="py-3 pl-6 pr-3" />
                    <td className="px-3 py-3 text-sm text-gray-900" colSpan={2}>Total</td>
                    <td className="px-3 py-3 text-sm text-right tabular-nums text-gray-900">
                      {formatRupiah(report.total_debit)}
                    </td>
                    <td className="px-3 py-3 text-sm text-right tabular-nums text-gray-900">
                      {formatRupiah(report.total_credit)}
                    </td>
                    <td className="px-3 py-3" />
                  </tr>
                )}

                {/* Saldo Akhir */}
                <tr className="bg-gray-100 border-t border-gray-300 font-bold">
                  <td className="py-3 pl-6 pr-3" />
                  <td className="px-3 py-3 text-sm text-gray-900" colSpan={2}>Saldo Akhir</td>
                  <td className="px-3 py-3" />
                  <td className="px-3 py-3" />
                  <td className={`px-3 py-3 text-sm text-right tabular-nums pr-6 ${report.saldo_akhir < 0 ? 'text-red-600' : 'text-gray-900'}`}>
                    {formatRupiah(report.saldo_akhir)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Print footer */}
      <div className="hidden print:block mt-8 text-sm text-gray-500 text-center">
        <p>Dokumen ini dicetak secara otomatis oleh sistem Alizzah School.</p>
        <p>Tanggal cetak: {new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
      </div>
    </div>
  );
}
