import { useState } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { useQueryClient } from '@tanstack/react-query';
import { Phone, MapPin, Star, Trash2 } from 'lucide-react';
import { 
  useGetV1StudentsId, 
  useGetV1StudentsIdGuardians,
  usePatchV1StudentsIdGuardiansGuardianIdPrimary,
  useDeleteV1StudentsIdGuardiansGuardianId,
  getGetV1StudentsIdGuardiansQueryKey
} from '../../../../../api/endpoints/students/students';
import { ApiError } from '../../../../../api/mutator/custom-instance';
import { Button } from '../../../../../components/atoms/Button';
import { useToast } from '../../../../../components/molecules/Toast';
import { ConfirmDialog } from '../../../../../components/molecules/ConfirmDialog';

export const Route = createFileRoute('/_authenticated/administrasi/siswa/$id/profil')({
  component: ProfilSiswaPage,
});

function ProfilSiswaPage() {
  const { id } = Route.useParams();
  const studentId = Number(id);
  const queryClient = useQueryClient();
  const { addToast } = useToast();

  const [isDeleteGuardianOpen, setIsDeleteGuardianOpen] = useState(false);
  const [guardianToDelete, setGuardianToDelete] = useState<any>(null);

  const { data: response, isLoading } = useGetV1StudentsId(studentId);
  const student = (response?.data as any)?.data;

  const { data: guardiansResponse, isLoading: isLoadingGuardians } = useGetV1StudentsIdGuardians(studentId);
  const guardians = (guardiansResponse?.data as any)?.data || [];

  const setPrimaryMutation = usePatchV1StudentsIdGuardiansGuardianIdPrimary({
    mutation: {
      onSuccess: () => {
        addToast({ variant: 'success', title: 'Berhasil', message: 'Kontak utama berhasil diubah.' });
        queryClient.invalidateQueries({ queryKey: getGetV1StudentsIdGuardiansQueryKey(studentId) });
      },
      onError: (error: Error) => {
        const msg = error instanceof ApiError ? error.message : 'Gagal mengubah kontak utama.';
        addToast({ variant: 'error', title: 'Gagal', message: msg });
      }
    }
  });

  const deleteGuardianMutation = useDeleteV1StudentsIdGuardiansGuardianId({
    mutation: {
      onSuccess: () => {
        addToast({ variant: 'success', title: 'Berhasil', message: 'Wali murid berhasil dihapus dari daftar.' });
        queryClient.invalidateQueries({ queryKey: getGetV1StudentsIdGuardiansQueryKey(studentId) });
        setIsDeleteGuardianOpen(false);
        setGuardianToDelete(null);
      },
      onError: (error: Error) => {
        const msg = error instanceof ApiError ? error.message : 'Gagal menghapus wali murid.';
        addToast({ variant: 'error', title: 'Gagal', message: msg });
        setIsDeleteGuardianOpen(false);
      }
    }
  });

  if (isLoading || isLoadingGuardians) {
    return <div className="p-8 animate-pulse bg-white rounded-xl shadow-sm h-64"></div>;
  }

  if (!student) return null;

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  };

  const calculateAge = (dateStr: string) => {
    const birthDate = new Date(dateStr);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-sm ring-1 ring-gray-900/5">
        <div className="px-4 py-5 sm:px-6 border-b border-gray-200 flex justify-between items-center">
          <h3 className="text-base font-semibold leading-6 text-gray-900">Informasi Pribadi</h3>
          <Button variant="secondary" size="sm">Edit Data</Button>
        </div>
        <div className="px-4 py-5 sm:p-6">
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-8">
            <div className="sm:col-span-1">
              <dt className="text-sm font-medium text-gray-500">Tempat, Tanggal Lahir</dt>
              <dd className="mt-1 text-sm text-gray-900">{student.birth_place}, {formatDate(student.birth_date)} ({calculateAge(student.birth_date)} tahun)</dd>
            </div>
            <div className="sm:col-span-1">
              <dt className="text-sm font-medium text-gray-500">Agama</dt>
              <dd className="mt-1 text-sm text-gray-900">{student.religion || '-'}</dd>
            </div>
            <div className="sm:col-span-1">
              <dt className="text-sm font-medium text-gray-500">Jenis Kelamin</dt>
              <dd className="mt-1 text-sm text-gray-900">{student.gender === 'L' ? 'Laki-laki' : 'Perempuan'}</dd>
            </div>
            <div className="sm:col-span-1">
              <dt className="text-sm font-medium text-gray-500">Tanggal Terdaftar</dt>
              <dd className="mt-1 text-sm text-gray-900">{formatDate(student.created_at)}</dd>
            </div>
          </dl>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm ring-1 ring-gray-900/5">
        <div className="px-4 py-5 sm:px-6 border-b border-gray-200 flex justify-between items-center">
          <h3 className="text-base font-semibold leading-6 text-gray-900">Data Wali Murid</h3>
          <Button variant="secondary" size="sm" onClick={() => addToast({ variant: 'info', title: 'Info', message: 'Fitur tambah wali sedang dalam pengembangan.' })}>
            Tambah Wali
          </Button>
        </div>
        <div className="px-4 py-5 sm:p-6">
          {guardians.length === 0 ? (
            <p className="text-sm text-gray-500 italic text-center py-4">Belum ada data wali murid.</p>
          ) : (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {guardians.map((g: any) => (
                <div key={g.id} className={`rounded-lg border p-5 ${g.is_primary ? 'border-indigo-300 bg-indigo-50' : 'border-gray-200 bg-white'}`}>
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h4 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                        {g.guardian.full_name}
                        {g.is_primary && <Star className="h-4 w-4 text-amber-400 fill-amber-400" />}
                      </h4>
                      <p className="text-xs text-gray-500 capitalize">{g.guardian.relationship}</p>
                    </div>
                    <div className="flex gap-2">
                      {!g.is_primary && (
                        <button 
                          onClick={() => setPrimaryMutation.mutate({ id: studentId, guardianId: g.guardian_id })}
                          className="text-xs font-medium text-indigo-600 hover:text-indigo-800"
                          title="Jadikan Utama"
                        >
                          Utama
                        </button>
                      )}
                      {guardians.length > 1 && (
                        <button 
                          onClick={() => { setGuardianToDelete(g); setIsDeleteGuardianOpen(true); }}
                          className="text-gray-400 hover:text-red-600"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </div>
                  
                  <div className="space-y-3 mt-4 text-sm text-gray-600">
                    <div className="flex items-center gap-3">
                      <Phone className="h-4 w-4 text-gray-400 flex-shrink-0" />
                      <span>{g.guardian.phone || '-'}</span>
                    </div>
                    <div className="flex items-start gap-3">
                      <MapPin className="h-4 w-4 text-gray-400 flex-shrink-0 mt-0.5" />
                      <span className="line-clamp-2">{g.guardian.address || '-'}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <ConfirmDialog
        open={isDeleteGuardianOpen}
        onCancel={() => setIsDeleteGuardianOpen(false)}
        onConfirm={() => {
          if (guardianToDelete) {
            deleteGuardianMutation.mutate({ id: Number(id), guardianId: guardianToDelete.id });
          }
        }}
        title="Hapus Wali Murid"
        variant="danger"
      >
        <p>Anda yakin ingin menghapus data wali murid <strong>{guardianToDelete?.full_name}</strong>?</p>
      </ConfirmDialog>
    </div>
  );
}
