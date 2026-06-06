import { useState, type FormEvent } from 'react';
import { createFileRoute, Link } from '@tanstack/react-router';
import { useAtom } from 'jotai';
import { Plus, Search, UserCircle, Upload, GraduationCap } from 'lucide-react';
import { useGetV1Students } from '../../../../api/endpoints/students/students';
import { usePostV1StudentsIdEnrollments } from '../../../../api/endpoints/student-enrollments/enroll';
import { useGetV1ClassGroups } from '../../../../api/endpoints/class-groups/class-groups';
import { academicYearAtom } from '../../../../store/global';
import { Button } from '../../../../components/atoms/Button';
import { Badge } from '../../../../components/atoms/Badge';
import { EmptyState } from '../../../../components/molecules/EmptyState';
import { Pagination } from '../../../../components/molecules/Pagination';
import { SlideOver } from '../../../../components/molecules/SlideOver';
import { useToast } from '../../../../components/molecules/Toast';
import { useQueryClient } from '@tanstack/react-query';

export const Route = createFileRoute('/_authenticated/administrasi/siswa/')({
  component: SiswaIndexPage,
});

function SiswaIndexPage() {
  const [activeAy] = useAtom(academicYearAtom);
  const { addToast } = useToast();
  const queryClient = useQueryClient();

  // Filters & Pagination
  const [page, setPage] = useState(1);
  const limit = 10;
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [classGroupFilter, setClassGroupFilter] = useState('');

  // Fetch Class Groups for filter + enroll modal
  const { data: cgResponse } = useGetV1ClassGroups({ academic_year_id: activeAy?.id as any }, { query: { enabled: !!activeAy?.id } as any });
  const classGroups = (cgResponse?.data as any)?.data || [];

  // Fetch Students
  const { data: response, isLoading, isError } = useGetV1Students(
    {
      academic_year_id: activeAy?.id as any, page, limit, search,
      status: statusFilter,
      ...(classGroupFilter === '__none__'
        ? { no_class_group: true }
        : { class_group_id: classGroupFilter ? Number(classGroupFilter) : undefined }),
    },
    { query: { enabled: !!activeAy?.id, keepPreviousData: true } as any }
  );

  const students = (response?.data as any)?.data || [];
  const meta = (response?.data as any)?.meta;

  // ─── Enroll Modal ──────────────────────────────────────────────────
  const [enrollStudentId, setEnrollStudentId] = useState<number | null>(null);
  const [enrollStudentName, setEnrollStudentName] = useState('');
  const [enrollClassGroupId, setEnrollClassGroupId] = useState('');
  const [enrollStartDate, setEnrollStartDate] = useState(new Date().toISOString().split('T')[0]);

  const enrollMutation = usePostV1StudentsIdEnrollments();

  const openEnroll = (student: any) => {
    setEnrollStudentId(student.id);
    setEnrollStudentName(student.full_name);
    setEnrollClassGroupId('');
    setEnrollStartDate(new Date().toISOString().split('T')[0]);
  };

  const handleEnroll = (e: FormEvent) => {
    e.preventDefault();
    if (!enrollStudentId || !enrollClassGroupId) return;

    enrollMutation.mutate(
      {
        id: enrollStudentId,
        data: {
          class_group_id: Number(enrollClassGroupId),
          academic_year_id: activeAy?.id || 0,
          enrollment_type: 'new',
          start_date: enrollStartDate,
        },
      },
      {
        onSuccess: () => {
          addToast({ variant: 'success', title: 'Berhasil', message: `${enrollStudentName} berhasil didaftarkan ke rombel.` });
          setEnrollStudentId(null);
          queryClient.invalidateQueries({ queryKey: ['/v1/students'] });
        },
        onError: (err: any) => {
          addToast({ variant: 'error', title: 'Gagal', message: err.message || 'Gagal mendaftarkan siswa.' });
        },
      },
    );
  };

  const handleSearch = (e: FormEvent) => {
    e.preventDefault();
    setSearch(searchInput);
    setPage(1);
  };

  const getStatusBadge = (status: string) => {
    switch (status.toLowerCase()) {
      case 'active': return <Badge variant="success">Aktif</Badge>;
      case 'graduated': return <Badge variant="primary">Lulus</Badge>;
      case 'transferred': return <Badge variant="warning">Pindah</Badge>;
      case 'dropped': return <Badge variant="danger">Keluar</Badge>;
      default: return <Badge variant="secondary">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="sm:flex sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold leading-7 text-gray-900 sm:truncate sm:tracking-tight">Data Siswa</h1>
          <p className="mt-1 text-sm text-gray-500">Kelola data induk siswa, mutasi, dan profil lengkap siswa.</p>
        </div>
        <div className="mt-4 sm:ml-4 sm:mt-0 flex flex-wrap gap-3">
          <Link to="/administrasi/siswa/import">
            <Button variant="secondary" className="flex items-center gap-2">
              <Upload className="h-4 w-4" /> Import Data
            </Button>
          </Link>
          <Link to="/administrasi/siswa/baru">
            <Button className="flex items-center gap-2">
              <Plus className="h-4 w-4" /> Tambah Siswa
            </Button>
          </Link>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-xl shadow-sm ring-1 ring-gray-900/5">
        <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
          <form onSubmit={handleSearch} className="relative w-full sm:max-w-xs">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
              <Search className="h-4 w-4 text-gray-400" />
            </div>
            <input type="text" className="block w-full rounded-md border-0 py-1.5 pl-10 text-gray-900 ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6" placeholder="Cari nama siswa..." value={searchInput} onChange={(e) => { setSearchInput(e.target.value); setSearch(e.target.value); setPage(1); }} />
          </form>
          <div className="flex w-full sm:w-auto gap-4">
            <select className="block w-full rounded-md border-0 py-1.5 pl-3 pr-10 text-gray-900 ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-indigo-600 sm:text-sm sm:leading-6" value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}>
              <option value="">Semua Status</option>
              <option value="active">Aktif</option>
              <option value="graduated">Lulus</option>
              <option value="transferred">Pindah</option>
              <option value="dropped">Keluar</option>
            </select>
            <select className="block w-full rounded-md border-0 py-1.5 pl-3 pr-10 text-gray-900 ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-indigo-600 sm:text-sm sm:leading-6" value={classGroupFilter} onChange={(e) => { setClassGroupFilter(e.target.value); setPage(1); }}>
              <option value="">Semua Rombel</option>
              <option value="__none__">Belum Ada Rombel</option>
              {classGroups.map((cg: any) => (
                <option key={cg.id} value={cg.id}>{cg.name}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Table */}
      {!activeAy ? (
        <EmptyState title="Menunggu Tahun Ajaran" description="Data tahun ajaran sedang dimuat..." />
      ) : isLoading ? (
        <div className="bg-white rounded-xl shadow-sm ring-1 ring-gray-900/5 h-96 animate-pulse p-8">
          <div className="h-8 bg-gray-200 rounded w-full mb-4" /><div className="h-8 bg-gray-200 rounded w-full mb-4" /><div className="h-8 bg-gray-200 rounded w-full mb-4" />
        </div>
      ) : isError ? (
        <div className="bg-red-50 p-4 rounded-md text-red-800">Gagal memuat data siswa.</div>
      ) : students.length === 0 ? (
        <EmptyState title="Tidak ada data siswa" description="Belum ada siswa yang terdaftar atau tidak ada data yang cocok dengan filter." />
      ) : (
        <div className="bg-white rounded-xl shadow-sm ring-1 ring-gray-900/5 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-300">
              <thead className="bg-gray-50">
                <tr>
                  <th className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-6">Siswa</th>
                  <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Rombel Saat Ini</th>
                  <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Status</th>
                  <th className="relative py-3.5 pl-3 pr-4 sm:pr-6"><span className="sr-only">Aksi</span></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {students.map((student: any) => (
                  <tr key={student.id} className="hover:bg-gray-50 transition-colors">
                    <td className="whitespace-nowrap py-4 pl-4 pr-3 sm:pl-6">
                      <div className="flex items-center">
                        <div className="h-10 w-10 flex-shrink-0 text-gray-300">
                          <UserCircle className="h-10 w-10" />
                        </div>
                        <div className="ml-4">
                          <div className="font-medium text-gray-900">{student.full_name}</div>
                          <div className="text-gray-500 text-xs">
                            {student.gender === 'L' ? 'Laki-laki' : 'Perempuan'}
                            {student.is_daycare_only && <span className="ml-2 text-indigo-600 font-medium">(Daycare Saja)</span>}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                      {student.active_enrollment ? student.active_enrollment.class_group.name : <span className="text-amber-600 font-medium">Belum ada rombel</span>}
                    </td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">{getStatusBadge(student.status)}</td>
                    <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6">
                      <div className="flex items-center justify-end gap-2">
                        {!student.active_enrollment && student.status === 'active' && (
                          <button onClick={() => openEnroll(student)} className="text-amber-600 hover:text-amber-800 bg-amber-50 px-3 py-1 rounded-md flex items-center gap-1">
                            <GraduationCap className="h-3.5 w-3.5" /> Daftarkan
                          </button>
                        )}
                        <Link to="/administrasi/siswa/$id/profil" params={{ id: student.id.toString() }} className="text-indigo-600 hover:text-indigo-900 bg-indigo-50 px-3 py-1 rounded-md">
                          Detail
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {meta && <Pagination page={page} limit={limit} total={meta.total} onPageChange={setPage} />}
        </div>
      )}

      {/* Enroll Modal */}
      <SlideOver isOpen={enrollStudentId !== null} onClose={() => setEnrollStudentId(null)} title="Daftarkan Siswa ke Rombel">
        <form onSubmit={handleEnroll} className="space-y-4">
          <div>
            <p className="text-sm text-gray-600 mb-1">Siswa</p>
            <p className="font-semibold text-gray-900">{enrollStudentName}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Rombel Tujuan</label>
            <select className="block w-full rounded-md border-0 py-2 pl-3 pr-10 text-gray-900 ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-indigo-600 sm:text-sm" value={enrollClassGroupId} onChange={(e) => setEnrollClassGroupId(e.target.value)} required>
              <option value="">Pilih rombel...</option>
              {classGroups.map((cg: any) => (
                <option key={cg.id} value={cg.id}>{cg.name} ({cg.level})</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tanggal Mulai</label>
            <input type="date" className="block w-full rounded-md border-0 py-2 px-3 text-gray-900 ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-indigo-600 sm:text-sm" value={enrollStartDate} onChange={(e) => setEnrollStartDate(e.target.value)} required />
          </div>
          <div className="pt-4 border-t border-gray-200">
            <Button type="submit" className="w-full" disabled={enrollMutation.isPending}>
              {enrollMutation.isPending ? 'Mendaftarkan...' : 'Daftarkan ke Rombel'}
            </Button>
          </div>
        </form>
      </SlideOver>
    </div>
  );
}
