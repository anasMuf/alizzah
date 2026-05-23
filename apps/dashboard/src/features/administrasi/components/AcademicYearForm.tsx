import { useState, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { 
  usePostV1AcademicYears, 
  usePutV1AcademicYearsId,
  getGetV1AcademicYearsQueryKey 
} from '../../../api/endpoints/academic-years/academic-years';
import type { DtoCreateAcademicYearRequest, DtoAcademicYearResponse } from '../../../api/model';
import { ApiError } from '../../../api/mutator/custom-instance';
import { FormField } from '../../../components/molecules/FormField';
import { Button } from '../../../components/atoms/Button';
import { useToast } from '../../../components/molecules/Toast';
import { SlideOver } from '../../../components/molecules/SlideOver';

interface AcademicYearFormProps {
  isOpen: boolean;
  onClose: () => void;
  initialData?: DtoAcademicYearResponse | null;
}

export function AcademicYearForm({ isOpen, onClose, initialData }: AcademicYearFormProps) {
  const queryClient = useQueryClient();
  const { addToast } = useToast();
  
  const isEditing = !!initialData;

  const [formData, setFormData] = useState<DtoCreateAcademicYearRequest>({
    name: '',
    start_date: '',
    end_date: '',
  });

  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        setFormData({
          name: initialData.name || '',
          start_date: initialData.start_date ? initialData.start_date.split('T')[0] : '',
          end_date: initialData.end_date ? initialData.end_date.split('T')[0] : '',
        });
      } else {
        setFormData({ name: '', start_date: '', end_date: '' });
      }
    }
  }, [isOpen, initialData]);

  const createMutation = usePostV1AcademicYears({
    mutation: {
      onSuccess: () => {
        addToast({ variant: 'success', title: 'Berhasil', message: 'Tahun ajaran berhasil dibuat.' });
        queryClient.invalidateQueries({ queryKey: getGetV1AcademicYearsQueryKey() });
        onClose();
      },
      onError: (error: Error) => {
        const msg = error instanceof ApiError ? error.message : 'Terjadi kesalahan';
        addToast({ variant: 'error', title: 'Gagal', message: msg });
      }
    }
  });

  const updateMutation = usePutV1AcademicYearsId({
    mutation: {
      onSuccess: () => {
        addToast({ variant: 'success', title: 'Berhasil', message: 'Tahun ajaran berhasil diperbarui.' });
        queryClient.invalidateQueries({ queryKey: getGetV1AcademicYearsQueryKey() });
        onClose();
      },
      onError: (error: Error) => {
        const msg = error instanceof ApiError ? error.message : 'Terjadi kesalahan';
        addToast({ variant: 'error', title: 'Gagal', message: msg });
      }
    }
  });

  const isPending = createMutation.isPending || updateMutation.isPending;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isEditing && initialData) {
      updateMutation.mutate({
        id: initialData?.id || 0,
        data: { name: formData.name, start_date: formData.start_date, end_date: formData.end_date }
      });
    } else {
      createMutation.mutate({ data: formData });
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  return (
    <SlideOver
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? 'Edit Tahun Ajaran' : 'Buat Tahun Ajaran Baru'}
      footer={
        <>
          <Button type="button" variant="secondary" onClick={onClose} disabled={isPending}>Batal</Button>
          <Button variant="primary" onClick={handleSubmit} disabled={isPending}>
            {isPending ? 'Menyimpan...' : 'Simpan'}
          </Button>
        </>
      }
    >
      <form id="ay-form" onSubmit={handleSubmit} className="space-y-6">
        <FormField
          id="name"
          name="name"
          label="Nama Tahun Ajaran"
          placeholder="e.g. 2025/2026"
          value={formData.name}
          onChange={handleChange}
          required
        />
        <FormField
          id="start_date"
          name="start_date"
          type="date"
          label="Tanggal Mulai"
          value={formData.start_date}
          onChange={handleChange}
          required
        />
        <FormField
          id="end_date"
          name="end_date"
          type="date"
          label="Tanggal Selesai"
          value={formData.end_date}
          onChange={handleChange}
          required
        />
        
        {isEditing && initialData?.is_active && (
          <div className="rounded-md bg-blue-50 p-4">
            <div className="flex">
              <div className="ml-3">
                <h3 className="text-sm font-medium text-blue-800">Informasi</h3>
                <div className="mt-2 text-sm text-blue-700">
                  <p>Tahun ajaran ini sedang aktif.</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </form>
    </SlideOver>
  );
}
