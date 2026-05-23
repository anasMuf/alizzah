import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_authenticated/keuangan/pengeluaran/')({
  component: KeuanganPengeluaranComponent,
})

function KeuanganPengeluaranComponent() {
  return <div className="p-4 bg-white rounded shadow">Halaman keuangan/pengeluaran/index</div>
}
