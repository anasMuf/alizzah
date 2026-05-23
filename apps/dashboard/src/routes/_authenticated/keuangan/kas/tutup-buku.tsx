import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_authenticated/keuangan/kas/tutup-buku')({
  component: KeuanganKasTutupbukuComponent,
})

function KeuanganKasTutupbukuComponent() {
  return <div className="p-4 bg-white rounded shadow">Halaman keuangan/kas/tutup-buku</div>
}
