import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_authenticated/keuangan/tabungan/')({
  component: KeuanganTabunganComponent,
})

function KeuanganTabunganComponent() {
  return <div className="p-4 bg-white rounded shadow">Halaman keuangan/tabungan/index</div>
}
