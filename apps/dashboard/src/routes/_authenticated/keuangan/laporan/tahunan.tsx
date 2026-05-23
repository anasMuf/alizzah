import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_authenticated/keuangan/laporan/tahunan')({
  component: KeuanganLaporanTahunanComponent,
})

function KeuanganLaporanTahunanComponent() {
  return <div className="p-4 bg-white rounded shadow">Halaman keuangan/laporan/tahunan</div>
}
