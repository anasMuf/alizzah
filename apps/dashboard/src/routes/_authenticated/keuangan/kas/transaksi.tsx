import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_authenticated/keuangan/kas/transaksi')({
  component: KeuanganKasTransaksiComponent,
})

function KeuanganKasTransaksiComponent() {
  return <div className="p-4 bg-white rounded shadow">Halaman keuangan/kas/transaksi</div>
}
