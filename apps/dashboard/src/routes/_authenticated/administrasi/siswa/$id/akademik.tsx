import { useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { GraduationCap, RefreshCw } from "lucide-react";
import { useState } from "react";
import { useGetV1StudentsIdEnrollments } from "#/api/endpoints/student-enrollments/student-enrollments";
import { customInstance } from "#/api/mutator/custom-instance";
import { Badge, Button } from "#/components/ui";

export const Route = createFileRoute(
	"/_authenticated/administrasi/siswa/$id/akademik",
)({
	component: SiswaAkademikPage,
});

const ENROLLMENT_TYPE_LABELS: Record<string, string> = {
	new: "Siswa Baru",
	repeat: "Mengulang",
	mutation: "Mutasi",
	promotion: "Kenaikan",
	transfer: "Pindahan",
	class_change: "Pindah Rombel",
	retained: "Tinggal Kelas",
};

function SiswaAkademikPage() {
	const { id } = Route.useParams();
	const studentId = Number(id);
	const queryClient = useQueryClient();
	const [changingType, setChangingType] = useState<number | null>(null);
	const [regenerating, setRegenerating] = useState(false);
	const [confirmRegen, setConfirmRegen] = useState(false);

	const {
		data: response,
		isLoading,
		isError,
	} = useGetV1StudentsIdEnrollments(studentId);
	const enrollments = (response?.data as any)?.data || [];

	const handleChangeType = async (enrollmentId: number, newType: string) => {
		setChangingType(enrollmentId);
		try {
			await customInstance(`/v1/enrollments/${enrollmentId}`, {
				method: "PUT",
				body: JSON.stringify({ enrollment_type: newType }),
			});
			queryClient.invalidateQueries({
				queryKey: [`/v1/students/${studentId}/enrollments`],
			});
		} catch (err: any) {
			alert(err.message);
		} finally {
			setChangingType(null);
		}
	};

	const handleRegenerate = async () => {
		setRegenerating(true);
		try {
			await customInstance(`/v1/students/${studentId}/regenerate-invoices`, {
				method: "POST",
			});
			setConfirmRegen(false);
			alert("Invoice berhasil diregenerate. Silakan refresh halaman keuangan.");
		} catch (err: any) {
			alert(err.message);
		} finally {
			setRegenerating(false);
		}
	};

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

	const getEnrollmentTypeBadge = (type: string) => {
		const colors: Record<string, string> = {
			new: "bg-blue-100 text-blue-700",
			repeat: "bg-amber-100 text-amber-700",
			mutation: "bg-purple-100 text-purple-700",
			promotion: "bg-green-100 text-green-700",
			transfer: "bg-cyan-100 text-cyan-700",
			class_change: "bg-orange-100 text-orange-700",
			retained: "bg-red-100 text-red-700",
		};
		return (
			<span
				className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${colors[type] || "bg-gray-100 text-gray-700"}`}
			>
				{ENROLLMENT_TYPE_LABELS[type] || type}
			</span>
		);
	};

	const formatDate = (dateStr: string) => {
		return new Date(dateStr).toLocaleDateString("id-ID", {
			day: "numeric",
			month: "long",
			year: "numeric",
		});
	};

	return (
		<div className="space-y-6">
			{/* Regenerate Invoice — untuk admin mengelola siswa mengulang */}
			<div className="bg-white rounded-xl shadow-sm ring-1 ring-gray-900/5 overflow-hidden">
				<div className="px-4 py-3 sm:px-6 border-b border-gray-200 flex items-center justify-between">
					<div>
						<h3 className="text-base font-semibold leading-6 text-gray-900">
							Regenerasi Invoice
						</h3>
						<p className="mt-1 max-w-2xl text-sm text-gray-500">
							Hapus semua invoice dan buat ulang berdasarkan data enrollment
							terkini. Siswa dengan tipe "Mengulang" tidak akan mendapat invoice
							biaya awal.
						</p>
					</div>
					{!confirmRegen ? (
						<Button
							variant="secondary"
							onClick={() => setConfirmRegen(true)}
							className="text-amber-700 border-amber-200 hover:bg-amber-50 shrink-0"
						>
							<RefreshCw className="mr-2 w-4 h-4" />
							Regenerate Invoice
						</Button>
					) : (
						<div className="flex items-center gap-2 shrink-0">
							<Button
								variant="secondary"
								onClick={() => setConfirmRegen(false)}
							>
								Batal
							</Button>
							<Button
								variant="primary"
								onClick={handleRegenerate}
								disabled={regenerating}
								className="bg-amber-600 hover:bg-amber-700"
							>
								{regenerating ? "Memproses..." : "Ya, Regenerate"}
							</Button>
						</div>
					)}
				</div>
			</div>

			{/* Daftar Enrollment */}
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
										<div className="flex items-center gap-3">
											{/* Enrollment type: badge + dropdown untuk ganti */}
											<div className="flex items-center gap-2">
												{getEnrollmentTypeBadge(enrollment.enrollment_type)}
												{enrollment.status === "active" && (
													<select
														value={enrollment.enrollment_type}
														disabled={changingType === enrollment.id}
														onChange={(e) =>
															handleChangeType(enrollment.id, e.target.value)
														}
														className="text-xs border border-gray-200 rounded px-1 py-0.5 text-gray-600 focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
													>
														<option value="new">Siswa Baru</option>
														<option value="repeat">Mengulang</option>
														<option value="mutation">Mutasi</option>
														<option value="promotion">Kenaikan</option>
														<option value="transfer">Pindahan</option>
														<option value="class_change">Pindah Rombel</option>
														<option value="retained">Tinggal Kelas</option>
													</select>
												)}
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
									</div>
								</li>
							))}
						</ul>
					)}
				</div>
			</div>
		</div>
	);
}
