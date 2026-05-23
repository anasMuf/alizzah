import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_authenticated/keuangan/')({
  component: KeuanganComponent,
})

function KeuanganComponent() {
  return <div className="p-4 bg-white rounded shadow">Halaman keuangan/index</div>
}
