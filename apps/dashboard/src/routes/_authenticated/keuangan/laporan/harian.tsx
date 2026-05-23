import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_authenticated/keuangan/laporan/harian')({
  component: KeuanganLaporanHarianComponent,
})

function KeuanganLaporanHarianComponent() {
  return <div className="p-4 bg-white rounded shadow">Halaman keuangan/laporan/harian</div>
}
