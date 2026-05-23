import { useState } from 'react';
import { createFileRoute, Link } from '@tanstack/react-router';
import { useAtom } from 'jotai';
import { Plus, Search, UserCircle, Upload } from 'lucide-react';
import { useGetV1Students } from '../../../../api/endpoints/students/students';
import { useGetV1ClassGroups } from '../../../../api/endpoints/class-groups/class-groups';
import { academicYearAtom } from '../../../../store/global';
import { Button } from '../../../../components/atoms/Button';
import { Badge } from '../../../../components/atoms/Badge';
import { EmptyState } from '../../../../components/molecules/EmptyState';

export const Route = createFileRoute('/_authenticated/administrasi/siswa/')({
  component: SiswaIndexPage,
});

function SiswaIndexPage() {
  const [activeAy] = useAtom(academicYearAtom);

  // Filters & Pagination
  const [page, setPage] = useState(1);
  const limit = 10;
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState(''); // for debounce
  const [statusFilter, setStatusFilter] = useState('');
  const [classGroupFilter, setClassGroupFilter] = useState('');

  // Fetch Class Groups for filter dropdown
  const { data: cgResponse } = useGetV1ClassGroups({ academic_year_id: activeAy?.id as any }, { query: { enabled: !!activeAy?.id } as any });
  const classGroups = (cgResponse?.data as any)?.data || [];

  // Fetch Students
  const { data: response, isLoading, isError } = useGetV1Students(
    { 
      academic_year_id: activeAy?.id as any,
      page,
      limit,
      search,
      status: statusFilter,
      class_group_id: classGroupFilter ? Number(classGroupFilter) : undefined,
    },
    { query: { enabled: !!activeAy?.id, keepPreviousData: true } as any }
  );

  const students = (response?.data as any)?.data || [];
  const meta = (response?.data as any)?.meta;

  const handleSearch = (e: React.FormEvent) => {
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
          <h1 className="text-2xl font-bold leading-7 text-gray-900 sm:truncate sm:tracking-tight">
            Data Siswa
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Kelola data induk siswa, mutasi, dan profil lengkap siswa.
          </p>
        </div>
        <div className="mt-4 sm:ml-4 sm:mt-0 flex flex-wrap gap-3">
          <Link to="/administrasi/siswa/import">
            <Button variant="secondary" className="flex items-center gap-2">
              <Upload className="h-4 w-4" />
              Import Data
            </Button>
          </Link>
          <Link to="/administrasi/siswa/baru">
            <Button className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Tambah Siswa
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
            <input
              type="text"
              name="search"
              id="search"
              className="block w-full rounded-md border-0 py-1.5 pl-10 text-gray-900 ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
              placeholder="Cari nama siswa..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
            />
          </form>

          <div className="flex w-full sm:w-auto gap-4">
            <select
              className="block w-full rounded-md border-0 py-1.5 pl-3 pr-10 text-gray-900 ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-indigo-600 sm:text-sm sm:leading-6"
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
            >
              <option value="">Semua Status</option>
              <option value="active">Aktif</option>
              <option value="graduated">Lulus</option>
              <option value="transferred">Pindah</option>
              <option value="dropped">Keluar</option>
            </select>

            <select
              className="block w-full rounded-md border-0 py-1.5 pl-3 pr-10 text-gray-900 ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-indigo-600 sm:text-sm sm:leading-6"
              value={classGroupFilter}
              onChange={(e) => {
                setClassGroupFilter(e.target.value);
                setPage(1);
              }}
            >
              <option value="">Semua Rombel</option>
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
          <div className="h-8 bg-gray-200 rounded w-full mb-4"></div>
          <div className="h-8 bg-gray-200 rounded w-full mb-4"></div>
          <div className="h-8 bg-gray-200 rounded w-full mb-4"></div>
        </div>
      ) : isError ? (
        <div className="bg-red-50 p-4 rounded-md text-red-800">
          Gagal memuat data siswa.
        </div>
      ) : students.length === 0 ? (
        <EmptyState 
          title="Tidak ada data siswa" 
          description="Belum ada siswa yang terdaftar atau tidak ada data yang cocok dengan filter."
        />
      ) : (
        <div className="bg-white rounded-xl shadow-sm ring-1 ring-gray-900/5 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-300">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-6">Siswa</th>
                  <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Rombel Saat Ini</th>
                  <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Status</th>
                  <th scope="col" className="relative py-3.5 pl-3 pr-4 sm:pr-6">
                    <span className="sr-only">Aksi</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {students.map((student: any) => (
                  <tr key={student.id} className="hover:bg-gray-50 transition-colors">
                    <td className="whitespace-nowrap py-4 pl-4 pr-3 sm:pl-6">
                      <div className="flex items-center">
                        {student.photo_url ? (
                          <div className="h-10 w-10 flex-shrink-0">
                            <img className="h-10 w-10 rounded-full object-cover" src={student.photo_url} alt="" />
                          </div>
                        ) : (
                          <div className="h-10 w-10 flex-shrink-0 text-gray-300">
                            <UserCircle className="h-10 w-10" />
                          </div>
                        )}
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
                      {student.current_enrollment ? student.current_enrollment.class_group.name : '-'}
                    </td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                      {getStatusBadge(student.status)}
                    </td>
                    <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6">
                      <Link
                        to="/administrasi/siswa/$id/profil"
                        params={{ id: student.id.toString() }}
                        className="text-indigo-600 hover:text-indigo-900 bg-indigo-50 px-3 py-1 rounded-md"
                      >
                        Detail<span className="sr-only">, {student.full_name}</span>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {meta && meta.total_pages > 1 && (
            <div className="flex items-center justify-between border-t border-gray-200 bg-white px-4 py-3 sm:px-6">
              <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm text-gray-700">
                    Menampilkan <span className="font-medium">{(page - 1) * limit + 1}</span> hingga <span className="font-medium">{Math.min(page * limit, meta.total_data)}</span> dari <span className="font-medium">{meta.total_data}</span> hasil
                  </p>
                </div>
                <div>
                  <nav className="isolate inline-flex -space-x-px rounded-md shadow-sm" aria-label="Pagination">
                    <button
                      onClick={() => setPage(Math.max(1, page - 1))}
                      disabled={page === 1}
                      className="relative inline-flex items-center rounded-l-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50"
                    >
                      <span className="sr-only">Previous</span>
                      &laquo;
                    </button>
                    {/* Simplified pagination, just showing current page */}
                    <span className="relative inline-flex items-center px-4 py-2 text-sm font-semibold text-gray-900 ring-1 ring-inset ring-gray-300 focus:z-20 focus:outline-offset-0">
                      Halaman {page} dari {meta.total_pages}
                    </span>
                    <button
                      onClick={() => setPage(Math.min(meta.total_pages, page + 1))}
                      disabled={page === meta.total_pages}
                      className="relative inline-flex items-center rounded-r-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50"
                    >
                      <span className="sr-only">Next</span>
                      &raquo;
                    </button>
                  </nav>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
