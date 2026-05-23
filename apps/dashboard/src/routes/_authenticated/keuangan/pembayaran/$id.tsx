import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_authenticated/keuangan/pembayaran/$id')({
  component: KeuanganPembayaranIdComponent,
})

function KeuanganPembayaranIdComponent() {
  return <div className="p-4 bg-white rounded shadow">Halaman keuangan/pembayaran/$id</div>
}
