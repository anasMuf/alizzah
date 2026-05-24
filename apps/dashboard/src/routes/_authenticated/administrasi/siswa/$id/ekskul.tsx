import { createFileRoute } from '@tanstack/react-router';
import { Trophy } from 'lucide-react';
import { useGetV1StudentsIdExtracurriculars } from '../../../../../api/endpoints/student-extracurriculars/student-extracurriculars';
import { Badge } from '../../../../../components/atoms/Badge';
import { Button } from '../../../../../components/atoms/Button';
import { useToast } from '../../../../../components/molecules/Toast';

export const Route = createFileRoute('/_authenticated/administrasi/siswa/$id/ekskul')({
  component: SiswaEkskulPage,
});

function SiswaEkskulPage() {
  const { id } = Route.useParams();
  const studentId = Number(id);
  const { addToast } = useToast();

  const { data: response, isLoading, isError } = useGetV1StudentsIdExtracurriculars(studentId);
  const studentEkskuls = (response?.data as any)?.data || [];

  if (isLoading) {
    return <div className="p-8 animate-pulse bg-white rounded-xl shadow-sm h-64"></div>;
  }

  if (isError) {
    return <div className="p-8 bg-red-50 text-red-800 rounded-xl">Gagal memuat data ekstrakurikuler.</div>;
  }

  const getStatusBadge = (status: string) => {
    switch (status.toLowerCase()) {
      case 'active': return <Badge variant="success">Aktif</Badge>;
      case 'inactive': return <Badge variant="secondary">Tidak Aktif</Badge>;
      default: return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getEkskulTypeBadge = (type: string) => {
    switch (type.toLowerCase()) {
      case 'pasta': return <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-200">PASTA</Badge>;
      case 'calisan': return <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-200">CALISAN</Badge>;
      case 'ekskul': return <Badge className="bg-purple-100 text-purple-700 hover:bg-purple-200">EKSKUL</Badge>;
      default: return <Badge variant="secondary">{type}</Badge>;
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  };

  return (
    <div className="bg-white rounded-xl shadow-sm ring-1 ring-gray-900/5 overflow-hidden">
      <div className="px-4 py-5 sm:px-6 border-b border-gray-200 flex justify-between items-center">
        <div>
          <h3 className="text-base font-semibold leading-6 text-gray-900">Daftar Ekstrakurikuler</h3>
          <p className="mt-1 max-w-2xl text-sm text-gray-500">Kegiatan PASTA, CALISAN, dan Ekskul yang diikuti siswa.</p>
        </div>
        <Button size="sm" onClick={() => addToast({ variant: 'info', title: 'Info', message: 'Fitur pendaftaran ekskul sedang dalam pengembangan.' })}>Daftar Ekskul</Button>
      </div>

      <div className="p-0">
        {studentEkskuls.length === 0 ? (
          <div className="p-12 text-center text-gray-500">
            <Trophy className="mx-auto h-8 w-8 text-gray-300 mb-3" />
            Siswa ini belum terdaftar di kegiatan ekskul apapun.
          </div>
        ) : (
          <ul role="list" className="divide-y divide-gray-100">
            {studentEkskuls.map((se: any) => (
              <li key={se.id} className="px-4 py-5 sm:px-6 hover:bg-gray-50 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex items-start gap-x-4">
                    <div className="mt-1">
                      {getEkskulTypeBadge(se.extracurricular.type)}
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-gray-900">{se.extracurricular.name}</h4>
                      <p className="text-xs text-gray-500 mt-1">
                        Sejak: {formatDate(se.start_date)} {se.end_date ? `s/d ${formatDate(se.end_date)}` : ''}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    {getStatusBadge(se.status)}
                    {se.status === 'active' && (
                      <Button variant="ghost" size="sm" className="text-red-600 hover:text-red-700 hover:bg-red-50">Berhenti</Button>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
