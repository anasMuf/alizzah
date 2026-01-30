import { createFileRoute } from '@tanstack/react-router'
import {
  Users,
  TrendingUp,
  Wallet,
  AlertCircle,
  Calendar
} from 'lucide-react'
import { StatCard } from '~/modules/dashboard/components/StatCard'
import { DashboardHero } from '~/modules/dashboard/components/DashboardHero'
import { QuickActions } from '~/modules/dashboard/components/QuickActions'
import { RecentActivity } from '~/modules/dashboard/components/RecentActivity'

export const Route = createFileRoute('/')({
  component: DashboardHome,
})

function DashboardHome() {
  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Ringkasan Keuangan</h1>
          <p className="text-slate-500 font-medium">Monitoring arus kas dan administrasi siswa secara real-time.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="bg-white px-4 py-2.5 rounded-xl border border-slate-200 shadow-sm flex items-center gap-2 text-sm font-bold text-slate-600">
            <Calendar size={18} className="text-blue-600" />
            T.A 2025/2026
          </div>
          <button className="bg-blue-600 text-white px-5 py-2.5 rounded-xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-200 font-bold text-sm">
            Unduh Laporan
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Total Penerimaan"
          value="Rp 128.450.000"
          trend="up"
          trendValue="+12.5%"
          icon={TrendingUp}
          color="blue"
        />
        <StatCard
          title="Siswa Terdaftar"
          value="248"
          trend="up"
          trendValue="+4.2%"
          icon={Users}
          color="indigo"
        />
        <StatCard
          title="Tunggakan SPP"
          value="Rp 12.400.000"
          trend="down"
          trendValue="-2.4%"
          icon={AlertCircle}
          color="rose"
        />
        <StatCard
          title="Saldo Kas"
          value="Rp 45.200.000"
          trend="up"
          trendValue="+0.8%"
          icon={Wallet}
          color="emerald"
        />
      </div>

      {/* Main Grid Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <DashboardHero />

          {/* Placeholder for Chart */}
          <div className="bg-white p-6 rounded-[32px] border border-slate-200 shadow-sm h-80 flex flex-col items-center justify-center text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-slate-50 flex items-center justify-center text-slate-300">
              <TrendingUp size={32} />
            </div>
            <div>
              <p className="font-bold text-slate-900">Grafik Arus Kas</p>
              <p className="text-sm text-slate-400">Modul statistik sedang dikalibrasi...</p>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <QuickActions />
          <RecentActivity />
        </div>
      </div>
    </div>
  )
}
