import { useState, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  usePostV1Extracurriculars,
  usePutV1ExtracurricularsId,
  getGetV1ExtracurricularsQueryKey,
} from '../../../api/endpoints/extracurriculars/extracurriculars';
import type { DtoCreateExtracurricularRequest, DtoExtracurricularResponse } from '../../../api/model';
import { ApiError } from '../../../api/mutator/custom-instance';
import { FormField } from '../../../components/molecules/FormField';
import { Button } from '../../../components/atoms/Button';
import { useToast } from '../../../components/molecules/Toast';
import { SlideOver } from '../../../components/molecules/SlideOver';

interface EkskulFormProps {
  isOpen: boolean;
  onClose: () => void;
  initialData?: DtoExtracurricularResponse | null;
}

export function EkskulForm({ isOpen, onClose, initialData }: EkskulFormProps) {
  const queryClient = useQueryClient();
  const { addToast } = useToast();

  const isEditing = !!initialData;

  const [formData, setFormData] = useState<DtoCreateExtracurricularRequest>({
    name: '',
    type: 'ekskul',
  });

  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        setFormData({
          name: initialData.name || '',
          type: (initialData.type as any) || 'ekskul',
        });
      } else {
        setFormData({
          name: '',
          type: 'ekskul',
        });
      }
    }
  }, [isOpen, initialData]);

  const createMutation = usePostV1Extracurriculars({
    mutation: {
      onSuccess: () => {
        addToast({ variant: 'success', title: 'Berhasil', message: 'Ekstrakurikuler berhasil ditambahkan.' });
        queryClient.invalidateQueries({ queryKey: getGetV1ExtracurricularsQueryKey() });
        onClose();
      },
      onError: (error: Error) => {
        const msg = error instanceof ApiError ? error.message : 'Terjadi kesalahan';
        addToast({ variant: 'error', title: 'Gagal', message: msg });
      },
    },
  });

  const updateMutation = usePutV1ExtracurricularsId({
    mutation: {
      onSuccess: () => {
        addToast({ variant: 'success', title: 'Berhasil', message: 'Ekstrakurikuler berhasil diperbarui.' });
        queryClient.invalidateQueries({ queryKey: getGetV1ExtracurricularsQueryKey() });
        onClose();
      },
      onError: (error: Error) => {
        const msg = error instanceof ApiError ? error.message : 'Terjadi kesalahan';
        addToast({ variant: 'error', title: 'Gagal', message: msg });
      },
    },
  });

  const isPending = createMutation.isPending || updateMutation.isPending;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isEditing && initialData) {
      updateMutation.mutate({ id: initialData?.id || 0, data: formData });
    } else {
      createMutation.mutate({ data: { ...formData } });
    }
  };

  return (
    <SlideOver
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? 'Edit Ekstrakurikuler' : 'Tambah Ekstrakurikuler'}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={isPending}>
            Batal
          </Button>
          <Button variant="primary" onClick={handleSubmit} disabled={isPending}>
            {isPending ? 'Menyimpan...' : 'Simpan'}
          </Button>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        <FormField
          id="name"
          name="name"
          label="Nama Kegiatan"
          placeholder="e.g. Futsal, PASTA 1"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          required
        />
        
        <div>
          <label className="block text-sm font-medium leading-6 text-gray-900 mb-2">Jenis Kegiatan</label>
          <select
            name="type"
            value={formData.type}
            onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
            className="block w-full rounded-md border-0 py-1.5 text-gray-900 ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-indigo-600 sm:text-sm sm:leading-6"
            required
          >
            <option value="pasta">PASTA</option>
            <option value="calisan">CALISAN</option>
            <option value="ekskul">Ekskul</option>
          </select>
        </div>
      </form>
    </SlideOver>
  );
}
