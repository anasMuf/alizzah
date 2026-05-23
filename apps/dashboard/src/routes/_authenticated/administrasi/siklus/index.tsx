import { createFileRoute, Link } from '@tanstack/react-router';
import { 
  GraduationCap, 
  ArrowUpRight, 
  RefreshCw, 
  UserPlus, 
  UserMinus 
} from 'lucide-react';

export const Route = createFileRoute('/_authenticated/administrasi/siklus/')({
  component: AdministrasiSiklusHubPage,
});

function AdministrasiSiklusHubPage() {
  const endOfYearProcesses = [
    {
      title: 'Kenaikan Kelas',
      description: 'Pindahkan semua siswa ke jenjang berikutnya.',
      icon: <ArrowUpRight className="h-6 w-6 text-blue-600" />,
      href: '/administrasi/siklus/kenaikan-kelas',
      color: 'bg-blue-50 border-blue-200',
    },
    {
      title: 'Kelulusan',
      description: 'Proses wisuda siswa Berlian (TK-B).',
      icon: <GraduationCap className="h-6 w-6 text-purple-600" />,
      href: '/administrasi/siklus/kelulusan',
      color: 'bg-purple-50 border-purple-200',
    },
  ];

  const anytimeProcesses = [
    {
      title: 'Pindah Rombel',
      description: 'Pindahkan siswa antar rombel satu jenjang.',
      icon: <RefreshCw className="h-6 w-6 text-orange-600" />,
      href: '/administrasi/siklus/pindah-rombel',
      color: 'bg-orange-50 border-orange-200',
    },
    {
      title: 'Mutasi Masuk',
      description: 'Terima siswa baru dari sekolah lain.',
      icon: <UserPlus className="h-6 w-6 text-green-600" />,
      href: '/administrasi/siklus/mutasi',
      color: 'bg-green-50 border-green-200',
    },
    {
      title: 'Siswa Keluar',
      description: 'Catat siswa yang pindah atau berhenti.',
      icon: <UserMinus className="h-6 w-6 text-red-600" />,
      href: '/administrasi/siklus/keluar',
      color: 'bg-red-50 border-red-200',
    },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold leading-7 text-gray-900 sm:truncate sm:tracking-tight">
          Siklus Akademik
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          Kelola perpindahan kelas, kelulusan, dan mutasi siswa.
        </p>
      </div>

      <div>
        <h2 className="text-lg font-medium text-gray-900 mb-4">Proses Akhir Tahun Ajaran</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {endOfYearProcesses.map((item) => (
            <Link
              key={item.title}
              to={item.href}
              className={`relative flex items-start space-x-3 rounded-lg border px-6 py-5 shadow-sm focus-within:ring-2 focus-within:ring-indigo-500 focus-within:ring-offset-2 hover:border-gray-400 transition-colors ${item.color}`}
            >
              <div className="flex-shrink-0">
                {item.icon}
              </div>
              <div className="min-w-0 flex-1">
                <span className="absolute inset-0" aria-hidden="true" />
                <p className="text-sm font-medium text-gray-900">{item.title}</p>
                <p className="truncate text-sm text-gray-500">{item.description}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>

      <div>
        <h2 className="text-lg font-medium text-gray-900 mb-4">Proses Sewaktu-waktu</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {anytimeProcesses.map((item) => (
            <Link
              key={item.title}
              to={item.href}
              className={`relative flex items-start space-x-3 rounded-lg border px-6 py-5 shadow-sm focus-within:ring-2 focus-within:ring-indigo-500 focus-within:ring-offset-2 hover:border-gray-400 transition-colors ${item.color}`}
            >
              <div className="flex-shrink-0">
                {item.icon}
              </div>
              <div className="min-w-0 flex-1">
                <span className="absolute inset-0" aria-hidden="true" />
                <p className="text-sm font-medium text-gray-900">{item.title}</p>
                <p className="truncate text-sm text-gray-500">{item.description}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
