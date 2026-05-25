import { useState, useEffect, useMemo } from 'react';
import { createFileRoute, redirect } from '@tanstack/react-router';
import { useQueryClient } from '@tanstack/react-query';
import { Plus, Search, Trash2, Edit } from 'lucide-react';
import {
  useGetV1Users,
  usePostV1Users,
  usePutV1UsersId,
  useDeleteV1UsersId,
  getGetV1UsersQueryKey,
} from '../../../api/endpoints/users/users';
import type { DtoUserResponse, DtoCreateUserRequest, DtoUpdateUserRequest } from '../../../api/model';
import { DtoCreateUserRequestRole } from '../../../api/model';
import { ApiError } from '../../../api/mutator/custom-instance';
import { Button } from '../../../components/atoms/Button';
import { Badge } from '../../../components/atoms/Badge';
import { SlideOver } from '../../../components/molecules/SlideOver';
import { FormField } from '../../../components/molecules/FormField';
import { ConfirmDialog } from '../../../components/molecules/ConfirmDialog';
import { EmptyState } from '../../../components/molecules/EmptyState';
import { Pagination } from '../../../components/molecules/Pagination';
import { useToast } from '../../../components/molecules/Toast';

export const Route = createFileRoute('/_authenticated/pengaturan/pengguna')({
  beforeLoad: () => {
    const role = localStorage.getItem('alizzah_role');
    if (role !== 'superadmin') {
      throw redirect({ to: '/' });
    }
  },
  component: PengaturanPenggunaComponent,
});

const ROLES = Object.values(DtoCreateUserRequestRole);

const ROLE_LABELS: Record<string, string> = {
  superadmin: 'Super Admin',
  admin_administrasi: 'Admin Administrasi',
  admin_keuangan: 'Admin Keuangan',
  kepala_sekolah: 'Kepala Sekolah',
  yayasan: 'Yayasan',
};

const ROLE_BADGE_VARIANT: Record<string, 'primary' | 'secondary' | 'success' | 'warning' | 'danger' | 'info'> = {
  superadmin: 'danger',
  admin_administrasi: 'primary',
  admin_keuangan: 'success',
  kepala_sekolah: 'warning',
  yayasan: 'info',
};

function PengaturanPenggunaComponent() {
  const queryClient = useQueryClient();
  const { addToast } = useToast();

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [filterRole, setFilterRole] = useState('');

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<DtoUserResponse | null>(null);

  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<DtoUserResponse | null>(null);

  const params = useMemo(() => ({
    page,
    limit: 20,
    ...(search ? { search } : {}),
    ...(filterRole ? { role: filterRole } : {}),
  }), [page, search, filterRole]);

  const { data: response, isLoading, isError } = useGetV1Users(params);
  const result = response?.data as any;
  const users: DtoUserResponse[] = result?.data || [];
  const meta = result?.meta || { page: 1, limit: 20, total: 0 };

  const invalidate = () => queryClient.invalidateQueries({ queryKey: getGetV1UsersQueryKey() });

  const deleteMutation = useDeleteV1UsersId({
    mutation: {
      onSuccess: () => {
        addToast({ variant: 'success', title: 'Berhasil', message: 'Pengguna berhasil dihapus.' });
        invalidate();
        setIsDeleteOpen(false);
        setUserToDelete(null);
      },
      onError: (error: Error) => {
        const msg = error instanceof ApiError ? error.message : 'Gagal menghapus pengguna.';
        addToast({ variant: 'error', title: 'Gagal', message: msg });
        setIsDeleteOpen(false);
      },
    },
  });

  const handleOpenCreate = () => {
    setEditingUser(null);
    setIsFormOpen(true);
  };

  const handleOpenEdit = (user: DtoUserResponse) => {
    setEditingUser(user);
    setIsFormOpen(true);
  };

  const handleOpenDelete = (user: DtoUserResponse) => {
    setUserToDelete(user);
    setIsDeleteOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="sm:flex sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold leading-7 text-gray-900 sm:truncate sm:tracking-tight">
            Manajemen Pengguna
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Kelola akun pengguna sistem termasuk admin, kepala sekolah, dan yayasan.
          </p>
        </div>
        <div className="mt-4 sm:ml-4 sm:mt-0">
          <Button onClick={handleOpenCreate} className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Tambah Pengguna
          </Button>
        </div>
      </div>

      <div className="bg-white p-4 rounded-xl shadow-sm ring-1 ring-gray-900/5">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1 max-w-sm">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
              <Search className="h-4 w-4 text-gray-400" />
            </div>
            <input
              type="text"
              className="block w-full rounded-md border-0 py-1.5 pl-10 text-gray-900 ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
              placeholder="Cari nama atau email..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            />
          </div>
          <select
            value={filterRole}
            onChange={(e) => { setFilterRole(e.target.value); setPage(1); }}
            className="block rounded-md border-0 py-1.5 text-gray-900 ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-indigo-600 sm:text-sm sm:leading-6"
          >
            <option value="">Semua Role</option>
            {ROLES.map((role) => (
              <option key={role} value={role}>{ROLE_LABELS[role] || role}</option>
            ))}
          </select>
        </div>
      </div>

      {isLoading ? (
        <div className="bg-white rounded-xl shadow-sm ring-1 ring-gray-900/5 h-64 animate-pulse" />
      ) : isError ? (
        <div className="bg-red-50 p-4 rounded-md text-red-800">Gagal memuat data pengguna.</div>
      ) : users.length === 0 ? (
        <EmptyState
          title="Tidak ada pengguna"
          description="Belum ada pengguna yang sesuai dengan pencarian atau filter."
        />
      ) : (
        <div className="bg-white rounded-xl shadow-sm ring-1 ring-gray-900/5 overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nama</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Aksi</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {users.map((user) => (
                <tr key={user.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{user.full_name}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{user.email}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <Badge variant={ROLE_BADGE_VARIANT[user.role || ''] || 'secondary'}>
                      {ROLE_LABELS[user.role || ''] || user.role}
                    </Badge>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    <div className="flex justify-end gap-2">
                      <button onClick={() => handleOpenEdit(user)} className="p-1.5 text-gray-400 hover:text-indigo-600 rounded">
                        <Edit className="h-4 w-4" />
                      </button>
                      <button onClick={() => handleOpenDelete(user)} className="p-1.5 text-gray-400 hover:text-red-600 rounded">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <Pagination page={meta.page} limit={meta.limit} total={meta.total} onPageChange={setPage} />
        </div>
      )}

      <UserFormSlideOver
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        initialData={editingUser}
        onSuccess={invalidate}
      />

      <ConfirmDialog
        open={isDeleteOpen}
        onCancel={() => setIsDeleteOpen(false)}
        onConfirm={() => userToDelete && deleteMutation.mutate({ id: userToDelete.id as number })}
        title="Hapus Pengguna"
        variant="danger"
        confirmLabel="Hapus"
        cancelLabel="Batal"
      >
        <p>Anda yakin ingin menghapus <strong>{userToDelete?.full_name}</strong>? Tindakan ini tidak dapat dibatalkan.</p>
      </ConfirmDialog>
    </div>
  );
}

function UserFormSlideOver({
  isOpen,
  onClose,
  initialData,
  onSuccess,
}: {
  isOpen: boolean;
  onClose: () => void;
  initialData: DtoUserResponse | null;
  onSuccess: () => void;
}) {
  const { addToast } = useToast();
  const isEditing = !!initialData;

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<string>('admin_administrasi');

  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        setFullName(initialData.full_name || '');
        setEmail(initialData.email || '');
        setPassword('');
        setRole(initialData.role || 'admin_administrasi');
      } else {
        setFullName('');
        setEmail('');
        setPassword('');
        setRole('admin_administrasi');
      }
    }
  }, [isOpen, initialData]);

  const createMutation = usePostV1Users({
    mutation: {
      onSuccess: () => {
        addToast({ variant: 'success', title: 'Berhasil', message: 'Pengguna berhasil ditambahkan.' });
        onSuccess();
        onClose();
      },
      onError: (error: Error) => {
        const msg = error instanceof ApiError ? error.message : 'Gagal menambahkan pengguna.';
        addToast({ variant: 'error', title: 'Gagal', message: msg });
      },
    },
  });

  const updateMutation = usePutV1UsersId({
    mutation: {
      onSuccess: () => {
        addToast({ variant: 'success', title: 'Berhasil', message: 'Pengguna berhasil diperbarui.' });
        onSuccess();
        onClose();
      },
      onError: (error: Error) => {
        const msg = error instanceof ApiError ? error.message : 'Gagal memperbarui pengguna.';
        addToast({ variant: 'error', title: 'Gagal', message: msg });
      },
    },
  });

  const isPending = createMutation.isPending || updateMutation.isPending;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isEditing && initialData) {
      const data: DtoUpdateUserRequest = {
        full_name: fullName,
        email,
        role: role as any,
        ...(password ? { password } : {}),
      };
      updateMutation.mutate({ id: initialData.id as number, data });
    } else {
      const data: DtoCreateUserRequest = {
        full_name: fullName,
        email,
        password,
        role: role as any,
      };
      createMutation.mutate({ data });
    }
  };

  return (
    <SlideOver
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? 'Edit Pengguna' : 'Tambah Pengguna'}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={isPending}>Batal</Button>
          <Button variant="primary" onClick={handleSubmit} disabled={isPending}>
            {isPending ? 'Menyimpan...' : 'Simpan'}
          </Button>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        <FormField
          id="full_name"
          name="full_name"
          label="Nama Lengkap"
          placeholder="Masukkan nama lengkap"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          required
          minLength={3}
          maxLength={100}
        />
        <FormField
          id="email"
          name="email"
          label="Email"
          type="email"
          placeholder="contoh@email.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <FormField
          id="password"
          name="password"
          label={isEditing ? 'Password (kosongkan jika tidak diubah)' : 'Password'}
          type="password"
          placeholder={isEditing ? 'Kosongkan jika tidak diubah' : 'Minimal 8 karakter'}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required={!isEditing}
          minLength={8}
        />
        <div>
          <label htmlFor="role" className="block text-sm font-medium leading-6 text-gray-900 mb-2">Role</label>
          <select
            id="role"
            name="role"
            value={role}
            onChange={(e) => setRole(e.target.value)}
            className="block w-full rounded-md border-0 py-1.5 text-gray-900 ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-indigo-600 sm:text-sm sm:leading-6"
            required
          >
            {ROLES.map((r) => (
              <option key={r} value={r}>{ROLE_LABELS[r] || r}</option>
            ))}
          </select>
        </div>
      </form>
    </SlideOver>
  );
}
