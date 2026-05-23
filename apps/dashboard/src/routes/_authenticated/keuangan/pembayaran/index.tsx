import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_authenticated/keuangan/pembayaran/')({
  component: KeuanganPembayaranComponent,
})

function KeuanganPembayaranComponent() {
  return <div className="p-4 bg-white rounded shadow">Halaman keuangan/pembayaran/index</div>
}
