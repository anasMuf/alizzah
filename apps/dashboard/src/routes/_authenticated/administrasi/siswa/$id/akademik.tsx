import { createFileRoute } from "@tanstack/react-router";
import { GraduationCap } from "lucide-react";
import { useGetV1StudentsIdEnrollments } from "#/api/endpoints/student-enrollments/student-enrollments";
import { Badge } from "#/components/ui";

export const Route = createFileRoute(
	"/_authenticated/administrasi/siswa/$id/akademik",
)({
	component: SiswaAkademikPage,
});

function SiswaAkademikPage() {
	const { id } = Route.useParams();
	const studentId = Number(id);

	const {
		data: response,
		isLoading,
		isError,
	} = useGetV1StudentsIdEnrollments(studentId);
	const enrollments = (response?.data as any)?.data || [];

	if (isLoading) {
		return (
			<div className="p-8 animate-pulse bg-white rounded-xl shadow-sm h-64"></div>
		);
	}

	if (isError) {
		return (
			<div className="p-8 bg-red-50 text-red-800 rounded-xl">
				Gagal memuat data akademik.
			</div>
		);
	}

	const getStatusBadge = (status: string) => {
		switch (status.toLowerCase()) {
			case "active":
				return <Badge variant="success">Aktif</Badge>;
			case "completed":
				return <Badge variant="primary">Selesai</Badge>;
			case "dropped":
				return <Badge variant="danger">Keluar</Badge>;
			default:
				return <Badge variant="secondary">{status}</Badge>;
		}
	};

	const formatDate = (dateStr: string) => {
		return new Date(dateStr).toLocaleDateString("id-ID", {
			day: "numeric",
			month: "long",
			year: "numeric",
		});
	};

	return (
		<div className="bg-white rounded-xl shadow-sm ring-1 ring-gray-900/5 overflow-hidden">
			<div className="px-4 py-5 sm:px-6 border-b border-gray-200">
				<h3 className="text-base font-semibold leading-6 text-gray-900">
					Riwayat Rombongan Belajar
				</h3>
				<p className="mt-1 max-w-2xl text-sm text-gray-500">
					Menampilkan daftar rombel yang pernah diikuti oleh siswa ini.
				</p>
			</div>

			<div className="p-0">
				{enrollments.length === 0 ? (
					<div className="p-12 text-center text-gray-500">
						<GraduationCap className="mx-auto h-8 w-8 text-gray-300 mb-3" />
						Belum ada riwayat rombel.
					</div>
				) : (
					<ul className="divide-y divide-gray-100">
						{enrollments.map((enrollment: any) => (
							<li
								key={enrollment.id}
								className="px-4 py-5 sm:px-6 hover:bg-gray-50 transition-colors"
							>
								<div className="flex items-center justify-between">
									<div className="flex items-center gap-x-4">
										<div className="h-10 w-10 flex items-center justify-center rounded-full bg-indigo-50">
											<GraduationCap className="h-6 w-6 text-indigo-600" />
										</div>
										<div>
											<h4 className="text-sm font-semibold text-gray-900">
												{enrollment.class_group.name}
											</h4>
											<p className="text-xs text-gray-500 mt-1">
												Tahun Ajaran: {enrollment.academic_year.name || "-"}
											</p>
										</div>
									</div>
									<div className="flex flex-col items-end">
										{getStatusBadge(enrollment.status)}
										<p className="text-xs text-gray-500 mt-2 text-right">
											Sejak{" "}
											{enrollment.start_date
												? formatDate(enrollment.start_date)
												: "-"}
										</p>
									</div>
								</div>
							</li>
						))}
					</ul>
				)}
			</div>
		</div>
	);
}
