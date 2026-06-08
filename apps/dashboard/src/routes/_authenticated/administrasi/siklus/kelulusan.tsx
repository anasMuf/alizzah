import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useAtom } from "jotai";
import {
	CheckSquare,
	ChevronRight,
	GraduationCap,
	Info,
	Square,
} from "lucide-react";
import { useMemo, useState } from "react";
import { usePostV1AcademicEventsGraduations } from "../../../../api/endpoints/academic-events/academic-events";
import { useGetV1AcademicYears } from "../../../../api/endpoints/academic-years/academic-years";
import { useGetV1Students } from "../../../../api/endpoints/students/students";
import { ApiError } from "../../../../api/mutator/custom-instance";
import { Button } from "../../../../components/atoms/Button";
import { ConfirmDialog } from "../../../../components/molecules/ConfirmDialog";
import { FormField } from "../../../../components/molecules/FormField";
import { useToast } from "../../../../components/molecules/Toast";
import { academicYearAtom } from "../../../../store/global";

export const Route = createFileRoute(
	"/_authenticated/administrasi/siklus/kelulusan",
)({
	component: KelulusanPage,
});

function KelulusanPage() {
	const [activeAy] = useAtom(academicYearAtom);
	const navigate = useNavigate();
	const { addToast } = useToast();

	const [academicYearId, setAcademicYearId] = useState<number | "">(
		activeAy?.id || "",
	);
	const [eventDate, setEventDate] = useState(
		new Date().toISOString().split("T")[0],
	);
	const [notes, setNotes] = useState("");

	// Set selected retained students mapping (key is student_id, value is boolean)
	const [retainedStudents, setRetainedStudents] = useState<
		Record<number, boolean>
	>({});
	const [isConfirmOpen, setIsConfirmOpen] = useState(false);

	// Fetch all academic years for dropdowns
	const { data: ayResponse } = useGetV1AcademicYears();
	const academicYears = (ayResponse?.data as any)?.data || [];

	// Fetch students for selected academic year
	const { data: studentsResponse, isLoading: isLoadingStudents } =
		useGetV1Students(
			{
				academic_year_id: Number(academicYearId),
				status: "active",
				limit: 1000,
			},
			{ query: { enabled: !!academicYearId } },
		);

	const allStudents = (studentsResponse?.data as any)?.data || [];

	// Filter students who are in the highest level ("berlian")
	const graduatableStudents = useMemo(() => {
		return allStudents.filter((student: any) => {
			const level =
				student.active_enrollment?.class_group?.level?.toLowerCase();
			// Only berlian can graduate
			return level === "berlian";
		});
	}, [allStudents]);

	const toggleRetained = (studentId: number) => {
		setRetainedStudents((prev) => ({
			...prev,
			[studentId]: !prev[studentId],
		}));
	};

	const createMutation = usePostV1AcademicEventsGraduations({
		mutation: {
			onSuccess: (res: any) => {
				const result = res?.data?.data;
				addToast({
					variant: "success",
					title: "Berhasil",
					message: `Diproses: ${result?.graduated || 0} Lulus, ${result?.retained || 0} Tinggal.`,
				});
				setIsConfirmOpen(false);
				navigate({ to: "/administrasi/siklus" });
			},
			onError: (error: Error) => {
				const msg =
					error instanceof ApiError
						? error.message
						: "Gagal memproses kelulusan.";
				addToast({ variant: "error", title: "Gagal", message: msg });
				setIsConfirmOpen(false);
			},
		},
	});

	const handleOpenConfirm = (e: React.FormEvent) => {
		e.preventDefault();
		if (!academicYearId) {
			addToast({
				variant: "error",
				title: "Validasi Gagal",
				message: "Tahun ajaran tidak valid.",
			});
			return;
		}
		if (graduatableStudents.length === 0) {
			addToast({
				variant: "error",
				title: "Kosong",
				message: "Tidak ada siswa yang bisa diproses (Rombel Berlian).",
			});
			return;
		}
		setIsConfirmOpen(true);
	};

	const handleConfirm = () => {
		const graduatedIds = graduatableStudents
			.filter((student: any) => !retainedStudents[student.id])
			.map((student: any) => student.id);

		createMutation.mutate({
			data: {
				academic_year_id: Number(academicYearId),
				student_ids: graduatedIds,
				event_date: `${eventDate}T00:00:00Z`,
				notes: notes,
			},
		});
	};

	// Grouping students for display
	const groupedStudents = useMemo(() => {
		const groups: Record<string, any[]> = {};
		graduatableStudents.forEach((student: any) => {
			const cgName =
				student.active_enrollment?.class_group?.name || "Tanpa Rombel";
			if (!groups[cgName]) groups[cgName] = [];
			groups[cgName].push(student);
		});
		return groups;
	}, [graduatableStudents]);

	return (
		<div className="space-y-6 max-w-5xl mx-auto">
			{/* Breadcrumb */}
			<nav className="flex" aria-label="Breadcrumb">
				<ol role="list" className="flex items-center space-x-2">
					<li>
						<Link
							to="/administrasi/siklus"
							className="text-gray-400 hover:text-gray-500"
						>
							Siklus Akademik
						</Link>
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
								Kelulusan
							</span>
						</div>
					</li>
				</ol>
			</nav>

			<div className="border-b border-gray-200 pb-5">
				<h2 className="text-2xl font-bold leading-7 text-gray-900 sm:truncate sm:tracking-tight">
					Proses Kelulusan (Massal)
				</h2>
				<p className="mt-1 text-sm text-gray-500">
					Proses meluluskan siswa tingkat akhir (Berlian).
				</p>
			</div>

			<form onSubmit={handleOpenConfirm} className="space-y-8">
				{/* Setup Config */}
				<div className="bg-white shadow-sm ring-1 ring-gray-900/5 sm:rounded-xl p-6">
					<h3 className="text-base font-semibold leading-7 text-gray-900 border-b pb-4 mb-4">
						Pengaturan Proses
					</h3>
					<div className="grid grid-cols-1 gap-x-6 gap-y-6 sm:grid-cols-6">
						<div className="sm:col-span-3">
							<label className="block text-sm font-medium leading-6 text-gray-900 mb-2">
								Tahun Ajaran Kelulusan *
							</label>
							<select
								value={academicYearId}
								onChange={(e) =>
									setAcademicYearId(
										e.target.value === "" ? "" : Number(e.target.value),
									)
								}
								className="block w-full rounded-md border-0 py-1.5 text-gray-900 ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-indigo-600 sm:text-sm sm:leading-6"
								required
							>
								<option value="">-- Pilih Tahun Ajaran --</option>
								{academicYears.map((ay: any) => (
									<option key={ay.id} value={ay.id}>
										{ay.name} {ay.is_active ? "(Aktif)" : ""}
									</option>
								))}
							</select>
						</div>

						<div className="sm:col-span-3">
							<FormField
								id="event_date"
								type="date"
								label="Tanggal Efektif Lulus *"
								value={eventDate}
								onChange={(e) => setEventDate(e.target.value)}
								required
							/>
						</div>

						<div className="sm:col-span-6">
							<label className="block text-sm font-medium leading-6 text-gray-900 mb-2">
								Catatan Kelulusan Massal
							</label>
							<input
								type="text"
								className="block w-full rounded-md border-0 py-1.5 text-gray-900 ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
								value={notes}
								onChange={(e) => setNotes(e.target.value)}
								placeholder="Contoh: Kelulusan angkatan ke-10 tahun ajaran 2025/2026"
							/>
						</div>
					</div>
				</div>

				{/* Info Box */}
				<div className="rounded-md bg-blue-50 p-4 border border-blue-200">
					<div className="flex">
						<div className="flex-shrink-0">
							<Info className="h-5 w-5 text-blue-400" aria-hidden="true" />
						</div>
						<div className="ml-3 flex-1 md:flex md:justify-between">
							<p className="text-sm text-blue-700">
								Sistem akan secara otomatis meluluskan seluruh siswa tingkat{" "}
								<strong>Berlian</strong>. Beri tanda centang pada siswa yang{" "}
								<strong>Tinggal Kelas</strong> (mengulang di tingkat Berlian).
								<br />
								<br />
								<span className="font-semibold text-red-600">Peringatan: </span>{" "}
								Proses ini mungkin memerlukan implementasi Backend Batch 5 untuk
								integrasi finansial.
							</p>
						</div>
					</div>
				</div>

				{/* Daftar Siswa */}
				<div className="bg-white shadow-sm ring-1 ring-gray-900/5 sm:rounded-xl overflow-hidden">
					<div className="px-4 py-5 sm:px-6 border-b border-gray-200 flex justify-between items-center bg-gray-50">
						<h3 className="text-base font-semibold leading-6 text-gray-900 flex items-center">
							<GraduationCap className="w-5 h-5 mr-2 text-gray-400" />
							Daftar Siswa untuk Diluluskan (Rombel Berlian)
						</h3>
						<span className="inline-flex items-center rounded-md bg-indigo-50 px-2 py-1 text-xs font-medium text-indigo-700 ring-1 ring-inset ring-indigo-700/10">
							{graduatableStudents.length} Siswa
						</span>
					</div>

					<div className="p-0">
						{isLoadingStudents ? (
							<div className="p-8 text-center text-gray-500">
								Memuat data siswa...
							</div>
						) : graduatableStudents.length === 0 ? (
							<div className="p-8 text-center text-gray-500">
								Tidak ada siswa tingkat Berlian pada tahun ajaran ini.
							</div>
						) : (
							<div className="divide-y divide-gray-200 max-h-[600px] overflow-y-auto">
								{Object.entries(groupedStudents).map(
									([groupName, students]) => (
										<div key={groupName}>
											<div className="bg-gray-100 px-4 py-2 text-sm font-semibold text-gray-900 sticky top-0 z-10">
												{groupName} ({students.length} Siswa)
											</div>
											<ul className="divide-y divide-gray-100">
												{students.map((student) => {
													const isRetained = !!retainedStudents[student.id];
													return (
														<li
															key={student.id}
															className="flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
														>
															<div className="flex items-center">
																<div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center text-gray-500 uppercase font-bold">
																	{student.full_name.charAt(0)}
																</div>
																<div className="ml-4">
																	<p
																		className={`text-sm font-medium ${isRetained ? "text-amber-700 line-through" : "text-gray-900"}`}
																	>
																		{student.full_name}
																	</p>
																	<p className="text-xs text-gray-500">
																		NISN: {student.national_student_id || "-"}
																	</p>
																</div>
															</div>

															<button
																type="button"
																onClick={() => toggleRetained(student.id)}
																className={`flex items-center px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
																	isRetained
																		? "bg-amber-100 text-amber-800 border border-amber-300"
																		: "bg-white text-gray-500 border border-gray-300 hover:bg-gray-50"
																}`}
															>
																{isRetained ? (
																	<>
																		<CheckSquare className="w-4 h-4 mr-2" />
																		Tinggal Kelas
																	</>
																) : (
																	<>
																		<Square className="w-4 h-4 mr-2" />
																		Lulus (Otomatis)
																	</>
																)}
															</button>
														</li>
													);
												})}
											</ul>
										</div>
									),
								)}
							</div>
						)}
					</div>
				</div>

				<div className="flex items-center justify-end gap-x-6 pb-12">
					<Link to="/administrasi/siklus">
						<Button type="button" variant="ghost">
							Batal
						</Button>
					</Link>
					<Button
						type="submit"
						variant="primary"
						disabled={
							!academicYearId ||
							graduatableStudents.length === 0 ||
							createMutation.isPending
						}
					>
						{createMutation.isPending
							? "Memproses..."
							: "Proses Kelulusan Massal"}
					</Button>
				</div>
			</form>

			{/* Confirm Dialog */}
			<ConfirmDialog
				open={isConfirmOpen}
				onCancel={() => setIsConfirmOpen(false)}
				onConfirm={handleConfirm}
				title="Konfirmasi Proses Kelulusan"
				variant="primary"
				confirmLabel="Ya, Jalankan Proses Massal"
			>
				<div className="space-y-4">
					<p>
						Anda akan menjalankan proses kelulusan untuk{" "}
						<strong>{graduatableStudents.length} siswa</strong>.
					</p>
					<div className="bg-amber-50 p-3 rounded-md text-sm text-amber-800 border border-amber-200">
						<p className="font-semibold mb-1">Rincian Tindakan:</p>
						<ul className="list-disc pl-5 space-y-1">
							<li>
								<strong>
									{graduatableStudents.length -
										Object.values(retainedStudents).filter(Boolean).length}{" "}
									Siswa
								</strong>{" "}
								akan diluluskan. Status mereka akan diubah menjadi "alumni".
							</li>
							<li>
								<strong>
									{Object.values(retainedStudents).filter(Boolean).length} Siswa
								</strong>{" "}
								akan mengulang di tingkat Berlian pada tahun ajaran berikutnya.
							</li>
						</ul>
					</div>
					<p className="text-sm text-gray-500 font-medium">
						Proses ini akan menutup seluruh pendaftaran siswa yang lulus. Apakah
						Anda yakin?
					</p>
				</div>
			</ConfirmDialog>
		</div>
	);
}
