import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useAtom } from "jotai";
import { CheckSquare, ChevronRight, Info, Square, Users } from "lucide-react";
import { useMemo, useState } from "react";
import { usePostV1AcademicEventsPromotions } from "../../../../api/endpoints/academic-events/academic-events";
import { useGetV1AcademicYears } from "../../../../api/endpoints/academic-years/academic-years";
import { useGetV1Students } from "../../../../api/endpoints/students/students";
import { ApiError } from "../../../../api/mutator/custom-instance";
import { Button } from "@alizzah/ui";
import { ConfirmDialog } from "@alizzah/ui";
import { FormField } from "@alizzah/ui";
import { useToast } from "@alizzah/ui";
import { academicYearAtom } from "../../../../store/global";

export const Route = createFileRoute(
	"/_authenticated/administrasi/siklus/kenaikan-kelas",
)({
	component: KenaikanKelasPage,
});

function KenaikanKelasPage() {
	const [activeAy] = useAtom(academicYearAtom);
	const navigate = useNavigate();
	const { addToast } = useToast();

	const [fromAcademicYearId, setFromAcademicYearId] = useState<number | "">(
		activeAy?.id || "",
	);
	const [toAcademicYearId, setToAcademicYearId] = useState<number | "">("");
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

	// Fetch students for selected "from" academic year
	const { data: studentsResponse, isLoading: isLoadingStudents } =
		useGetV1Students(
			{
				academic_year_id: Number(fromAcademicYearId),
				status: "active",
				limit: 1000,
			},
			{ query: { enabled: !!fromAcademicYearId } },
		);

	const allStudents = (studentsResponse?.data as any)?.data || [];

	// Filter out students who are already in the highest level ("berlian")
	// Because they should be processed in Graduation, not Promotion.
	const promotableStudents = useMemo(() => {
		return allStudents.filter((student: any) => {
			const level =
				student.active_enrollment?.class_group?.level?.toLowerCase();
			// Only mutiara and intan can be promoted
			return level === "mutiara" || level === "intan";
		});
	}, [allStudents]);

	const toggleRetained = (studentId: number) => {
		setRetainedStudents((prev) => ({
			...prev,
			[studentId]: !prev[studentId],
		}));
	};

	const createMutation = usePostV1AcademicEventsPromotions({
		mutation: {
			onSuccess: (res: any) => {
				const result = res?.data?.data;
				addToast({
					variant: "success",
					title: "Berhasil",
					message: `Diproses: ${result?.promoted || 0} Naik, ${result?.retained || 0} Tinggal.`,
				});
				setIsConfirmOpen(false);
				navigate({ to: "/administrasi/siklus" });
			},
			onError: (error: Error) => {
				const msg =
					error instanceof ApiError
						? error.message
						: "Gagal memproses kenaikan kelas.";
				addToast({ variant: "error", title: "Gagal", message: msg });
				setIsConfirmOpen(false);
			},
		},
	});

	const handleOpenConfirm = (e: React.FormEvent) => {
		e.preventDefault();
		if (
			!fromAcademicYearId ||
			!toAcademicYearId ||
			fromAcademicYearId === toAcademicYearId
		) {
			addToast({
				variant: "error",
				title: "Validasi Gagal",
				message: "Tahun ajaran asal dan tujuan tidak valid.",
			});
			return;
		}
		if (promotableStudents.length === 0) {
			addToast({
				variant: "error",
				title: "Kosong",
				message: "Tidak ada siswa yang bisa diproses.",
			});
			return;
		}
		setIsConfirmOpen(true);
	};

	const handleConfirm = () => {
		const retainedIds = Object.entries(retainedStudents)
			.filter(([_, isRetained]) => isRetained)
			.map(([id]) => Number(id));

		createMutation.mutate({
			data: {
				from_academic_year_id: Number(fromAcademicYearId),
				to_academic_year_id: Number(toAcademicYearId),
				retained_student_ids: retainedIds,
				event_date: `${eventDate}T00:00:00Z`,
				notes: notes,
			},
		});
	};

	// Grouping students for display
	const groupedStudents = useMemo(() => {
		const groups: Record<string, any[]> = {};
		promotableStudents.forEach((student: any) => {
			const cgName =
				student.active_enrollment?.class_group?.name || "Tanpa Rombel";
			if (!groups[cgName]) groups[cgName] = [];
			groups[cgName].push(student);
		});
		return groups;
	}, [promotableStudents]);

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
								Kenaikan Kelas
							</span>
						</div>
					</li>
				</ol>
			</nav>

			<div className="border-b border-gray-200 pb-5">
				<h2 className="text-2xl font-bold leading-7 text-gray-900 sm:truncate sm:tracking-tight">
					Proses Kenaikan Kelas (Massal)
				</h2>
				<p className="mt-1 text-sm text-gray-500">
					Proses pemindahan siswa ke tingkat berikutnya (Mutiara &rarr; Intan,
					Intan &rarr; Berlian) untuk tahun ajaran baru.
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
								Tahun Ajaran Asal *
							</label>
							<select
								value={fromAcademicYearId}
								onChange={(e) =>
									setFromAcademicYearId(
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
							<label className="block text-sm font-medium leading-6 text-gray-900 mb-2">
								Tahun Ajaran Tujuan (Baru) *
							</label>
							<select
								value={toAcademicYearId}
								onChange={(e) =>
									setToAcademicYearId(
										e.target.value === "" ? "" : Number(e.target.value),
									)
								}
								className="block w-full rounded-md border-0 py-1.5 text-gray-900 ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-indigo-600 sm:text-sm sm:leading-6"
								required
							>
								<option value="">-- Pilih Tahun Ajaran --</option>
								{academicYears.map((ay: any) => (
									<option
										key={ay.id}
										value={ay.id}
										disabled={ay.id === fromAcademicYearId}
									>
										{ay.name}
									</option>
								))}
							</select>
						</div>

						<div className="sm:col-span-2">
							<FormField
								id="event_date"
								type="date"
								label="Tanggal Efektif Naik Kelas *"
								value={eventDate}
								onChange={(e) => setEventDate(e.target.value)}
								required
							/>
						</div>

						<div className="sm:col-span-4">
							<label className="block text-sm font-medium leading-6 text-gray-900 mb-2">
								Catatan Kenaikan Massal
							</label>
							<input
								type="text"
								className="block w-full rounded-md border-0 py-1.5 text-gray-900 ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
								value={notes}
								onChange={(e) => setNotes(e.target.value)}
								placeholder="Contoh: Kenaikan kelas tahun ajaran 2026/2027"
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
								Sistem akan secara otomatis mempromosikan siswa ke tingkat
								berikutnya. Beri tanda centang pada siswa yang{" "}
								<strong>Tinggal Kelas</strong> (tidak naik level).
							</p>
						</div>
					</div>
				</div>

				{/* Daftar Siswa */}
				<div className="bg-white shadow-sm ring-1 ring-gray-900/5 sm:rounded-xl overflow-hidden">
					<div className="px-4 py-5 sm:px-6 border-b border-gray-200 flex justify-between items-center bg-gray-50">
						<h3 className="text-base font-semibold leading-6 text-gray-900 flex items-center">
							<Users className="w-5 h-5 mr-2 text-gray-400" />
							Daftar Siswa untuk Diproses
						</h3>
						<span className="inline-flex items-center rounded-md bg-indigo-50 px-2 py-1 text-xs font-medium text-indigo-700 ring-1 ring-inset ring-indigo-700/10">
							{promotableStudents.length} Siswa
						</span>
					</div>

					<div className="p-0">
						{isLoadingStudents ? (
							<div className="p-8 text-center text-gray-500">
								Memuat data siswa...
							</div>
						) : promotableStudents.length === 0 ? (
							<div className="p-8 text-center text-gray-500">
								Tidak ada siswa Mutiara atau Intan pada tahun ajaran asal.
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
																		Naik Kelas (Otomatis)
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
							!fromAcademicYearId ||
							!toAcademicYearId ||
							fromAcademicYearId === toAcademicYearId ||
							promotableStudents.length === 0 ||
							createMutation.isPending
						}
					>
						{createMutation.isPending
							? "Memproses..."
							: "Proses Kenaikan Massal"}
					</Button>
				</div>
			</form>

			{/* Confirm Dialog */}
			<ConfirmDialog
				open={isConfirmOpen}
				onCancel={() => setIsConfirmOpen(false)}
				onConfirm={handleConfirm}
				title="Konfirmasi Proses Kenaikan Kelas"
				variant="primary"
				confirmLabel="Ya, Jalankan Proses Massal"
			>
				<div className="space-y-4">
					<p>
						Anda akan menjalankan proses kenaikan kelas untuk{" "}
						<strong>{promotableStudents.length} siswa</strong>.
					</p>
					<div className="bg-amber-50 p-3 rounded-md text-sm text-amber-800 border border-amber-200">
						<p className="font-semibold mb-1">Rincian Tindakan:</p>
						<ul className="list-disc pl-5 space-y-1">
							<li>
								<strong>
									{promotableStudents.length -
										Object.values(retainedStudents).filter(Boolean).length}{" "}
									Siswa
								</strong>{" "}
								akan dipromosikan ke tingkat berikutnya.
							</li>
							<li>
								<strong>
									{Object.values(retainedStudents).filter(Boolean).length} Siswa
								</strong>{" "}
								akan mengulang di tingkat yang sama.
							</li>
							<li>
								Siswa akan ditempatkan pada rombel default tingkat barunya.
								Admin wajib melakukan penyesuaian kelas via Pindah Rombel
								nantinya.
							</li>
						</ul>
					</div>
					<p className="text-sm text-gray-500 font-medium">
						Proses ini akan menutup seluruh enrollment aktif pada tahun ajaran
						asal. Apakah Anda yakin?
					</p>
				</div>
			</ConfirmDialog>
		</div>
	);
}
