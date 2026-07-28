import { useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useAtom } from "jotai";
import { ChevronRight, Search, UserCircle } from "lucide-react";
import { useEffect, useState } from "react";
import {
	getGetV1DaycareEnrollmentsQueryKey,
	useGetV1DaycareEnrollmentsId,
	usePostV1DaycareEnrollments,
	usePutV1DaycareEnrollmentsId,
} from "#/api/endpoints/daycare-enrollments/daycare-enrollments";
import { getGetV1StudentsIdInvoicesQueryKey } from "#/api/endpoints/invoices/invoices";
import {
	useGetV1Students,
	useGetV1StudentsId,
} from "#/api/endpoints/students/students";
import type { DtoCreateDaycareEnrollmentRequest } from "#/api/model";
import { ApiError, customInstance } from "#/api/mutator/custom-instance";
import { Button, FormField, useToast } from "#/components/ui";
import { academicYearAtom } from "../../../../store/global";

const CATEGORY_OPTIONS = [
	{ value: "premium", label: "Premium (Rutin, Fasilitas Personal)" },
	{ value: "regular", label: "Regular (Tidak Rutin, Fasilitas Umum)" },
];

const TIMESLOT_OPTIONS = [
	{ value: "07-15", label: "Jam 07.00 – 15.00" },
	{ value: "10-15", label: "Jam 10.00 – 15.00" },
	{ value: "10-13", label: "Jam 10.00 – 13.00" },
];

const AGEGROUP_OPTIONS = [
	{ value: "kbtk", label: "KB-TK" },
	{ value: "under3", label: "< 3 Tahun" },
];

export const Route = createFileRoute(
	"/_authenticated/administrasi/daycare/baru",
)({
	component: DaycareBaruPage,
	validateSearch: (params: Record<string, unknown>) => ({
		student_id:
			typeof params.student_id === "number"
				? params.student_id
				: typeof params.student_id === "string"
					? Number.parseInt(params.student_id, 10) || undefined
					: undefined,
		edit_id:
			typeof params.edit_id === "number"
				? params.edit_id
				: typeof params.edit_id === "string"
					? Number.parseInt(params.edit_id, 10) || undefined
					: undefined,
	}),
});

function DaycareBaruPage() {
	const search = Route.useSearch();
	const prefilledStudentId = search.student_id;
	const editId = search.edit_id;
	const isEdit = !!editId;
	const [activeAy] = useAtom(academicYearAtom);
	const navigate = useNavigate();
	const queryClient = useQueryClient();
	const { addToast } = useToast();

	const [studentSearch, setStudentSearch] = useState("");
	const [selectedStudent, setSelectedStudent] = useState<any>(null);

	const [formData, setFormData] = useState({
		category: "regular",
		time_slot: "07-15",
		age_group: "kbtk",
		start_date: new Date().toISOString().split("T")[0],
	});

	const [enrollmentType, setEnrollmentType] = useState<string>(""); // auto-detect, "baru", "lanjutan"
	const [premiumHistoryChecked, setPremiumHistoryChecked] = useState(false);

	// Fetch existing enrollment for edit mode
	const { data: editEnrollment, isLoading: isEditLoading } =
		useGetV1DaycareEnrollmentsId(editId!, {
			query: { enabled: isEdit },
		} as any);

	// Pre-fill form when editing
	useEffect(() => {
		if (isEdit && editEnrollment) {
			const enr = (editEnrollment as any)?.data?.data;
			if (enr) {
				setSelectedStudent(enr.student);
				setStudentSearch(enr.student?.full_name || "");
				setFormData({
					category: enr.category,
					time_slot: enr.time_slot,
					age_group: enr.age_group,
					start_date:
						enr.start_date?.split("T")[0] ||
						new Date().toISOString().split("T")[0],
				});
			}
		}
	}, [isEdit, editEnrollment]);

	const { data: searchResponse, isLoading: isSearchLoading } = useGetV1Students(
		{ search: studentSearch, limit: 5 },
		{ query: { enabled: studentSearch.length > 2 } },
	);

	const searchResults = (searchResponse?.data as any)?.data || [];

	// Auto-select student jika ada student_id dari query param
	const { data: prefilledStudent } = useGetV1StudentsId(prefilledStudentId!, {
		query: { enabled: !!prefilledStudentId },
	} as any);

	useEffect(() => {
		if (prefilledStudent) {
			const s = (prefilledStudent as any)?.data?.data;
			if (s) {
				setSelectedStudent(s);
				setStudentSearch(s.full_name || "");
			}
		}
	}, [prefilledStudent]);

	// Auto-detect premium history when student is selected and category is premium
	useEffect(() => {
		if (
			selectedStudent &&
			formData.category === "premium" &&
			!premiumHistoryChecked
		) {
			customInstance<any>(
				`/v1/daycare-enrollments/check-premium-history?student_id=${selectedStudent.id}`,
			)
				.then((res) => {
					const hasHistory = res?.data?.has_premium_history;
					setEnrollmentType(hasHistory ? "lanjutan" : "baru");
					setPremiumHistoryChecked(true);
				})
				.catch(() => {
					// fallback: default to baru
					setEnrollmentType("baru");
					setPremiumHistoryChecked(true);
				});
		}
	}, [selectedStudent, formData.category, premiumHistoryChecked]);

	// Reset premium check when student or category changes
	useEffect(() => {
		setPremiumHistoryChecked(false);
		setEnrollmentType("");
	}, [selectedStudent?.id, formData.category]);

	const createMutation = usePostV1DaycareEnrollments({
		mutation: {
			onSuccess: () => {
				addToast({
					variant: "success",
					title: "Berhasil",
					message: "Siswa berhasil didaftarkan ke layanan daycare.",
				});
				queryClient.invalidateQueries({
					queryKey: getGetV1DaycareEnrollmentsQueryKey(),
				});
				queryClient.invalidateQueries({
					queryKey: getGetV1StudentsIdInvoicesQueryKey(selectedStudent.id),
				});
				navigate({ to: "/administrasi/daycare", search: {} as any });
			},
			onError: (error: Error) => {
				const msg =
					error instanceof ApiError
						? error.message
						: "Gagal mendaftarkan siswa.";
				addToast({ variant: "error", title: "Gagal", message: msg });
			},
		},
	});

	const updateMutation = usePutV1DaycareEnrollmentsId({
		mutation: {
			onSuccess: () => {
				addToast({
					variant: "success",
					title: "Berhasil",
					message: "Pendaftaran daycare berhasil diperbarui.",
				});
				queryClient.invalidateQueries({
					queryKey: getGetV1DaycareEnrollmentsQueryKey(),
				});
				navigate({ to: "/administrasi/daycare", search: {} as any });
			},
			onError: (error: Error) => {
				const msg =
					error instanceof ApiError
						? error.message
						: "Gagal memperbarui pendaftaran.";
				addToast({ variant: "error", title: "Gagal", message: msg });
			},
		},
	});

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		if (!selectedStudent || !activeAy) return;

		const payload: any = {
			student_id: selectedStudent.id,
			academic_year_id: activeAy.id,
			category:
				formData.category as DtoCreateDaycareEnrollmentRequest["category"],
			time_slot:
				formData.time_slot as DtoCreateDaycareEnrollmentRequest["time_slot"],
			age_group:
				formData.age_group as DtoCreateDaycareEnrollmentRequest["age_group"],
			start_date: `${formData.start_date}T00:00:00Z`,
		};

		// Sertakan enrollment_type jika premium dan user sudah memilih
		if (formData.category === "premium" && enrollmentType) {
			payload.enrollment_type = enrollmentType;
		}

		if (isEdit) {
			updateMutation.mutate({ id: editId!, data: payload });
		} else {
			createMutation.mutate({ data: payload });
		}
	};

	return (
		<div className="space-y-6 max-w-3xl mx-auto">
			{/* Breadcrumb */}
			<nav className="flex" aria-label="Breadcrumb">
				<ol className="flex items-center space-x-2">
					<li>
						<Link
							to="/administrasi/daycare"
							search={{} as any}
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
								to="/administrasi/daycare"
								search={{} as any}
								className="ml-2 text-sm font-medium text-gray-500 hover:text-gray-700"
							>
								Daycare
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
								Pendaftaran
							</span>
						</div>
					</li>
				</ol>
			</nav>

			<div className="border-b border-gray-200 pb-5">
				<h2 className="text-2xl font-bold leading-7 text-gray-900 sm:truncate sm:tracking-tight">
					{isEdit ? "Edit Pendaftaran Daycare" : "Pendaftaran Daycare"}
				</h2>
				<p className="mt-1 text-sm text-gray-500">
					{isEdit
						? "Perbarui data pendaftaran daycare."
						: "Daftarkan siswa ke layanan daycare (penitipan anak)."}
				</p>
			</div>

			<form onSubmit={handleSubmit} className="space-y-8">
				<div className="bg-white shadow-sm ring-1 ring-gray-900/5 sm:rounded-xl p-6 sm:p-8">
					<div className="grid grid-cols-1 gap-x-6 gap-y-8 sm:grid-cols-6">
						{/* Pencarian Siswa */}
						<div className="sm:col-span-6">
							<label className="block text-sm font-medium leading-6 text-gray-900 mb-2">
								Pilih Siswa
							</label>
							{isEdit ? (
								<div className="flex items-center justify-between p-4 border border-gray-200 bg-gray-50 rounded-lg">
									<div className="flex items-center">
										{selectedStudent?.photo_url ? (
											<img
												src={selectedStudent.photo_url}
												alt=""
												className="h-10 w-10 rounded-full"
											/>
										) : (
											<UserCircle className="h-10 w-10 text-gray-400" />
										)}
										<div className="ml-4">
											<p className="text-sm font-medium text-gray-900">
												{selectedStudent?.full_name}
											</p>
											<p className="text-xs text-gray-500">
												Siswa tidak dapat diubah saat edit
											</p>
										</div>
									</div>
								</div>
							) : !selectedStudent ? (
								<div className="relative">
									<div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
										<Search className="h-5 w-5 text-gray-400" />
									</div>
									<input
										type="text"
										className="block w-full rounded-md border-0 py-2 pl-10 text-gray-900 ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
										placeholder="Ketik minimal 3 huruf nama siswa..."
										value={studentSearch}
										onChange={(e) => setStudentSearch(e.target.value)}
									/>
									{studentSearch.length > 2 && (
										<div className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-md bg-white py-1 text-base shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm">
											{isSearchLoading ? (
												<div className="px-4 py-2 text-sm text-gray-500">
													Mencari...
												</div>
											) : searchResults.length === 0 ? (
												<div className="px-4 py-2 text-sm text-gray-500">
													Tidak ada siswa ditemukan.
												</div>
											) : (
												searchResults.map((student: any) => (
													<div
														key={student.id}
														className="relative cursor-pointer select-none py-2 pl-3 pr-9 hover:bg-indigo-50"
														onClick={() => setSelectedStudent(student)}
													>
														<div className="flex items-center">
															<span className="ml-3 block truncate font-medium text-gray-900">
																{student.full_name}{" "}
																<span className="text-gray-500 font-normal">
																	(
																	{student.is_daycare_only
																		? "Siswa Daycare Saja"
																		: "Siswa Reguler"}
																	)
																</span>
															</span>
														</div>
													</div>
												))
											)}
										</div>
									)}
								</div>
							) : (
								<div className="flex items-center justify-between p-4 border border-indigo-200 bg-indigo-50 rounded-lg">
									<div className="flex items-center">
										{selectedStudent.photo_url ? (
											<img
												src={selectedStudent.photo_url}
												alt=""
												className="h-10 w-10 rounded-full"
											/>
										) : (
											<UserCircle className="h-10 w-10 text-gray-400" />
										)}
										<div className="ml-4">
											<p className="text-sm font-medium text-gray-900">
												{selectedStudent.full_name}
											</p>
											<p className="text-xs text-gray-500">
												{selectedStudent.is_daycare_only
													? "Siswa Khusus Daycare"
													: "Siswa Reguler"}
											</p>
										</div>
									</div>
									<Button
										variant="ghost"
										size="sm"
										onClick={() => setSelectedStudent(null)}
										className="text-gray-500 hover:text-gray-700"
									>
										Ganti Siswa
									</Button>
								</div>
							)}
						</div>

						{/* Kategori */}
						<div className="sm:col-span-6">
							<label className="block text-sm font-medium leading-6 text-gray-900 mb-2">
								Kategori Daycare
							</label>
							<div className="flex gap-6">
								{CATEGORY_OPTIONS.map((opt) => (
									<label
										key={opt.value}
										className={`flex items-center gap-2 px-4 py-3 rounded-lg border cursor-pointer transition-colors ${
											formData.category === opt.value
												? "border-indigo-500 bg-indigo-50"
												: "border-gray-200 hover:bg-gray-50"
										}`}
									>
										<input
											type="radio"
											name="category"
											value={opt.value}
											checked={formData.category === opt.value}
											onChange={(e) =>
												setFormData({ ...formData, category: e.target.value })
											}
											className="h-4 w-4 border-gray-300 text-indigo-600 focus:ring-indigo-600"
										/>
										<span className="text-sm text-gray-900">{opt.label}</span>
									</label>
								))}
							</div>
							{formData.category === "premium" && !isEdit && (
								<div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-lg">
									<label className="block text-sm font-medium text-gray-900 mb-2">
										Jenis Pendaftaran Premium
									</label>
									<div className="flex gap-4">
										<label
											className={`flex items-center gap-2 px-4 py-3 rounded-lg border cursor-pointer transition-colors ${
												enrollmentType === "baru"
													? "border-indigo-500 bg-indigo-50"
													: "border-gray-200 hover:bg-gray-50"
											}`}
										>
											<input
												type="radio"
												name="enrollment_type"
												value="baru"
												checked={enrollmentType === "baru"}
												onChange={(e) => setEnrollmentType(e.target.value)}
												className="h-4 w-4 border-gray-300 text-indigo-600 focus:ring-indigo-600"
											/>
											<span className="text-sm text-gray-900">
												Baru{" "}
												<span className="text-amber-600">
													(Kena Biaya Awal)
												</span>
											</span>
										</label>
										<label
											className={`flex items-center gap-2 px-4 py-3 rounded-lg border cursor-pointer transition-colors ${
												enrollmentType === "lanjutan"
													? "border-indigo-500 bg-indigo-50"
													: "border-gray-200 hover:bg-gray-50"
											}`}
										>
											<input
												type="radio"
												name="enrollment_type"
												value="lanjutan"
												checked={enrollmentType === "lanjutan"}
												onChange={(e) => setEnrollmentType(e.target.value)}
												className="h-4 w-4 border-gray-300 text-indigo-600 focus:ring-indigo-600"
											/>
											<span className="text-sm text-gray-900">
												Lanjutan{" "}
												<span className="text-green-600">
													(Tanpa Biaya Awal)
												</span>
											</span>
										</label>
									</div>
									{!enrollmentType && (
										<p className="mt-2 text-xs text-gray-500">
											Mendeteksi otomatis...
										</p>
									)}
									{enrollmentType === "baru" && (
										<p className="mt-2 text-xs text-amber-600">
											⚠️ Pendaftaran baru akan dikenakan Biaya Awal.
										</p>
									)}
									{enrollmentType === "lanjutan" && (
										<p className="mt-2 text-xs text-green-600">
											✅ Lanjutan — tidak dikenakan Biaya Awal.
										</p>
									)}
								</div>
							)}
							{formData.category === "premium" && isEdit && (
								<p className="mt-2 text-xs text-gray-500">
									ℹ️ Jenis pendaftaran (Baru/Lanjutan) hanya dapat diatur saat
									pembuatan.
								</p>
							)}
						</div>

						{/* Time Slot */}
						<div className="sm:col-span-3">
							<label className="block text-sm font-medium leading-6 text-gray-900 mb-2">
								Jam
							</label>
							<select
								value={formData.time_slot}
								onChange={(e) =>
									setFormData({ ...formData, time_slot: e.target.value })
								}
								className="block w-full rounded-md border-0 py-2 text-gray-900 ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-indigo-600 sm:text-sm sm:leading-6"
							>
								{TIMESLOT_OPTIONS.map((opt) => (
									<option key={opt.value} value={opt.value}>
										{opt.label}
									</option>
								))}
							</select>
						</div>

						{/* Kelompok Umur */}
						<div className="sm:col-span-3">
							<label className="block text-sm font-medium leading-6 text-gray-900 mb-2">
								Kelompok Umur
							</label>
							<select
								value={formData.age_group}
								onChange={(e) =>
									setFormData({ ...formData, age_group: e.target.value })
								}
								className="block w-full rounded-md border-0 py-2 text-gray-900 ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-indigo-600 sm:text-sm sm:leading-6"
							>
								{AGEGROUP_OPTIONS.map((opt) => (
									<option key={opt.value} value={opt.value}>
										{opt.label}
									</option>
								))}
							</select>
						</div>

						{/* Tanggal Mulai */}
						<div className="sm:col-span-3">
							<FormField
								id="start_date"
								type="date"
								label="Tanggal Mulai"
								value={formData.start_date}
								onChange={(e) =>
									setFormData({ ...formData, start_date: e.target.value })
								}
								required
							/>
						</div>
					</div>
				</div>

				<div className="flex items-center justify-end gap-x-6">
					<Link to="/administrasi/daycare" search={{} as any}>
						<Button type="button" variant="ghost">
							Batal
						</Button>
					</Link>
					<Button
						type="submit"
						variant="primary"
						disabled={
							!selectedStudent ||
							(isEdit ? updateMutation.isPending : createMutation.isPending) ||
							!activeAy ||
							isEditLoading
						}
					>
						{isEdit
							? updateMutation.isPending
								? "Menyimpan..."
								: "Simpan Perubahan"
							: createMutation.isPending
								? "Menyimpan..."
								: "Daftarkan Siswa"}
					</Button>
				</div>
			</form>
		</div>
	);
}
