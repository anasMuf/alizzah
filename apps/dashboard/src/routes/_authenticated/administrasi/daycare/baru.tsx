import { useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useAtom } from "jotai";
import { ChevronRight, Search, UserCircle } from "lucide-react";
import { useState } from "react";
import {
	getGetV1DaycareEnrollmentsQueryKey,
	usePostV1DaycareEnrollments,
} from "../../../../api/endpoints/daycare-enrollments/daycare-enrollments";
import { useGetV1Students } from "../../../../api/endpoints/students/students";
import { ApiError } from "../../../../api/mutator/custom-instance";
import { Button } from "@alizzah/ui";
import { FormField } from "@alizzah/ui";
import { useToast } from "@alizzah/ui";
import { academicYearAtom } from "../../../../store/global";

export const Route = createFileRoute(
	"/_authenticated/administrasi/daycare/baru",
)({
	component: DaycareBaruPage,
});

function DaycareBaruPage() {
	const [activeAy] = useAtom(academicYearAtom);
	const navigate = useNavigate();
	const queryClient = useQueryClient();
	const { addToast } = useToast();

	const [studentSearch, setStudentSearch] = useState("");
	const [selectedStudent, setSelectedStudent] = useState<any>(null);

	const [formData, setFormData] = useState({
		package_type: "monthly_kb",
		start_date: new Date().toISOString().split("T")[0],
	});

	const { data: searchResponse, isLoading: isSearchLoading } = useGetV1Students(
		{ search: studentSearch, limit: 5 },
		{ query: { enabled: studentSearch.length > 2 } },
	);

	const searchResults = (searchResponse?.data as any)?.data || [];

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
				navigate({ to: "/administrasi/daycare" });
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

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		if (!selectedStudent || !activeAy) return;

		createMutation.mutate({
			data: {
				student_id: selectedStudent.id,
				academic_year_id: activeAy.id,
				package_type: formData.package_type as any,
				start_date: `${formData.start_date}T00:00:00Z`,
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
							to="/administrasi/daycare"
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
					Pendaftaran Daycare
				</h2>
				<p className="mt-1 text-sm text-gray-500">
					Daftarkan siswa ke layanan daycare (penitipan anak).
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
							{!selectedStudent ? (
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

						<div className="sm:col-span-3">
							<label className="block text-sm font-medium leading-6 text-gray-900 mb-2">
								Paket Daycare
							</label>
							<select
								value={formData.package_type}
								onChange={(e) =>
									setFormData({ ...formData, package_type: e.target.value })
								}
								className="block w-full rounded-md border-0 py-1.5 text-gray-900 ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-indigo-600 sm:text-sm sm:leading-6"
							>
								<option value="monthly_kb">Bulanan (Siswa KB Reguler)</option>
								<option value="monthly_tk">Bulanan (Siswa TK Reguler)</option>
								<option value="monthly_package_kb">
									Paket Penitipan (Khusus Daycare Usia KB)
								</option>
								<option value="monthly_package_tk">
									Paket Penitipan (Khusus Daycare Usia TK)
								</option>
								<option value="daily">Harian (Insidental)</option>
							</select>
						</div>

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
					<Link to="/administrasi/daycare">
						<Button type="button" variant="ghost">
							Batal
						</Button>
					</Link>
					<Button
						type="submit"
						variant="primary"
						disabled={!selectedStudent || createMutation.isPending || !activeAy}
					>
						{createMutation.isPending ? "Menyimpan..." : "Daftarkan Siswa"}
					</Button>
				</div>
			</form>
		</div>
	);
}
