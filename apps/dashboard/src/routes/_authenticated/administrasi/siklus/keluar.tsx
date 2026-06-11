import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { AlertTriangle, ChevronRight, Search, UserCircle } from "lucide-react";
import { useState } from "react";
import { usePostV1AcademicEventsWithdrawals } from "../../../../api/endpoints/academic-events/academic-events";
import {
	useGetV1Students,
	useGetV1StudentsId,
} from "../../../../api/endpoints/students/students";
import { ApiError } from "../../../../api/mutator/custom-instance";
import { Button } from "@alizzah/ui";
import { ConfirmDialog } from "@alizzah/ui";
import { FormField } from "@alizzah/ui";
import { useToast } from "@alizzah/ui";

export const Route = createFileRoute(
	"/_authenticated/administrasi/siklus/keluar",
)({
	component: SiswaKeluarPage,
});

function SiswaKeluarPage() {
	const navigate = useNavigate();
	const { addToast } = useToast();

	const [studentSearch, setStudentSearch] = useState("");
	const [selectedStudent, setSelectedStudent] = useState<any>(null);
	const [isConfirmOpen, setIsConfirmOpen] = useState(false);

	const [formData, setFormData] = useState({
		event_type: "transferred_out" as "transferred_out" | "dropped_out", // 'transferred_out' or 'dropped_out'
		event_date: new Date().toISOString().split("T")[0],
		notes: "",
	});

	const { data: searchResponse, isLoading: isSearchLoading } = useGetV1Students(
		{ search: studentSearch, limit: 5 },
		{ query: { enabled: studentSearch.length > 2 } },
	);

	const searchResults = (searchResponse?.data as any)?.data || [];

	const { data: studentDetailResponse } = useGetV1StudentsId(
		selectedStudent?.id || 0,
		{ query: { enabled: !!selectedStudent } },
	);

	const studentDetail = (studentDetailResponse?.data as any)?.data;
	const financialSummary = studentDetail?.financial_summary;

	const createMutation = usePostV1AcademicEventsWithdrawals({
		mutation: {
			onSuccess: () => {
				addToast({
					variant: "success",
					title: "Berhasil",
					message: `Siswa berhasil dinonaktifkan.`,
				});
				setIsConfirmOpen(false);
				navigate({ to: "/administrasi/siklus" });
			},
			onError: (error: Error) => {
				const msg =
					error instanceof ApiError
						? error.message
						: "Gagal memproses siswa keluar.";
				addToast({ variant: "error", title: "Gagal", message: msg });
				setIsConfirmOpen(false);
			},
		},
	});

	const handleOpenConfirm = (e: React.FormEvent) => {
		e.preventDefault();
		if (!selectedStudent) return;
		setIsConfirmOpen(true);
	};

	const handleConfirm = () => {
		createMutation.mutate({
			data: {
				student_id: selectedStudent.id,
				event_type: formData.event_type as any,
				event_date: `${formData.event_date}T00:00:00Z`,
				notes: formData.notes,
			},
		});
	};

	const formatRupiah = (amount: number) => {
		return new Intl.NumberFormat("id-ID", {
			style: "currency",
			currency: "IDR",
			minimumFractionDigits: 0,
		}).format(amount);
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
								Siswa Keluar
							</span>
						</div>
					</li>
				</ol>
			</nav>

			<div className="border-b border-gray-200 pb-5">
				<h2 className="text-2xl font-bold leading-7 text-gray-900 sm:truncate sm:tracking-tight">
					Siswa Keluar
				</h2>
				<p className="mt-1 text-sm text-gray-500">
					Proses penonaktifan siswa yang pindah sekolah atau berhenti.
				</p>
			</div>

			<form onSubmit={handleOpenConfirm} className="space-y-8">
				<div className="bg-white shadow-sm ring-1 ring-gray-900/5 sm:rounded-xl p-6 sm:p-8">
					<div className="grid grid-cols-1 gap-x-6 gap-y-8 sm:grid-cols-6">
						{/* Pencarian Siswa */}
						<div className="sm:col-span-6">
							<label className="block text-sm font-medium leading-6 text-gray-900 mb-2">
								Siswa *
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
										Jenis Keluar *
									</label>
									<div className="flex gap-4">
										<label className="flex items-center">
											<input
												type="radio"
												value="transferred_out"
												checked={formData.event_type === "transferred_out"}
												onChange={(e) =>
													setFormData({
														...formData,
														event_type: e.target.value as any,
													})
												}
												className="h-4 w-4 border-gray-300 text-indigo-600 focus:ring-indigo-600"
											/>
											<span className="ml-2 text-sm text-gray-900">
												Pindah Sekolah
											</span>
										</label>
										<label className="flex items-center">
											<input
												type="radio"
												value="dropped_out"
												checked={formData.event_type === "dropped_out"}
												onChange={(e) =>
													setFormData({
														...formData,
														event_type: e.target.value as any,
													})
												}
												className="h-4 w-4 border-gray-300 text-indigo-600 focus:ring-indigo-600"
											/>
											<span className="ml-2 text-sm text-gray-900">
												Keluar / Berhenti
											</span>
										</label>
									</div>
								</div>

								<div className="sm:col-span-3">
									<FormField
										id="effective_date"
										type="date"
										label="Tanggal Keluar *"
										value={formData.event_date}
										onChange={(e) =>
											setFormData({ ...formData, event_date: e.target.value })
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
										className="block w-full rounded-md border-0 py-1.5 text-gray-900 ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
										value={formData.notes}
										onChange={(e) =>
											setFormData({ ...formData, notes: e.target.value })
										}
										placeholder="Contoh: Pindah ke TK Al-Hikmah"
									/>
								</div>

								{/* Info Keuangan */}
								{financialSummary && (
									<div className="sm:col-span-6 mt-4">
										<div className="rounded-md bg-amber-50 p-4 border border-amber-200">
											<div className="flex">
												<div className="flex-shrink-0">
													<AlertTriangle
														className="h-5 w-5 text-amber-500"
														aria-hidden="true"
													/>
												</div>
												<div className="ml-3">
													<h3 className="text-sm font-medium text-amber-800">
														Perhatian Keuangan
													</h3>
													<div className="mt-2 text-sm text-amber-700 space-y-2">
														<p>
															Tagihan aktif yang belum lunas akan dibekukan
															(tidak akan di-generate tagihan baru). Riwayat
															keuangan siswa tetap dapat diakses di modul
															Keuangan.
														</p>
														<ul className="list-disc pl-5 space-y-1">
															<li>
																<span className="font-semibold">
																	Tunggakan saat ini:
																</span>{" "}
																{formatRupiah(financialSummary.total_unpaid)}
															</li>
															<li>
																<span className="font-semibold">
																	Saldo Tabungan Umum:
																</span>{" "}
																{formatRupiah(
																	financialSummary.savings_general_balance,
																)}
															</li>
															<li>
																<span className="font-semibold">
																	Saldo Tabungan Wajib:
																</span>{" "}
																{formatRupiah(
																	financialSummary.savings_mandatory_balance,
																)}
															</li>
														</ul>
													</div>
												</div>
											</div>
										</div>
									</div>
								)}
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
						variant="danger"
						disabled={!selectedStudent || createMutation.isPending}
					>
						{createMutation.isPending ? "Memproses..." : "Proses Keluar"}
					</Button>
				</div>
			</form>

			{/* Confirm Dialog */}
			<ConfirmDialog
				open={isConfirmOpen}
				onCancel={() => setIsConfirmOpen(false)}
				onConfirm={handleConfirm}
				title="Proses Siswa Keluar"
				variant="danger"
				confirmLabel="Ya, Proses Keluar"
			>
				<div className="space-y-4">
					<p>
						Anda yakin ingin menonaktifkan siswa{" "}
						<strong>{selectedStudent?.full_name}</strong>?
					</p>
					<div className="bg-red-50 p-3 rounded-md text-sm text-red-800 border border-red-200">
						<p className="font-semibold mb-1">Dampak proses ini:</p>
						<ul className="list-disc pl-5 space-y-1">
							<li>
								Status siswa akan menjadi <strong>Keluar/Pindah</strong>
							</li>
							<li>Siswa dikeluarkan dari rombel aktifnya</li>
							<li>Sistem berhenti men-generate tagihan bulanan baru</li>
							<li>
								Tagihan yang belum lunas (tunggakan) dibekukan dan tetap menjadi
								piutang
							</li>
						</ul>
					</div>
					<p className="text-sm text-gray-500">
						Tindakan ini tidak dapat dibatalkan dari menu ini.
					</p>
				</div>
			</ConfirmDialog>
		</div>
	);
}
