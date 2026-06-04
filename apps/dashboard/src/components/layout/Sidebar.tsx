import { Link } from '@tanstack/react-router'
import {
  LayoutDashboard,
  Users,
  BookOpen,
  CircleDollarSign,
  Calendar,
  Layers,
  Baby,
  RefreshCw,
  FileText,
  CreditCard,
  PiggyBank,
  TrendingDown,
  TrendingUp,
  FolderTree,
  Vault,
  BarChart3,
  UserCog,
  Tags,
} from 'lucide-react'
import { twMerge } from 'tailwind-merge'
import { useAuth } from '../../features/auth/AuthContext'
import { AcademicYearSelector } from './AcademicYearSelector'

interface SidebarProps {
  isOpen: boolean
}

export function Sidebar({ isOpen }: SidebarProps) {
  const { user } = useAuth()
  const role = user?.role || localStorage.getItem('alizzah_role') || ''

  const isSuperAdmin = role === 'superadmin'
  const isAdminAdministrasi = role === 'admin_administrasi' || isSuperAdmin
  const isAdminKeuangan = role === 'admin_keuangan' || isSuperAdmin
  const isKepsekOrYayasan = role === 'kepala_sekolah' || role === 'yayasan'

  return (
    <aside
      className={twMerge(
        'fixed inset-y-0 left-0 z-50 w-64 transform flex-col bg-white border-r border-gray-200 transition-transform duration-300 ease-in-out lg:static lg:translate-x-0 print:hidden',
        isOpen ? 'translate-x-0' : '-translate-x-full'
      )}
    >
      <div className="flex h-16 items-center px-6 border-b border-gray-200">
        <h1 className="text-xl font-bold text-gray-900">Alizzah Manajemen</h1>
      </div>

      <div className="flex flex-col flex-1 overflow-y-auto">
        <div className="p-4 border-b border-gray-200">
          <AcademicYearSelector />
        </div>

        <nav className="flex-1 space-y-1 px-3 py-4">
          <NavLink to="/" icon={LayoutDashboard} exact>
            Dashboard
          </NavLink>

          {(isAdminAdministrasi) && (
            <div className="pt-4">
              <p className="px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                Administrasi
              </p>
              <NavLink to="/administrasi/tahun-ajaran" icon={Calendar}>Tahun Ajaran</NavLink>
              <NavLink to="/administrasi/rombel" icon={Layers}>Rombel</NavLink>
              <NavLink to="/administrasi/siswa" icon={Users}>Siswa</NavLink>
              <NavLink to="/administrasi/ekskul" icon={BookOpen}>Ekstrakurikuler</NavLink>
              <NavLink to="/administrasi/daycare" icon={Baby}>Daycare</NavLink>
              <NavLink to="/administrasi/siklus" icon={RefreshCw}>Siklus Akademik</NavLink>
            </div>
          )}

          {(isAdminKeuangan || isKepsekOrYayasan) && (
            <div className="pt-4">
              <p className="px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                Keuangan
              </p>
              <NavLink to="/keuangan" icon={CircleDollarSign} exact>Overview</NavLink>

              {isAdminKeuangan && (
                <>
                  <NavLink to="/keuangan/tagihan" icon={FileText}>Tagihan</NavLink>
                  <NavLink to="/keuangan/pembayaran" icon={CreditCard}>Pembayaran</NavLink>
                  <NavLink to="/keuangan/tabungan" icon={PiggyBank}>Tabungan</NavLink>
                  <NavLink to="/keuangan/penerimaan" icon={TrendingUp}>Penerimaan</NavLink>
                  <NavLink to="/keuangan/pengeluaran" icon={TrendingDown} exact>Pengeluaran</NavLink>
                  <NavLink to="/keuangan/pengeluaran/kategori" icon={FolderTree}>Kategori Pengeluaran</NavLink>
                  <NavLink to="/keuangan/kas" icon={Vault}>Kas & Berangkas</NavLink>
                </>
              )}

              <NavLink to="/keuangan/laporan" icon={BarChart3}>Laporan</NavLink>
            </div>
          )}

          {isSuperAdmin && (
            <div className="pt-4">
              <p className="px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                Pengaturan
              </p>
              <NavLink to="/pengaturan/pengguna" icon={UserCog}>Pengguna</NavLink>
              <NavLink to="/pengaturan/tarif" icon={Tags}>Tarif</NavLink>
            </div>
          )}
        </nav>
      </div>
    </aside>
  )
}

function NavLink({ to, icon: Icon, children, exact }: { to: string; icon: React.ElementType; children: React.ReactNode; exact?: boolean }) {
  return (
    <Link
      to={to}
      activeOptions={exact ? { exact: true } : undefined}
      className="group flex items-center px-3 py-2 text-sm font-medium rounded-md text-gray-700 hover:text-indigo-600 hover:bg-gray-50 [&.active]:bg-indigo-50 [&.active]:text-indigo-600 transition-colors"
    >
      <Icon className="mr-3 flex-shrink-0 h-5 w-5 text-gray-400 group-hover:text-indigo-600 group-[.active]:text-indigo-600 transition-colors" />
      {children}
    </Link>
  )
}
