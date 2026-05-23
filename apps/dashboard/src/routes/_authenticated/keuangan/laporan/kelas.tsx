import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_authenticated/keuangan/laporan/kelas')({
  component: KeuanganLaporanKelasComponent,
})

function KeuanganLaporanKelasComponent() {
  return <div className="p-4 bg-white rounded shadow">Halaman keuangan/laporan/kelas</div>
}
