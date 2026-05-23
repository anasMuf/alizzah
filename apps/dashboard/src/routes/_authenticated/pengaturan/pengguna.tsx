import { createFileRoute, redirect } from '@tanstack/react-router'

export const Route = createFileRoute('/_authenticated/pengaturan/pengguna')({
  beforeLoad: () => {
    // context from _authenticated.tsx needs to include role, but we can also just check localStorage
    const role = localStorage.getItem('alizzah_role')
    if (role !== 'superadmin') {
      throw redirect({ to: '/' })
    }
  },
  component: PengaturanPenggunaComponent,
})

function PengaturanPenggunaComponent() {
  return <div className="p-4 bg-white rounded shadow">Halaman pengaturan/pengguna</div>
}
