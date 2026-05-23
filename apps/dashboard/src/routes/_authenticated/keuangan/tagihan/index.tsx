import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_authenticated/keuangan/tagihan/')({
  component: KeuanganTagihanComponent,
})

function KeuanganTagihanComponent() {
  return <div className="p-4 bg-white rounded shadow">Halaman keuangan/tagihan/index</div>
}
