import { createFileRoute, Outlet, Link, useRouterState, useNavigate } from '@tanstack/react-router';
import { useGetV1StudentsId } from '../../../../api/endpoints/students/students';
import { ChevronRight, UserCircle, GraduationCap, Trophy, Bus, Percent, Wallet, User } from 'lucide-react';
import { Badge } from '../../../../components/atoms/Badge';

export const Route = createFileRoute('/_authenticated/administrasi/siswa/$id')({
  component: StudentLayout,
});

function StudentLayout() {
  const { id } = Route.useParams();
  const studentId = Number(id);
  // Active path to determine which tab is active (useRouterState is reactive, unlike useRouter)
  const currentPath = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();

  const { data: response, isLoading, isError } = useGetV1StudentsId(studentId);
  const student = (response?.data as any)?.data;

  if (isLoading) {
    return <div className="p-8 animate-pulse bg-white rounded-xl shadow-sm h-64 max-w-5xl mx-auto mt-6"></div>;
  }

  if (isError || !student) {
    return <div className="p-8 bg-red-50 text-red-800 rounded-xl max-w-5xl mx-auto mt-6">Data siswa tidak ditemukan.</div>;
  }

  const getStatusBadge = (status: string) => {
    switch (status.toLowerCase()) {
      case 'active': return <Badge variant="success">Aktif</Badge>;
      case 'graduated': return <Badge variant="primary">Lulus</Badge>;
      case 'transferred': return <Badge variant="warning">Pindah</Badge>;
      case 'dropped': return <Badge variant="danger">Keluar</Badge>;
      default: return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const tabs = [
    { name: 'Profil', href: `/administrasi/siswa/${id}/profil`, icon: User, show: true },
    { name: 'Akademik', href: `/administrasi/siswa/${id}/akademik`, icon: GraduationCap, show: !student.is_daycare_only },
    { name: 'Ekskul', href: `/administrasi/siswa/${id}/ekskul`, icon: Trophy, show: true },
    { name: 'Fasilitas', href: `/administrasi/siswa/${id}/fasilitas`, icon: Bus, show: true },
    { name: 'Dispensasi', href: `/administrasi/siswa/${id}/dispensasi`, icon: Percent, show: true },
    { name: 'Keuangan', href: `/administrasi/siswa/${id}/keuangan`, icon: Wallet, show: true },
  ];

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Breadcrumb */}
      <nav className="flex" aria-label="Breadcrumb">
        <ol role="list" className="flex items-center space-x-2">
          <li><Link to="/administrasi/siswa" className="text-gray-400 hover:text-gray-500">Administrasi</Link></li>
          <li>
            <div className="flex items-center">
              <ChevronRight className="h-5 w-5 flex-shrink-0 text-gray-400" aria-hidden="true" />
              <Link to="/administrasi/siswa" className="ml-2 text-sm font-medium text-gray-500 hover:text-gray-700">Siswa</Link>
            </div>
          </li>
          <li>
            <div className="flex items-center">
              <ChevronRight className="h-5 w-5 flex-shrink-0 text-gray-400" aria-hidden="true" />
              <span className="ml-2 text-sm font-medium text-gray-900" aria-current="page">{student.full_name}</span>
            </div>
          </li>
        </ol>
      </nav>

      {/* Header Profile */}
      <div className="bg-white rounded-xl shadow-sm ring-1 ring-gray-900/5 overflow-hidden">
        <div className="px-4 py-5 sm:px-6 sm:py-8 flex flex-col sm:flex-row items-center gap-6 border-b border-gray-200">
          {student.photo_url ? (
            <img className="h-24 w-24 rounded-full object-cover shadow-sm ring-4 ring-white" src={student.photo_url} alt="" />
          ) : (
            <UserCircle className="h-24 w-24 text-gray-300" />
          )}
          
          <div className="text-center sm:text-left flex-1">
            <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl sm:tracking-tight mb-2">
              {student.full_name}
            </h1>
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 text-sm text-gray-500">
              <span className="flex items-center gap-2 justify-center sm:justify-start">
                {getStatusBadge(student.status)}
              </span>
              <span className="hidden sm:block">&bull;</span>
              <span>{student.gender === 'L' ? 'Laki-laki' : 'Perempuan'}</span>
              {student.active_enrollment && (
                <>
                  <span className="hidden sm:block">&bull;</span>
                  <span>Rombel: <strong>{student.active_enrollment.class_group.name}</strong></span>
                </>
              )}
              {student.is_daycare_only && (
                <>
                  <span className="hidden sm:block">&bull;</span>
                  <span className="text-indigo-600 font-medium">Siswa Daycare Saja</span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div>
          <div className="sm:hidden">
            <label htmlFor="tabs" className="sr-only">Select a tab</label>
            <select
              id="tabs"
              name="tabs"
              className="block w-full rounded-md border-none focus:ring-0 focus:ring-indigo-500 py-3 pl-3 pr-10 text-base sm:text-sm"
              value={currentPath}
              onChange={(e) => navigate({ to: e.target.value })}
            >
              {tabs.filter(t => t.show).map((tab) => (
                <option key={tab.name} value={tab.href}>{tab.name}</option>
              ))}
            </select>
          </div>
          <div className="hidden sm:block">
            <nav className="flex divide-x divide-gray-200" aria-label="Tabs">
              {tabs.filter(t => t.show).map((tab) => {
                const normalizedPath = currentPath.replace(/\/+$/, '');
                const normalizedHref = tab.href.replace(/\/+$/, '');
                const isActive = normalizedPath === normalizedHref || (normalizedPath === `/administrasi/siswa/${id}` && tab.name === 'Profil');
                return (
                  <Link
                    key={tab.name}
                    to={tab.href}
                    className={`
                      group relative min-w-0 flex-1 overflow-hidden py-4 px-4 text-center text-sm font-medium hover:bg-gray-50 focus:z-10
                      ${isActive ? 'text-indigo-700 bg-indigo-50' : 'text-gray-500 hover:text-gray-700 bg-white'}
                    `}
                    aria-current={isActive ? 'page' : undefined}
                  >
                    <div className="flex items-center justify-center gap-2">
                      <tab.icon className={`h-5 w-5 ${isActive ? 'text-indigo-600' : 'text-gray-400 group-hover:text-gray-500'}`} />
                      <span>{tab.name}</span>
                    </div>
                    <span
                      aria-hidden="true"
                      className={`absolute inset-x-0 bottom-0 h-0.5 ${isActive ? 'bg-indigo-500' : 'bg-transparent'}`}
                    />
                  </Link>
                );
              })}
            </nav>
          </div>
        </div>
      </div>

      {/* Tab Content */}
      <div className="mt-6">
        <Outlet />
      </div>
    </div>
  );
}
