import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_authenticated/keuangan/tagihan/$id')({
  component: KeuanganTagihanIdComponent,
})

function KeuanganTagihanIdComponent() {
  return <div className="p-4 bg-white rounded shadow">Halaman keuangan/tagihan/$id</div>
}
