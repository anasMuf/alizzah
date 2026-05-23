import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_authenticated/keuangan/pembayaran/baru')({
  component: KeuanganPembayaranBaruComponent,
})

function KeuanganPembayaranBaruComponent() {
  return <div className="p-4 bg-white rounded shadow">Halaman keuangan/pembayaran/baru</div>
}
