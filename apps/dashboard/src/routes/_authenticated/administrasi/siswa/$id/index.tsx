import { createFileRoute, redirect } from '@tanstack/react-router';

export const Route = createFileRoute('/_authenticated/administrasi/siswa/$id/')({
  beforeLoad: ({ params }) => {
    throw redirect({
      to: '/administrasi/siswa/$id/profil',
      params: { id: params.id },
    });
  },
  component: () => null,
});
