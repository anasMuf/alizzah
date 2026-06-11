import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useAtom } from "jotai";
import {
	AlertCircle,
	ChevronRight,
	Info,
	Search,
	UserCircle,
} from "lucide-react";
import { useState } from "react";
import { usePostV1AcademicEventsClassChanges } from "@alizzah/api-client/endpoints/academic-events/academic-events";
import { useGetV1ClassGroups } from "@alizzah/api-client/endpoints/class-groups/class-groups";
import { useGetV1Students } from "@alizzah/api-client/endpoints/students/students";
import { ApiError } from "@alizzah/api-client/mutator/custom-instance";
import { Button } from "@alizzah/ui";
import { FormField } from "@alizzah/ui";
import { useToast } from "@alizzah/ui";
import { academicYearAtom } from "../../../../store/global";

export const Route = createFileRoute(
	"/_authenticated/administrasi/siklus/pindah-rombel",
)({
	component: PindahRombelPage,
});

function PindahRombelPage() {
	const [activeAy] = useAtom(academicYearAtom);
	const navigate = useNavigate();
	const { addToast } = useToast();

	const [studentSearch, setStudentSearch] = useState("");
	const [selectedStudent, setSelectedStudent] = useState<any>(null);

	const [formData, setFormData] = useState({
		target_class_group_id: "",
		effective_date: new Date().toISOString().split("T")[0],
		notes: "",
	});

	const { data: searchResponse, isLoading: isSearchLoading } = useGetV1Students(
		{ search: studentSearch, limit: 5 },
		{ query: { enabled: studentSearch.length > 2 } },
	);

	const searchResults = (searchResponse?.data as any)?.data || [];

	const currentLevel = selectedStudent?.active_enrollment?.class_group?.level;
	const currentClassGroupId =
		selectedStudent?.active_enrollment?.class_group?.id;

	const { data: classGroupsResponse } = useGetV1ClassGroups(
		{ academic_year_id: activeAy?.id },
		{ query: { enabled: !!activeAy && !!selectedStudent } },
	);

	const classGroups = (classGroupsResponse?.data as any)?.data || [];

	const targetClassGroups = classGroups.filter(
		(cg: any) => cg.level === currentLevel && cg.id !== currentClassGroupId,
	);

	const createMutation = usePostV1AcademicEventsClassChanges({
		mutation: {
			onSuccess: () => {
				addToast({
					variant: "success",
					title: "Berhasil",
					message: `Siswa berhasil dipindahkan rombel.`,
				});
				navigate({ to: "/administrasi/siklus" });
			},
			onError: (error: Error) => {
				const msg =
					error instanceof ApiError
						? error.message
						: "Gagal memindahkan rombel.";
				addToast({ variant: "error", title: "Gagal", message: msg });
			},
		},
	});

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		if (!selectedStudent || !formData.target_class_group_id) return;

		createMutation.mutate({
			data: {
				student_id: selectedStudent.id,
				to_class_group_id: Number(formData.target_class_group_id),
				from_class_group_id:
					selectedStudent.active_enrollment?.class_group_id || 0,
				event_date: `${formData.effective_date}T00:00:00Z`,
				notes: formData.notes,
			},
		});
	};

	return (
		<div className="space-y-6 max-w-3xl mx-auto">
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
								Pindah Rombel
							</span>
						</div>
					</li>
				</ol>
			</nav>

			<div className="border-b border-gray-200 pb-5">
				<h2 className="text-2xl font-bold leading-7 text-gray-900 sm:truncate sm:tracking-tight">
					Pindah Rombel
				</h2>
				<p className="mt-1 text-sm text-gray-500">
					Pindahkan siswa antar rombel dalam jenjang yang sama.
				</p>
			</div>

			<form onSubmit={handleSubmit} className="space-y-8">
				<div className="bg-white shadow-sm ring-1 ring-gray-900/5 sm:rounded-xl p-6 sm:p-8">
					<div className="grid grid-cols-1 gap-x-6 gap-y-8 sm:grid-cols-6">
						{/* Pencarian Siswa */}
						<div className="sm:col-span-6">
							<label className="block text-sm font-medium leading-6 text-gray-900 mb-2">
								Pilih Siswa *
							</label>
							{!selectedStudent ? (
								<div className="relative">
									<div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
										<Search className="h-5 w-5 text-gray-400" />
									</div>
									<input
										type="text"
										className="block w-full rounded-md border-0 py-2 pl-10 text-gray-900 ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
										placeholder="Cari nama siswa aktif..."
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
														className={`relative cursor-pointer select-none py-2 pl-3 pr-9 ${!student.active_enrollment ? "opacity-50" : "hover:bg-indigo-50"}`}
														onClick={() => {
															if (student.active_enrollment)
																setSelectedStudent(student);
														}}
													>
														<div className="flex items-center justify-between">
															<span className="ml-3 block truncate font-medium text-gray-900">
																{student.full_name}
															</span>
															{student.active_enrollment ? (
																<span className="text-xs text-gray-500">
																	{student.active_enrollment.class_group?.name}
																</span>
															) : (
																<span className="text-xs text-red-500">
																	Tidak ada enrollment aktif
																</span>
															)}
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
												Saat ini:{" "}
												{selectedStudent.active_enrollment?.class_group?.name}{" "}
												&middot;{" "}
												{selectedStudent.active_enrollment?.academic_year?.name}
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

						{selectedStudent && (
							<>
								<div className="sm:col-span-6">
									<label className="block text-sm font-medium leading-6 text-gray-900 mb-2">
										Rombel Tujuan *
									</label>
									<select
										value={formData.target_class_group_id}
										onChange={(e) =>
											setFormData({
												...formData,
												target_class_group_id: e.target.value,
											})
										}
										className="block w-full rounded-md border-0 py-1.5 text-gray-900 ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-indigo-600 sm:text-sm sm:leading-6"
										required
									>
										<option value="">-- Pilih Rombel --</option>
										{targetClassGroups.map((cg: any) => (
											<option key={cg.id} value={cg.id}>
												{cg.name}
											</option>
										))}
									</select>
									{targetClassGroups.length === 0 && (
										<p className="mt-2 text-sm text-red-600 flex items-center gap-1">
											<AlertCircle className="h-4 w-4" />
											Tidak ada rombel lain di jenjang ini.
										</p>
									)}
								</div>

								<div className="sm:col-span-3">
									<FormField
										id="effective_date"
										type="date"
										label="Tanggal Efektif *"
										value={formData.effective_date}
										onChange={(e) =>
											setFormData({
												...formData,
												effective_date: e.target.value,
											})
										}
										required
									/>
								</div>

								<div className="sm:col-span-6">
									<label className="block text-sm font-medium leading-6 text-gray-900 mb-2">
										Catatan
									</label>
									<textarea
										rows={3}
										className="block w-full rounded-md border-0 py-1.5 text-gray-900 ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-indigo-600 sm:text-sm sm:leading-6"
										value={formData.notes}
										onChange={(e) =>
											setFormData({ ...formData, notes: e.target.value })
										}
										placeholder="Opsional..."
									/>
								</div>

								<div className="sm:col-span-6">
									<div className="rounded-md bg-blue-50 p-4">
										<div className="flex">
											<div className="flex-shrink-0">
												<Info
													className="h-5 w-5 text-blue-400"
													aria-hidden="true"
												/>
											</div>
											<div className="ml-3 flex-1 md:flex md:justify-between">
												<p className="text-sm text-blue-700">
													Pindah rombel tidak mempengaruhi tagihan.
												</p>
											</div>
										</div>
									</div>
								</div>
							</>
						)}
					</div>
				</div>

				<div className="flex items-center justify-end gap-x-6">
					<Link to="/administrasi/siklus">
						<Button type="button" variant="ghost">
							Batal
						</Button>
					</Link>
					<Button
						type="submit"
						variant="primary"
						disabled={
							!selectedStudent ||
							!formData.target_class_group_id ||
							createMutation.isPending
						}
					>
						{createMutation.isPending ? "Memproses..." : "Pindahkan Rombel"}
					</Button>
				</div>
			</form>
		</div>
	);
}
