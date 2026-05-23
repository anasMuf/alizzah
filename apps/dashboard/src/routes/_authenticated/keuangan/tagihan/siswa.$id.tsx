import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_authenticated/keuangan/tagihan/siswa/$id')({
  component: KeuanganTagihanSiswaidComponent,
})

function KeuanganTagihanSiswaidComponent() {
  return <div className="p-4 bg-white rounded shadow">Halaman keuangan/tagihan/siswa.$id</div>
}
