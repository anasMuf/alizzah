import { createFileRoute, Link } from '@tanstack/react-router'

export const Route = createFileRoute('/')({
  component: Home,
})

function Home() {
  return (
    <div className="space-y-10 py-10">
      <section className="text-center space-y-4">
        <h1 className="text-4xl md:text-6xl font-extrabold text-slate-900 tracking-tight">
          Sistem Informasi <span className="text-blue-600">Keuangan</span>
        </h1>
        <p className="text-slate-500 text-lg md:text-xl max-w-2xl mx-auto">
          Solusi terpadu untuk pengelolaan keuangan PAUD Unggulan Alizzah yang transparan, akurat, dan efisien.
        </p>
      </section>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {[
          {
            title: 'Master Data',
            desc: 'Kelola data tahun ajaran, jenjang, dan referensi dasar lainnya.',
            link: '/master/tahun-ajaran',
            icon: 'M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4',
            color: 'blue'
          },
          {
            title: 'Manajemen Siswa',
            desc: 'Monitoring tagihan, pembayaran, dan tunggakan siswa secara real-time.',
            link: '#',
            icon: 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z',
            color: 'indigo'
          },
          {
            title: 'Laporan Keuangan',
            desc: 'Hasilkan laporan neraca, arus kas, dan rekapitulasi harian otomatis.',
            link: '#',
            icon: 'M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z',
            color: 'emerald'
          }
        ].map((item, i) => (
          <Link
            key={i}
            to={item.link as any}
            className="group block p-8 bg-white rounded-3xl border border-slate-200 shadow-sm hover:shadow-xl hover:border-blue-200 transition-all duration-300"
          >
            <div className={`w-14 h-14 rounded-2xl bg-${item.color}-50 flex items-center justify-center text-${item.color}-600 mb-6 group-hover:scale-110 transition-transform duration-300`}>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={item.icon} />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-slate-900 mb-3 group-hover:text-blue-600 transition-colors">{item.title}</h3>
            <p className="text-slate-500 leading-relaxed text-sm">{item.desc}</p>
          </Link>
        ))}
      </div>
    </div>
  )
}
