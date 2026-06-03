import { useState } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { Trophy, Plus } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import {
  useGetV1StudentsIdExtracurriculars,
  usePostV1StudentsIdExtracurriculars,
  useDeleteV1StudentsIdExtracurricularsSeId,
  getGetV1StudentsIdExtracurricularsQueryKey,
} from '../../../../../api/endpoints/student-extracurriculars/student-extracurriculars';
import { useGetV1Extracurriculars } from '../../../../../api/endpoints/extracurriculars/extracurriculars';
import { useGetV1AcademicYears } from '../../../../../api/endpoints/academic-years/academic-years';
import { Badge } from '../../../../../components/atoms/Badge';
import { Button } from '../../../../../components/atoms/Button';
import { useToast } from '../../../../../components/molecules/Toast';
import { SlideOver } from '../../../../../components/molecules/SlideOver';
import { ConfirmDialog } from '../../../../../components/molecules/ConfirmDialog';
import { ApiError } from '../../../../../api/mutator/custom-instance';

export const Route = createFileRoute('/_authenticated/administrasi/siswa/$id/ekskul')({
  component: SiswaEkskulPage,
});

function SiswaEkskulPage() {
  const { id } = Route.useParams();
  const studentId = Number(id);
  const queryClient = useQueryClient();
  const { addToast } = useToast();

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isUnenrollOpen, setIsUnenrollOpen] = useState(false);
  const [selectedSeId, setSelectedSeId] = useState<number | null>(null);
  const [selectedSeName, setSelectedSeName] = useState('');

  // Form state
  const [formData, setFormData] = useState({
    extracurricular_id: 0,
    academic_year_id: 0,
    start_date: new Date().toISOString().split('T')[0],
  });

  const { data: response, isLoading, isError } = useGetV1StudentsIdExtracurriculars(studentId);
  const studentEkskuls = (response?.data as any)?.data || [];

  // Master data for form
  const { data: ekskulResponse } = useGetV1Extracurriculars();
  const allEkskuls = (ekskulResponse?.data as any)?.data || [];

  const { data: ayResponse } = useGetV1AcademicYears();
  const academicYears = (ayResponse?.data as any)?.data || [];
  const activeYear = academicYears.find((ay: any) => ay.is_active);

  const enrollMutation = usePostV1StudentsIdExtracurriculars({
    mutation: {
      onSuccess: () => {
        addToast({ variant: 'success', title: 'Berhasil', message: 'Siswa berhasil didaftarkan ke ekstrakurikuler.' });
        queryClient.invalidateQueries({ queryKey: getGetV1StudentsIdExtracurricularsQueryKey(studentId) });
        setIsFormOpen(false);
        resetForm();
      },
      onError: (error: Error) => {
        const msg = error instanceof ApiError ? error.message : 'Terjadi kesalahan';
        addToast({ variant: 'error', title: 'Gagal', message: msg });
      },
    },
  });

  const unenrollMutation = useDeleteV1StudentsIdExtracurricularsSeId({
    mutation: {
      onSuccess: () => {
        addToast({ variant: 'success', title: 'Berhasil', message: 'Siswa berhasil dicabut dari ekstrakurikuler.' });
        queryClient.invalidateQueries({ queryKey: getGetV1StudentsIdExtracurricularsQueryKey(studentId) });
        setIsUnenrollOpen(false);
        setSelectedSeId(null);
      },
      onError: (error: Error) => {
        const msg = error instanceof ApiError ? error.message : 'Terjadi kesalahan';
        addToast({ variant: 'error', title: 'Gagal', message: msg });
      },
    },
  });

  const resetForm = () => {
    setFormData({
      extracurricular_id: 0,
      academic_year_id: activeYear?.id || 0,
      start_date: new Date().toISOString().split('T')[0],
    });
  };

  const handleOpenForm = () => {
    setFormData({
      extracurricular_id: 0,
      academic_year_id: activeYear?.id || 0,
      start_date: new Date().toISOString().split('T')[0],
    });
    setIsFormOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.extracurricular_id || !formData.academic_year_id) {
      addToast({ variant: 'error', title: 'Validasi', message: 'Pilih ekstrakurikuler dan tahun ajaran.' });
      return;
    }
    enrollMutation.mutate({
      id: studentId,
      data: formData,
    });
  };

  const handleUnenroll = (se: any) => {
    setSelectedSeId(se.id);
    setSelectedSeName(se.extracurricular?.name || 'Ekskul');
    setIsUnenrollOpen(true);
  };

  const confirmUnenroll = () => {
    if (selectedSeId) {
      unenrollMutation.mutate({ id: studentId, seId: selectedSeId });
    }
  };

  if (isLoading) {
    return <div className="p-8 animate-pulse bg-white rounded-xl shadow-sm h-64"></div>;
  }

  if (isError) {
    return <div className="p-8 bg-red-50 text-red-800 rounded-xl">Gagal memuat data ekstrakurikuler.</div>;
  }

  const getEkskulTypeBadge = (type: string) => {
    switch (type?.toLowerCase()) {
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

  // Filter out already-enrolled ekskuls for the form dropdown
  const enrolledIds = studentEkskuls
    .filter((se: any) => !se.end_date)
    .map((se: any) => se.extracurricular?.id);
  const availableEkskuls = allEkskuls.filter((e: any) => !enrolledIds.includes(e.id));

  return (
    <>
      <div className="bg-white rounded-xl shadow-sm ring-1 ring-gray-900/5 overflow-hidden">
        <div className="px-4 py-5 sm:px-6 border-b border-gray-200 flex justify-between items-center">
          <div>
            <h3 className="text-base font-semibold leading-6 text-gray-900">Daftar Ekstrakurikuler</h3>
            <p className="mt-1 max-w-2xl text-sm text-gray-500">Kegiatan PASTA, CALISAN, dan Ekskul yang diikuti siswa.</p>
          </div>
          <Button size="sm" onClick={handleOpenForm} className="flex items-center gap-1.5">
            <Plus className="h-4 w-4" />
            Daftar Ekskul
          </Button>
        </div>

        <div className="p-0">
          {studentEkskuls.length === 0 ? (
            <div className="p-12 text-center text-gray-500">
              <Trophy className="mx-auto h-8 w-8 text-gray-300 mb-3" />
              Siswa ini belum terdaftar di kegiatan ekskul apapun.
            </div>
          ) : (
            <ul role="list" className="divide-y divide-gray-100">
              {studentEkskuls.map((se: any) => {
                const isActive = !se.end_date;
                return (
                  <li key={se.id} className="px-4 py-5 sm:px-6 hover:bg-gray-50 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex items-start gap-x-4">
                        <div className="mt-1">
                          {getEkskulTypeBadge(se.extracurricular?.type)}
                        </div>
                        <div>
                          <h4 className="text-sm font-semibold text-gray-900">{se.extracurricular?.name}</h4>
                          <p className="text-xs text-gray-500 mt-1">
                            Sejak: {formatDate(se.start_date)} {se.end_date ? `s/d ${formatDate(se.end_date)}` : ''}
                          </p>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        {isActive ? (
                          <>
                            <Badge variant="success">Aktif</Badge>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                              onClick={() => handleUnenroll(se)}
                            >
                              Berhenti
                            </Button>
                          </>
                        ) : (
                          <Badge variant="secondary">Tidak Aktif</Badge>
                        )}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>

      {/* Enrollment Form */}
      <SlideOver
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        title="Daftarkan Ekstrakurikuler"
        footer={
          <>
            <Button variant="secondary" onClick={() => setIsFormOpen(false)} disabled={enrollMutation.isPending}>
              Batal
            </Button>
            <Button variant="primary" onClick={handleSubmit} disabled={enrollMutation.isPending}>
              {enrollMutation.isPending ? 'Menyimpan...' : 'Daftarkan'}
            </Button>
          </>
        }
      >
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium leading-6 text-gray-900 mb-2">
              Kegiatan Ekstrakurikuler <span className="text-red-500">*</span>
            </label>
            {availableEkskuls.length === 0 ? (
              <p className="text-sm text-gray-500">Semua ekstrakurikuler sudah terdaftar.</p>
            ) : (
              <select
                value={formData.extracurricular_id}
                onChange={(e) => setFormData({ ...formData, extracurricular_id: Number(e.target.value) })}
                className="block w-full rounded-md border-0 py-1.5 text-gray-900 ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-indigo-600 sm:text-sm sm:leading-6"
                required
              >
                <option value={0}>-- Pilih Kegiatan --</option>
                {availableEkskuls.map((e: any) => (
                  <option key={e.id} value={e.id}>
                    {e.name} ({(e.type || '').toUpperCase()})
                  </option>
                ))}
              </select>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium leading-6 text-gray-900 mb-2">
              Tahun Ajaran <span className="text-red-500">*</span>
            </label>
            <select
              value={formData.academic_year_id}
              onChange={(e) => setFormData({ ...formData, academic_year_id: Number(e.target.value) })}
              className="block w-full rounded-md border-0 py-1.5 text-gray-900 ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-indigo-600 sm:text-sm sm:leading-6"
              required
            >
              <option value={0}>-- Pilih Tahun Ajaran --</option>
              {academicYears.map((ay: any) => (
                <option key={ay.id} value={ay.id}>
                  {ay.name} {ay.is_active ? '(Aktif)' : ''}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium leading-6 text-gray-900 mb-2">
              Tanggal Mulai <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              value={formData.start_date}
              onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
              className="block w-full rounded-md border-0 py-1.5 text-gray-900 ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-indigo-600 sm:text-sm sm:leading-6"
              required
            />
          </div>

          <div className="rounded-md bg-blue-50 p-4">
            <p className="text-sm text-blue-700">
              Tagihan bulanan untuk kegiatan ini akan otomatis ditambahkan ke invoice siswa mulai dari bulan yang dipilih hingga akhir tahun ajaran.
            </p>
          </div>
        </form>
      </SlideOver>

      {/* Unenroll Confirmation */}
      <ConfirmDialog
        open={isUnenrollOpen}
        onCancel={() => { setIsUnenrollOpen(false); setSelectedSeId(null); }}
        onConfirm={confirmUnenroll}
        title="Berhenti Ekstrakurikuler"
        variant="danger"
      >
        <p>
          Anda yakin ingin menghentikan siswa dari <strong>{selectedSeName}</strong>?
          Tagihan bulan ini ke depan yang belum dibayar akan otomatis dihapus.
        </p>
      </ConfirmDialog>
    </>
  );
}
