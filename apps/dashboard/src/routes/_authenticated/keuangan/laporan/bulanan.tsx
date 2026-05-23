import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_authenticated/keuangan/laporan/bulanan')({
  component: KeuanganLaporanBulananComponent,
})

function KeuanganLaporanBulananComponent() {
  return <div className="p-4 bg-white rounded shadow">Halaman keuangan/laporan/bulanan</div>
}
