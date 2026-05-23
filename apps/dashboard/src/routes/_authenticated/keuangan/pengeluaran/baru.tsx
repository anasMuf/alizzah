import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_authenticated/keuangan/pengeluaran/baru')({
  component: KeuanganPengeluaranBaruComponent,
})

function KeuanganPengeluaranBaruComponent() {
  return <div className="p-4 bg-white rounded shadow">Halaman keuangan/pengeluaran/baru</div>
}
