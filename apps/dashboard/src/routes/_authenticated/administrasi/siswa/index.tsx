import { useState, type FormEvent } from 'react';
import { createFileRoute, Link } from '@tanstack/react-router';
import { useAtom } from 'jotai';
import { Plus, Search, UserCircle, Upload, GraduationCap, X } from 'lucide-react';
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
import { useQueryClient, useMutation } from '@tanstack/react-query';
import { customInstance } from '../../../../api/mutator/custom-instance';

export const Route = createFileRoute('/_authenticated/administrasi/siswa/')({
  component: SiswaIndexPage,
});

function SiswaIndexPage() {
  const [activeAy] = useAtom(academicYearAtom);
  const { addToast } = useToast();
  const queryClient = useQueryClient();

  const [page, setPage] = useState(1);
  const limit = 10;
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [classGroupFilter, setClassGroupFilter] = useState('');

  const { data: cgResponse } = useGetV1ClassGroups({ academic_year_id: activeAy?.id as any }, { query: { enabled: !!activeAy?.id } as any });
  const classGroups = (cgResponse?.data as any)?.data || [];

  const { data: response, isLoading, isError } = useGetV1Students(
    { academic_year_id: activeAy?.id as any, page, limit, search, status: statusFilter,
      ...(classGroupFilter === '__none__' ? { no_class_group: true } : { class_group_id: classGroupFilter ? Number(classGroupFilter) : undefined }),
    },
    { query: { enabled: !!activeAy?.id, keepPreviousData: true } as any }
  );
  const students = (response?.data as any)?.data || [];
  const meta = (response?.data as any)?.meta;

  // ─── Bulk Selection ───────────────────────────────────────────────
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const toggleSelect = (id: number) => setSelected(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const toggleAll = () => {
    if (selected.size === students.length) { setSelected(new Set()); return; }
    setSelected(new Set(students.filter((s: any) => !s.active_enrollment && s.status === 'active').map((s: any) => s.id)));
  };

  // ─── Enroll Modal (single + bulk) ──────────────────────────────────
  const [showEnrollModal, setShowEnrollModal] = useState(false);
  const [enrollStudentId, setEnrollStudentId] = useState<number | null>(null);
  const [enrollClassGroupId, setEnrollClassGroupId] = useState('');
  const [enrollStartDate, setEnrollStartDate] = useState(new Date().toISOString().split('T')[0]);
  const isBulk = enrollStudentId === null; // null = bulk mode

  const enrollMutation = usePostV1StudentsIdEnrollments();
  const batchMutation = useMutation({
    mutationFn: async (data: { student_ids: number[]; class_group_id: number; academic_year_id: number; enrollment_type: string; start_date: string }) => {
      const resp = await customInstance<any>('/v1/students/enrollments/batch', { method: 'POST', body: JSON.stringify(data) });
      return resp.data;
    },
  });

  const openEnroll = (student: any) => {
    setEnrollStudentId(student.id);
    setEnrollClassGroupId('');
    setEnrollStartDate(new Date().toISOString().split('T')[0]);
    setShowEnrollModal(true);
  };

  const openBulkEnroll = () => {
    setEnrollStudentId(null);
    setEnrollClassGroupId('');
    setEnrollStartDate(new Date().toISOString().split('T')[0]);
    setShowEnrollModal(true);
  };

  const handleEnroll = (e: FormEvent) => {
    e.preventDefault();
    if (!enrollClassGroupId) return;

    if (isBulk) {
      const ids = Array.from(selected);
      if (ids.length === 0) return;
      batchMutation.mutate(
        { student_ids: ids, class_group_id: Number(enrollClassGroupId), academic_year_id: activeAy?.id || 0, enrollment_type: 'new', start_date: enrollStartDate },
        {
          onSuccess: (res: any) => {
            const data = res?.data || res;
            addToast({ variant: 'success', title: 'Berhasil', message: `${data?.success || ids.length} siswa berhasil didaftarkan.` });
            setShowEnrollModal(false); setSelected(new Set());
            queryClient.invalidateQueries({ queryKey: ['/v1/students'] });
          },
          onError: (err: any) => addToast({ variant: 'error', title: 'Gagal', message: err.message }),
        },
      );
    } else {
      if (!enrollStudentId) return;
      enrollMutation.mutate(
        { id: enrollStudentId, data: { class_group_id: Number(enrollClassGroupId), academic_year_id: activeAy?.id || 0, enrollment_type: 'new', start_date: enrollStartDate } },
        {
          onSuccess: () => {
            addToast({ variant: 'success', title: 'Berhasil', message: 'Siswa berhasil didaftarkan.' });
            setShowEnrollModal(false); setEnrollStudentId(null);
            queryClient.invalidateQueries({ queryKey: ['/v1/students'] });
          },
          onError: (err: any) => addToast({ variant: 'error', title: 'Gagal', message: err.message }),
        },
      );
    }
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

  const isPending = enrollMutation.isPending || batchMutation.isPending;

  return (
    <div className="space-y-6">
      <div className="sm:flex sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Data Siswa</h1>
          <p className="mt-1 text-sm text-gray-500">Kelola data induk siswa, mutasi, dan profil lengkap siswa.</p>
        </div>
        <div className="mt-4 sm:mt-0 flex gap-3">
          <Link to="/administrasi/siswa/import"><Button variant="secondary"><Upload className="h-4 w-4" /> Import</Button></Link>
          <Link to="/administrasi/siswa/baru"><Button><Plus className="h-4 w-4" /> Tambah</Button></Link>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-xl shadow-sm ring-1 ring-gray-900/5">
        <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
          <div className="relative w-full sm:max-w-xs">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3"><Search className="h-4 w-4 text-gray-400" /></div>
            <input type="text" className="block w-full rounded-md border-0 py-1.5 pl-10 text-gray-900 ring-1 ring-gray-300 focus:ring-2 focus:ring-indigo-600 sm:text-sm" placeholder="Cari siswa..." value={searchInput} onChange={(e) => { setSearchInput(e.target.value); setSearch(e.target.value); setPage(1); }} />
          </div>
          <div className="flex w-full sm:w-auto gap-4">
            <select className="block w-full rounded-md border-0 py-1.5 pl-3 pr-10 text-gray-900 ring-1 ring-gray-300 focus:ring-2 focus:ring-indigo-600 sm:text-sm" value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}>
              <option value="">Semua Status</option>
              <option value="active">Aktif</option><option value="graduated">Lulus</option><option value="transferred">Pindah</option><option value="dropped">Keluar</option>
            </select>
            <select className="block w-full rounded-md border-0 py-1.5 pl-3 pr-10 text-gray-900 ring-1 ring-gray-300 focus:ring-2 focus:ring-indigo-600 sm:text-sm" value={classGroupFilter} onChange={(e) => { setClassGroupFilter(e.target.value); setPage(1); }}>
              <option value="">Semua Rombel</option><option value="__none__">Belum Ada Rombel</option>
              {classGroups.map((cg: any) => <option key={cg.id} value={cg.id}>{cg.name}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* Bulk Action Bar */}
      {selected.size > 0 && (
        <div className="bg-indigo-50 border border-indigo-200 rounded-xl px-4 py-3 flex items-center justify-between">
          <span className="text-sm text-indigo-800">{selected.size} siswa dipilih</span>
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" onClick={() => setSelected(new Set())}><X className="h-4 w-4 mr-1" /> Batal</Button>
            <Button size="sm" onClick={openBulkEnroll}><GraduationCap className="h-4 w-4 mr-1" /> Daftarkan ke Rombel</Button>
          </div>
        </div>
      )}

      {/* Table */}
      {!activeAy ? <EmptyState title="Menunggu Tahun Ajaran" /> :
       isLoading ? <div className="bg-white rounded-xl shadow-sm h-96 animate-pulse p-8"><div className="h-8 bg-gray-200 rounded w-full mb-4" /><div className="h-8 bg-gray-200 rounded w-full mb-4" /></div> :
       isError ? <div className="bg-red-50 p-4 rounded-md text-red-800">Gagal memuat data.</div> :
       students.length === 0 ? <EmptyState title="Tidak ada data" /> : (
        <div className="bg-white rounded-xl shadow-sm ring-1 ring-gray-900/5 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-300">
              <thead className="bg-gray-50">
                <tr>
                  <th className="py-3.5 pl-4 pr-3 sm:pl-6 w-10">
                    <input type="checkbox" className="h-4 w-4 rounded border-gray-300" checked={selected.size > 0 && selected.size === students.length} onChange={toggleAll} />
                  </th>
                  <th className="py-3.5 pr-3 text-left text-sm font-semibold text-gray-900">Siswa</th>
                  <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Rombel</th>
                  <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Status</th>
                  <th className="relative py-3.5 pl-3 pr-4 sm:pr-6"><span className="sr-only">Aksi</span></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {students.map((student: any) => {
                  const canEnroll = !student.active_enrollment && student.status === 'active';
                  return (
                  <tr key={student.id} className="hover:bg-gray-50">
                    <td className="py-4 pl-4 sm:pl-6">
                      <input type="checkbox" className="h-4 w-4 rounded border-gray-300" checked={selected.has(student.id)} onChange={() => toggleSelect(student.id)} />
                    </td>
                    <td className="py-4 pr-3">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 text-gray-300"><UserCircle className="h-10 w-10" /></div>
                        <div>
                          <div className="font-medium text-gray-900">{student.full_name}</div>
                          <div className="text-gray-500 text-xs">{student.gender === 'L' ? 'Laki-laki' : 'Perempuan'}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-4 text-sm text-gray-500">
                      {student.active_enrollment ? student.active_enrollment.class_group.name : <span className="text-amber-600 font-medium">Belum ada rombel</span>}
                    </td>
                    <td className="px-3 py-4 text-sm">{getStatusBadge(student.status)}</td>
                    <td className="py-4 pl-3 pr-4 sm:pr-6 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {canEnroll && <button onClick={() => openEnroll(student)} className="text-amber-600 hover:text-amber-800 bg-amber-50 px-3 py-1 rounded-md text-sm"><GraduationCap className="h-3.5 w-3.5 inline mr-1" />Daftarkan</button>}
                        <Link to="/administrasi/siswa/$id/profil" params={{ id: student.id.toString() }} className="text-indigo-600 hover:text-indigo-900 bg-indigo-50 px-3 py-1 rounded-md text-sm">Detail</Link>
                      </div>
                    </td>
                  </tr>
                )})}
              </tbody>
            </table>
          </div>
          {meta && <Pagination page={page} limit={limit} total={meta.total} onPageChange={setPage} />}
        </div>
      )}

      {/* Enroll Modal (single/bulk) */}
      <SlideOver isOpen={showEnrollModal} onClose={() => { setShowEnrollModal(false); setEnrollStudentId(null); }} title={isBulk ? `Daftarkan ${selected.size} Siswa` : 'Daftarkan Siswa'}>
        <form onSubmit={handleEnroll} className="space-y-4">
          {isBulk ? (
            <p className="text-sm text-gray-600">{selected.size} siswa akan didaftarkan ke rombel yang sama.</p>
          ) : (
            <div><p className="text-sm text-gray-600 mb-1">Siswa</p><p className="font-semibold text-gray-900">{students.find((s: any) => s.id === enrollStudentId)?.full_name}</p></div>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Rombel Tujuan</label>
            <select className="block w-full rounded-md border-0 py-2 pl-3 pr-10 text-gray-900 ring-1 ring-gray-300 focus:ring-2 focus:ring-indigo-600 sm:text-sm" value={enrollClassGroupId} onChange={(e) => setEnrollClassGroupId(e.target.value)} required>
              <option value="">Pilih rombel...</option>
              {classGroups.map((cg: any) => <option key={cg.id} value={cg.id}>{cg.name} ({cg.level})</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tanggal Mulai</label>
            <input type="date" className="block w-full rounded-md border-0 py-2 px-3 text-gray-900 ring-1 ring-gray-300 focus:ring-2 focus:ring-indigo-600 sm:text-sm" value={enrollStartDate} onChange={(e) => setEnrollStartDate(e.target.value)} required />
          </div>
          <div className="pt-4 border-t border-gray-200">
            <Button type="submit" className="w-full" disabled={isPending}>
              {isPending ? 'Mendaftarkan...' : isBulk ? `Daftarkan ${selected.size} Siswa` : 'Daftarkan ke Rombel'}
            </Button>
          </div>
        </form>
      </SlideOver>
    </div>
  );
}
