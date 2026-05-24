import { createFileRoute, Link } from '@tanstack/react-router';
import { useGetV1StudentsId } from '../../../../../api/endpoints/students/students';
import { Wallet, CreditCard, PiggyBank, ArrowRight } from 'lucide-react';
import { Button } from '../../../../../components/atoms/Button';

export const Route = createFileRoute('/_authenticated/administrasi/siswa/$id/keuangan')({
  component: SiswaKeuanganPage,
});

function SiswaKeuanganPage() {
  const { id } = Route.useParams();
  const studentId = Number(id);

  const { data: response, isLoading, isError } = useGetV1StudentsId(studentId);
  const student = (response?.data as any)?.data;

  if (isLoading) {
    return <div className="p-8 animate-pulse bg-white rounded-xl shadow-sm h-64"></div>;
  }

  if (isError || !student) {
    return <div className="p-8 bg-red-50 text-red-800 rounded-xl">Gagal memuat data keuangan.</div>;
  }

  const formatRupiah = (amount: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(amount);
  };

  const summary = student.financial_summary;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {/* Card: Total Tagihan Belum Dibayar */}
        <div className="bg-white rounded-xl shadow-sm ring-1 ring-gray-900/5 p-6 relative overflow-hidden flex flex-col">
          <div className="absolute top-0 right-0 -mr-4 -mt-4 opacity-10">
            <CreditCard className="w-32 h-32 text-red-600" />
          </div>
          <div className="flex items-center gap-3 text-red-600 mb-4 relative z-10">
            <div className="p-2 bg-red-100 rounded-lg">
              <CreditCard className="w-6 h-6" />
            </div>
            <h3 className="font-semibold">Total Tunggakan</h3>
          </div>
          <p className="text-3xl font-bold text-gray-900 relative z-10 mb-2">
            {summary ? formatRupiah(summary.total_unpaid) : formatRupiah(0)}
          </p>
          <p className="text-sm text-gray-500 relative z-10">Akumulasi tagihan SPP, SPD, dll yang belum lunas.</p>
          
          <div className="mt-auto pt-6 relative z-10">
            <Link to="/keuangan/tagihan/siswa/$id" params={{ id }}>
              <Button variant="secondary" className="w-full text-red-700 border-red-200 hover:bg-red-50 hover:border-red-300">
                Lihat Tagihan <ArrowRight className="ml-2 w-4 h-4" />
              </Button>
            </Link>
          </div>
        </div>

        {/* Card: Saldo Tabungan Umum */}
        <div className="bg-white rounded-xl shadow-sm ring-1 ring-gray-900/5 p-6 relative overflow-hidden flex flex-col">
          <div className="absolute top-0 right-0 -mr-4 -mt-4 opacity-10">
            <PiggyBank className="w-32 h-32 text-green-600" />
          </div>
          <div className="flex items-center gap-3 text-green-600 mb-4 relative z-10">
            <div className="p-2 bg-green-100 rounded-lg">
              <PiggyBank className="w-6 h-6" />
            </div>
            <h3 className="font-semibold">Tabungan Umum</h3>
          </div>
          <p className="text-3xl font-bold text-gray-900 relative z-10 mb-2">
            {summary ? formatRupiah(summary.savings_general_balance) : formatRupiah(0)}
          </p>
          <p className="text-sm text-gray-500 relative z-10">Dapat ditarik kapan saja.</p>
          
          <div className="mt-auto pt-6 relative z-10">
            <Link to="/keuangan/tabungan/siswa/$id" params={{ id }}>
              <Button variant="secondary" className="w-full text-green-700 border-green-200 hover:bg-green-50 hover:border-green-300">
                Buku Tabungan <ArrowRight className="ml-2 w-4 h-4" />
              </Button>
            </Link>
          </div>
        </div>

        {/* Card: Saldo Tabungan Wajib */}
        <div className="bg-white rounded-xl shadow-sm ring-1 ring-gray-900/5 p-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 -mr-4 -mt-4 opacity-10">
            <Wallet className="w-32 h-32 text-indigo-600" />
          </div>
          <div className="flex items-center gap-3 text-indigo-600 mb-4 relative z-10">
            <div className="p-2 bg-indigo-100 rounded-lg">
              <Wallet className="w-6 h-6" />
            </div>
            <h3 className="font-semibold">Tabungan Wajib</h3>
          </div>
          <p className="text-3xl font-bold text-gray-900 relative z-10 mb-2">
            {summary ? formatRupiah(summary.savings_mandatory_balance) : formatRupiah(0)}
          </p>
          <p className="text-sm text-gray-500 relative z-10">Hanya bisa ditarik saat kelulusan atau mutasi.</p>
        </div>
      </div>

      <div className="rounded-md bg-blue-50 p-4 border border-blue-200">
        <div className="flex">
          <div className="ml-3">
            <h3 className="text-sm font-medium text-blue-800">Catatan Administratif</h3>
            <div className="mt-2 text-sm text-blue-700">
              <p>Tab keuangan ini hanya berupa ringkasan *read-only*. Untuk melakukan pencatatan pembayaran tagihan, penarikan/setoran tabungan, silakan akses melalui modul <strong>Keuangan</strong>.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
