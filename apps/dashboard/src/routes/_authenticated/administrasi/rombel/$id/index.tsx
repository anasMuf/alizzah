import { useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowRight, ChevronRight, UserCircle, Users } from "lucide-react";
import { useState } from "react";
import {
  getGetV1ClassGroupsQueryKey,
  useDeleteV1ClassGroupsId,
  useGetV1ClassGroupsId,
} from "#/api/endpoints/class-groups/class-groups";
import { useGetV1ClassGroupsIdStudents } from "#/api/endpoints/student-enrollments/student-enrollments";
import { ApiError } from "#/api/mutator/custom-instance";
import { Button, ConfirmDialog, SlideOver, useToast } from "#/components/ui";
import { RombelForm } from "../../../../../features/administrasi/components/RombelForm";

export const Route = createFileRoute(
  "/_authenticated/administrasi/rombel/$id/",
)({
  component: RombelDetailPage,
});

function RombelDetailPage() {
  const { id } = Route.useParams();
  const classGroupId = Number(id);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { addToast } = useToast();

  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);

  // Fetch Class Group Details
  const { data: cgResponse, isLoading: isLoadingCg } =
    useGetV1ClassGroupsId(classGroupId);
  const classGroup = (cgResponse as any)?.data?.data;

  // Fetch Students
  const { data: studentsResponse, isLoading: isLoadingStudents } =
    useGetV1ClassGroupsIdStudents(classGroupId);
  const students = (studentsResponse as any)?.data?.data || [];

  // Delete Mutation
  const deleteMutation = useDeleteV1ClassGroupsId({
    mutation: {
      onSuccess: () => {
        addToast({
          variant: "success",
          title: "Berhasil",
          message: "Rombel berhasil dihapus.",
        });
        queryClient.invalidateQueries({
          queryKey: getGetV1ClassGroupsQueryKey(),
        });
        navigate({ to: "/administrasi/rombel" });
      },
      onError: (error: Error) => {
        const msg =
          error instanceof ApiError ? error.message : "Terjadi kesalahan";
        addToast({ variant: "error", title: "Gagal", message: msg });
        setIsDeleteConfirmOpen(false);
      },
    },
  });

  if (isLoadingCg) {
    return (
      <div className="p-8 animate-pulse bg-white rounded-xl shadow-sm h-64"></div>
    );
  }

  if (!classGroup) {
    return (
      <div className="p-8 bg-red-50 text-red-800 rounded-xl">
        Data rombel tidak ditemukan.
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Breadcrumb */}
      <nav className="flex" aria-label="Breadcrumb">
        <ol className="flex items-center space-x-2">
          <li>
            <Link
              to="/administrasi/rombel"
              className="text-gray-400 hover:text-gray-500"
            >
              Administrasi
            </Link>
          </li>
          <li>
            <div className="flex items-center">
              <ChevronRight
                className="h-5 w-5 flex-shrink-0 text-gray-400"
                aria-hidden="true"
              />
              <Link
                to="/administrasi/rombel"
                className="ml-2 text-sm font-medium text-gray-500 hover:text-gray-700"
              >
                Rombel
              </Link>
            </div>
          </li>
          <li>
            <div className="flex items-center">
              <ChevronRight
                className="h-5 w-5 flex-shrink-0 text-gray-400"
                aria-hidden="true"
              />
              <span
                className="ml-2 text-sm font-medium text-gray-900"
                aria-current="page"
              >
                {classGroup.name}
              </span>
            </div>
          </li>
        </ol>
      </nav>

      {/* Header */}
      <div className="sm:flex sm:items-center sm:justify-between border-b border-gray-200 pb-5">
        <div>
          <h1 className="text-2xl font-bold leading-7 text-gray-900 sm:truncate sm:tracking-tight">
            {classGroup.name}
          </h1>
          <p className="mt-1 text-sm text-gray-500 capitalize">
            Jenjang: {classGroup.level}
          </p>
        </div>
        <div className="mt-4 sm:ml-4 sm:mt-0 flex gap-3">
          <Button
            variant="secondary"
            className="flex items-center gap-2"
            onClick={() => setIsEditOpen(true)}
          >
            Edit Rombel
          </Button>
          <Button variant="danger" onClick={() => setIsDeleteConfirmOpen(true)}>
            Hapus Rombel
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Info Sidebar */}
        <div className="space-y-6 lg:col-span-1">
          <div className="bg-white rounded-xl shadow-sm ring-1 ring-gray-900/5 overflow-hidden">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-base font-semibold leading-6 text-gray-900 mb-4 border-b pb-2">
                INFO ROMBEL
              </h3>

              <dl className="space-y-4 text-sm text-gray-600">
                <div className="flex justify-between">
                  <dt className="font-medium text-gray-500">Jenjang</dt>
                  <dd className="capitalize">{classGroup.level}</dd>
                </div>

                <div className="flex justify-between">
                  <dt className="font-medium text-gray-500">Jumlah Siswa</dt>
                  <dd>{classGroup.student_count}</dd>
                </div>

                {classGroup.is_mutation && (
                  <div className="pt-2">
                    <span className="inline-flex items-center rounded-md bg-amber-50 px-2 py-1 text-xs font-medium text-amber-700 ring-1 ring-inset ring-amber-600/20">
                      Rombel Mutasi — siswa baru kena biaya awal
                    </span>
                  </div>
                )}

                <div className="pt-4 border-t border-gray-100">
                  <dt className="font-medium text-gray-900 mb-2">JADWAL</dt>

                  {classGroup.schedule.weekdays?.days?.length > 0 && (
                    <dd className="mb-3 bg-gray-50 p-2 rounded">
                      <p className="font-medium text-gray-700">
                        {classGroup.schedule.weekdays.days.join(", ")}
                      </p>
                      <p className="text-gray-500">
                        {classGroup.schedule.weekdays.time_in} &ndash;{" "}
                        {classGroup.schedule.weekdays.time_out}
                      </p>
                      {classGroup.schedule.weekdays.time_out_calisan && (
                        <p className="text-xs text-indigo-600 mt-1">
                          Jika Calisan:{" "}
                          {classGroup.schedule.weekdays.time_out_calisan}
                        </p>
                      )}
                    </dd>
                  )}

                  {classGroup.schedule.weekend?.days?.length > 0 && (
                    <dd className="bg-gray-50 p-2 rounded">
                      <p className="font-medium text-gray-700">
                        {classGroup.schedule.weekend.days.join(", ")}
                      </p>
                      <p className="text-gray-500">
                        {classGroup.schedule.weekend.time_in} &ndash;{" "}
                        {classGroup.schedule.weekend.time_out}
                      </p>
                    </dd>
                  )}
                </div>
              </dl>
            </div>
            <div className="bg-gray-50 px-4 py-4 sm:px-6">
              <Link
                to="/administrasi/rombel/$id/hari-efektif"
                params={{ id: classGroup.id.toString() }}
                className="text-sm font-medium text-indigo-600 hover:text-indigo-500 flex items-center justify-center gap-1"
              >
                Kelola Hari Efektif <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>

        {/* Daftar Siswa */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-xl shadow-sm ring-1 ring-gray-900/5 h-full">
            <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
              <h3 className="text-base font-semibold leading-6 text-gray-900">
                DAFTAR SISWA
              </h3>
              <p className="mt-1 text-sm text-gray-500">
                Total: {classGroup.student_count} siswa aktif di rombel ini.
              </p>
            </div>

            <div className="p-0">
              {isLoadingStudents ? (
                <div className="p-8 text-center text-gray-500">
                  Memuat data siswa...
                </div>
              ) : students.length === 0 ? (
                <div className="p-12 text-center text-gray-500">
                  <Users className="mx-auto h-8 w-8 text-gray-300 mb-3" />
                  Belum ada siswa di rombel ini.
                </div>
              ) : (
                <ul className="divide-y divide-gray-100">
                  {students.map((student: any) => (
                    <li
                      key={student.id}
                      className="flex items-center justify-between gap-x-6 px-4 py-4 sm:px-6 hover:bg-gray-50"
                    >
                      <div className="flex min-w-0 gap-x-4">
                        {student.photo_url ? (
                          <img
                            className="h-10 w-10 flex-none rounded-full bg-gray-50 object-cover"
                            src={student.photo_url}
                            alt=""
                          />
                        ) : (
                          <UserCircle className="h-10 w-10 flex-none text-gray-300" />
                        )}
                        <div className="min-w-0 flex-auto">
                          <p className="text-sm font-semibold leading-6 text-gray-900 truncate">
                            {student.full_name}
                          </p>
                          <p className="mt-1 truncate text-xs leading-5 text-gray-500">
                            Status:{" "}
                            <span className="capitalize">{student.status}</span>
                          </p>
                        </div>
                      </div>
                      <Link
                        to="/administrasi/siswa/$id/profil"
                        params={{ id: student.id.toString() }}
                        className="hidden sm:flex rounded-full bg-white px-3 py-1 text-xs font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
                      >
                        Lihat Profil{" "}
                        <span aria-hidden="true" className="ml-1">
                          &rarr;
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Modals */}
      <SlideOver
        isOpen={isEditOpen}
        onClose={() => setIsEditOpen(false)}
        title={`Edit Rombel ${classGroup.name}`}
        size="lg"
      >
        <RombelForm
          initialData={classGroup}
          academicYearId={classGroup.academic_year_id}
          onSuccess={() => {
            setIsEditOpen(false);
            queryClient.invalidateQueries({
              queryKey: getGetV1ClassGroupsQueryKey(),
            });
          }}
          onClose={() => setIsEditOpen(false)}
        />
      </SlideOver>

      <ConfirmDialog
        open={isDeleteConfirmOpen}
        onCancel={() => setIsDeleteConfirmOpen(false)}
        onConfirm={() => deleteMutation.mutate({ id: Number(classGroupId) })}
        title="Hapus Rombel"
        variant="danger"
      >
        <p>
          Anda yakin ingin menghapus rombel ini? Semua data yang terkait akan
          ikut terhapus dan tidak dapat dikembalikan.
        </p>
      </ConfirmDialog>
    </div>
  );
}
