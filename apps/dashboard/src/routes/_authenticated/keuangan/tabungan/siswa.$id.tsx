import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_authenticated/keuangan/tabungan/siswa/$id')({
  component: KeuanganTabunganSiswaidComponent,
})

function KeuanganTabunganSiswaidComponent() {
  return <div className="p-4 bg-white rounded shadow">Halaman keuangan/tabungan/siswa.$id</div>
}
