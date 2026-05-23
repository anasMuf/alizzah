import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_authenticated/keuangan/laporan/siswa')({
  component: KeuanganLaporanSiswaComponent,
})

function KeuanganLaporanSiswaComponent() {
  return <div className="p-4 bg-white rounded shadow">Halaman keuangan/laporan/siswa</div>
}
