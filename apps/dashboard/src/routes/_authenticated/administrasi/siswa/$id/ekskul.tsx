import { useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import {
	CalendarDays,
	Eraser,
	Palette,
	Plus,
	ShieldCheck,
	Trophy,
} from "lucide-react";
import { useMemo, useState } from "react";
import { useGetV1AcademicYears } from "#/api/endpoints/academic-years/academic-years";
import {
	getV1StudentsIdExtracurricularsSeIdBillingExclusions,
	usePutV1StudentsIdExtracurricularsSeIdBillingExclusions,
} from "#/api/endpoints/billing-exclusions/billing-exclusions";
import { useGetV1Extracurriculars } from "#/api/endpoints/extracurriculars/extracurriculars";
import {
	getGetV1InvoicesQueryKey,
	useGetV1Invoices,
} from "#/api/endpoints/invoices/invoices";
import {
	getGetV1StudentsIdExtracurricularsQueryKey,
	useDeleteV1StudentsIdExtracurricularsSeId,
	useGetV1StudentsIdExtracurriculars,
	usePostV1StudentsIdExtracurriculars,
} from "#/api/endpoints/student-extracurriculars/student-extracurriculars";
import { ApiError, customInstance } from "#/api/mutator/custom-instance";
import {
	BillingMonthsDialog,
	buildAcademicYearMonths,
} from "#/components/molecules/BillingMonthsDialog";
import {
	Badge,
	Button,
	ConfirmDialog,
	SlideOver,
	useToast,
} from "#/components/ui";

export const Route = createFileRoute(
	"/_authenticated/administrasi/siswa/$id/ekskul",
)({
	component: SiswaEkskulPage,
});

function SiswaEkskulPage() {
	const { id } = Route.useParams();
	const studentId = Number(id);
	const queryClient = useQueryClient();
	const { addToast } = useToast();

	const [isFormOpen, setIsFormOpen] = useState(false);
	const [isUnenrollOpen, setIsUnenrollOpen] = useState(false);
	const [selectedSeId, setSelectedSeId] = useState<number | null>(null);
	const [selectedSeName, setSelectedSeName] = useState("");
	const [cleanupLoading, setCleanupLoading] = useState<number | null>(null);
	const [billingTarget, setBillingTarget] = useState<{
		seId: number;
		name: string;
	} | null>(null);

	const [formData, setFormData] = useState({
		extracurricular_id: 0,
		academic_year_id: 0,
		start_date: new Date().toISOString().split("T")[0],
	});

	const {
		data: response,
		isLoading,
		isError,
	} = useGetV1StudentsIdExtracurriculars(studentId);
	const studentEkskuls = (response?.data as any)?.data || [];

	const { data: ekskulResponse } = useGetV1Extracurriculars();
	const allEkskuls = (ekskulResponse?.data as any)?.data || [];

	const { data: ayResponse } = useGetV1AcademicYears();
	const academicYears = (ayResponse?.data as any)?.data || [];
	const activeYear = academicYears.find((ay: any) => ay.is_active);

	// Bulan-bulan tahun ajaran aktif (untuk grid dialog "Kelola Bulan")
	const activeYearMonths = useMemo(
		() => buildAcademicYearMonths(activeYear?.start_date, activeYear?.end_date),
		[activeYear],
	);

	// Bulan yang invoice-nya sudah ada pembayaran → checkbox disabled (item paid
	// tidak bisa dihapus backend). Approximasi per-invoice, konservatif.
	const { data: invoicesResp } = useGetV1Invoices({
		student_id: studentId,
		type: "monthly",
		limit: 60,
	});
	const paidMonthKeys = useMemo(() => {
		const keys = new Set<string>();
		const list = (invoicesResp?.data as any)?.data ?? [];
		for (const inv of list) {
			if (inv.paid_amount > 0 && inv.month && inv.year) {
				keys.add(`${inv.month}-${inv.year}`);
			}
		}
		return keys;
	}, [invoicesResp]);

	const enrollMutation = usePostV1StudentsIdExtracurriculars({
		mutation: {
			onSuccess: () => {
				addToast({
					variant: "success",
					title: "Berhasil",
					message: "Siswa berhasil didaftarkan ke PASTA.",
				});
				queryClient.invalidateQueries({
					queryKey: getGetV1StudentsIdExtracurricularsQueryKey(studentId),
				});
				setIsFormOpen(false);
				resetForm();
			},
			onError: (error: Error) => {
				const msg =
					error instanceof ApiError ? error.message : "Terjadi kesalahan";
				addToast({ variant: "error", title: "Gagal", message: msg });
			},
		},
	});

	const unenrollMutation = useDeleteV1StudentsIdExtracurricularsSeId({
		mutation: {
			onSuccess: () => {
				addToast({
					variant: "success",
					title: "Berhasil",
					message: "Siswa berhasil dicabut dari PASTA.",
				});
				queryClient.invalidateQueries({
					queryKey: getGetV1StudentsIdExtracurricularsQueryKey(studentId),
				});
				setIsUnenrollOpen(false);
				setSelectedSeId(null);
			},
			onError: (error: Error) => {
				const msg =
					error instanceof ApiError ? error.message : "Terjadi kesalahan";
				addToast({ variant: "error", title: "Gagal", message: msg });
			},
		},
	});

	const billingMutation =
		usePutV1StudentsIdExtracurricularsSeIdBillingExclusions({
			mutation: {
				onSuccess: () => {
					addToast({
						variant: "success",
						title: "Berhasil",
						message: "Daftar bulan skip tersimpan.",
					});
					queryClient.invalidateQueries({
						queryKey: getGetV1InvoicesQueryKey(),
					});
					setBillingTarget(null);
				},
				onError: (error: Error) => {
					const msg =
						error instanceof ApiError ? error.message : "Terjadi kesalahan";
					addToast({ variant: "error", title: "Gagal", message: msg });
				},
			},
		});

	const resetForm = () => {
		setFormData({
			extracurricular_id: 0,
			academic_year_id: activeYear?.id || 0,
			start_date: new Date().toISOString().split("T")[0],
		});
	};

	const handleOpenForm = () => {
		setFormData({
			extracurricular_id: 0,
			academic_year_id: activeYear?.id || 0,
			start_date: new Date().toISOString().split("T")[0],
		});
		setIsFormOpen(true);
	};

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		if (!formData.extracurricular_id || !formData.academic_year_id) {
			addToast({
				variant: "error",
				title: "Validasi",
				message: "Pilih PASTA dan tahun ajaran.",
			});
			return;
		}
		enrollMutation.mutate({
			id: studentId,
			data: formData,
		});
	};

	const handleUnenroll = (se: any) => {
		setSelectedSeId(se.id);
		setSelectedSeName(se.extracurricular?.name || "PASTA");
		setIsUnenrollOpen(true);
	};

	const confirmUnenroll = () => {
		if (selectedSeId) {
			unenrollMutation.mutate({ id: studentId, seId: selectedSeId });
		}
	};

	const handleCleanup = async (extracurricularId: number) => {
		setCleanupLoading(extracurricularId);
		try {
			await customInstance(
				`/v1/students/${studentId}/extracurriculars/${extracurricularId}/cleanup-invoices`,
				{ method: "POST" },
			);
			addToast({
				variant: "success",
				title: "Berhasil",
				message: "Tagihan PASTA berhasil dibersihkan dari invoice.",
			});
			queryClient.invalidateQueries({ queryKey: getGetV1InvoicesQueryKey() });
		} catch (error: any) {
			const msg =
				error instanceof ApiError ? error.message : "Terjadi kesalahan";
			addToast({ variant: "error", title: "Gagal", message: msg });
		} finally {
			setCleanupLoading(null);
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
				Gagal memuat data ekstrakurikuler.
			</div>
		);
	}

	const isMandatoryType = (type: string) =>
		type === "calisan" || type === "ekskul";

	const isMandatoryPasta = (name: string) =>
		name === "Aslin (Asah Literasi Numerasi)";

	const mandatoryItems = studentEkskuls.filter(
		(se: any) =>
			isMandatoryType(se.extracurricular?.type) ||
			isMandatoryPasta(se.extracurricular?.name),
	);
	const optionalItems = studentEkskuls.filter(
		(se: any) =>
			!isMandatoryType(se.extracurricular?.type) &&
			!isMandatoryPasta(se.extracurricular?.name),
	);

	const getEkskulTypeBadge = (type: string) => {
		switch (type?.toLowerCase()) {
			case "pasta":
				return <Badge className="bg-blue-100 text-blue-700">PASTA</Badge>;
			case "calisan":
				return (
					<Badge className="bg-emerald-100 text-emerald-700">CALISAN</Badge>
				);
			case "ekskul":
				return <Badge className="bg-purple-100 text-purple-700">EKSKUL</Badge>;
			default:
				return <Badge variant="secondary">{type}</Badge>;
		}
	};

	const formatDate = (dateStr: string) => {
		return new Date(dateStr).toLocaleDateString("id-ID", {
			day: "numeric",
			month: "long",
			year: "numeric",
		});
	};

	// Form dropdown: only show pasta (optional) items, exclude already-enrolled + mandatory (Aslin)
	const enrolledIds = studentEkskuls
		.filter((se: any) => !se.end_date)
		.map((se: any) => se.extracurricular?.id);
	const availablePasta = allEkskuls.filter(
		(e: any) =>
			e.type === "pasta" &&
			!enrolledIds.includes(e.id) &&
			!isMandatoryPasta(e.name),
	);

	return (
		<>
			<div className="space-y-6">
				{/* === Kegiatan Wajib === */}
				<div className="bg-white rounded-xl shadow-sm ring-1 ring-gray-900/5 overflow-hidden">
					<div className="px-4 py-5 sm:px-6 border-b border-gray-200">
						<div className="flex items-center gap-2">
							<ShieldCheck className="h-5 w-5 text-emerald-600" />
							<div>
								<h3 className="text-base font-semibold leading-6 text-gray-900">
									Kegiatan Wajib
								</h3>
								<p className="mt-0.5 text-sm text-gray-500">
									Aslin dan pasta wajib lainnya yang otomatis terdaftar sesuai
									jenjang.
								</p>
							</div>
						</div>
					</div>

					<div className="p-0">
						{mandatoryItems.length === 0 ? (
							<div className="p-8 text-center text-gray-500">
								<p className="text-sm">
									Belum ada kegiatan wajib yang terdaftar.
								</p>
							</div>
						) : (
							<ul className="divide-y divide-gray-100">
								{mandatoryItems.map((se: any) => (
									<li key={se.id} className="px-4 py-4 sm:px-6">
										<div className="flex items-center justify-between">
											<div className="flex items-center gap-x-3">
												{getEkskulTypeBadge(se.extracurricular?.type)}
												<div>
													<h4 className="text-sm font-semibold text-gray-900">
														{se.extracurricular?.name}
													</h4>
													<p className="text-xs text-gray-500 mt-0.5">
														Sejak {formatDate(se.start_date)}
													</p>
												</div>
											</div>
											<Badge className="bg-emerald-50 text-emerald-700 ring-1 ring-emerald-600/20">
												Wajib
											</Badge>
										</div>
									</li>
								))}
							</ul>
						)}
					</div>
				</div>

				{/* === PASTA (Opsional) === */}
				<div className="bg-white rounded-xl shadow-sm ring-1 ring-gray-900/5 overflow-hidden">
					<div className="px-4 py-5 sm:px-6 border-b border-gray-200 flex justify-between items-center">
						<div className="flex items-center gap-2">
							<Palette className="h-5 w-5 text-blue-600" />
							<div>
								<h3 className="text-base font-semibold leading-6 text-gray-900">
									PASTA (Tambahan)
								</h3>
								<p className="mt-0.5 text-sm text-gray-500">
									Kegiatan pilihan yang bisa diikuti siswa.
								</p>
							</div>
						</div>
						<Button
							size="sm"
							onClick={handleOpenForm}
							className="flex items-center gap-1.5"
						>
							<Plus className="h-4 w-4" />
							Tambah PASTA
						</Button>
					</div>

					<div className="p-0">
						{optionalItems.length === 0 ? (
							<div className="p-8 text-center text-gray-500">
								<Trophy className="mx-auto h-7 w-7 text-gray-300 mb-2" />
								<p className="text-sm">Siswa belum mengikuti PASTA apapun.</p>
							</div>
						) : (
							<ul className="divide-y divide-gray-100">
								{optionalItems.map((se: any) => {
									const isActive = !se.end_date;
									return (
										<li
											key={se.id}
											className="px-4 py-4 sm:px-6 hover:bg-gray-50 transition-colors"
										>
											<div className="flex items-center justify-between">
												<div className="flex items-center gap-x-3">
													{getEkskulTypeBadge(se.extracurricular?.type)}
													<div>
														<h4 className="text-sm font-semibold text-gray-900">
															{se.extracurricular?.name}
														</h4>
														<p className="text-xs text-gray-500 mt-0.5">
															Sejak {formatDate(se.start_date)}
															{se.end_date
																? ` s/d ${formatDate(se.end_date)}`
																: ""}
														</p>
													</div>
												</div>
												<div className="flex items-center gap-2">
													{isActive ? (
														<>
															<Badge variant="success">Aktif</Badge>
															<Button
																variant="ghost"
																size="sm"
																className="text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50"
																onClick={() =>
																	setBillingTarget({
																		seId: se.id,
																		name: se.extracurricular?.name || "PASTA",
																	})
																}
																title="Atur bulan yang tagihannya di-skip"
															>
																<CalendarDays className="h-4 w-4" />
																Kelola Bulan
															</Button>
															<Button
																variant="ghost"
																size="sm"
																className="text-red-600 hover:text-red-700 hover:bg-red-50"
																onClick={() => handleUnenroll(se)}
															>
																Berhenti
															</Button>
														</>
													) : (
														<>
															<Badge variant="secondary">Tidak Aktif</Badge>
															<Button
																variant="ghost"
																size="sm"
																className="text-amber-600 hover:text-amber-700 hover:bg-amber-50"
																disabled={
																	cleanupLoading === se.extracurricular?.id
																}
																onClick={() =>
																	handleCleanup(se.extracurricular?.id)
																}
																title="Bersihkan tagihan PASTA ini dari invoice"
															>
																<Eraser className="h-4 w-4" />
															</Button>
														</>
													)}
												</div>
											</div>
										</li>
									);
								})}
							</ul>
						)}
					</div>
				</div>
			</div>

			{/* Enrollment Form — hanya PASTA */}
			<SlideOver
				isOpen={isFormOpen}
				onClose={() => setIsFormOpen(false)}
				title="Tambah PASTA"
				footer={
					<>
						<Button
							variant="secondary"
							onClick={() => setIsFormOpen(false)}
							disabled={enrollMutation.isPending}
						>
							Batal
						</Button>
						<Button
							variant="primary"
							onClick={handleSubmit}
							disabled={enrollMutation.isPending}
						>
							{enrollMutation.isPending ? "Menyimpan..." : "Daftarkan"}
						</Button>
					</>
				}
			>
				<form onSubmit={handleSubmit} className="space-y-6">
					<div>
						<label className="block text-sm font-medium leading-6 text-gray-900 mb-2">
							Pilih PASTA <span className="text-red-500">*</span>
						</label>
						{availablePasta.length === 0 ? (
							<p className="text-sm text-gray-500">
								Semua PASTA sudah terdaftar untuk siswa ini.
							</p>
						) : (
							<select
								value={formData.extracurricular_id}
								onChange={(e) =>
									setFormData({
										...formData,
										extracurricular_id: Number(e.target.value),
									})
								}
								className="block w-full rounded-md border-0 py-1.5 text-gray-900 ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-indigo-600 sm:text-sm sm:leading-6"
								required
							>
								<option value={0}>-- Pilih PASTA --</option>
								{availablePasta.map((e: any) => (
									<option key={e.id} value={e.id}>
										{e.name}
									</option>
								))}
							</select>
						)}
					</div>

					<div>
						<label className="block text-sm font-medium leading-6 text-gray-900 mb-2">
							Tahun Ajaran <span className="text-red-500">*</span>
						</label>
						<select
							value={formData.academic_year_id}
							onChange={(e) =>
								setFormData({
									...formData,
									academic_year_id: Number(e.target.value),
								})
							}
							className="block w-full rounded-md border-0 py-1.5 text-gray-900 ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-indigo-600 sm:text-sm sm:leading-6"
							required
						>
							<option value={0}>-- Pilih Tahun Ajaran --</option>
							{academicYears.map((ay: any) => (
								<option key={ay.id} value={ay.id}>
									{ay.name} {ay.is_active ? "(Aktif)" : ""}
								</option>
							))}
						</select>
					</div>

					<div>
						<label className="block text-sm font-medium leading-6 text-gray-900 mb-2">
							Tanggal Mulai <span className="text-red-500">*</span>
						</label>
						<input
							type="date"
							value={formData.start_date}
							onChange={(e) =>
								setFormData({ ...formData, start_date: e.target.value })
							}
							className="block w-full rounded-md border-0 py-1.5 text-gray-900 ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-indigo-600 sm:text-sm sm:leading-6"
							required
						/>
					</div>

					<div className="rounded-md bg-blue-50 p-4">
						<p className="text-sm text-blue-700">
							Tagihan PASTA akan otomatis ditambahkan ke invoice bulanan siswa
							mulai bulan yang dipilih hingga akhir tahun ajaran.
						</p>
					</div>
				</form>
			</SlideOver>

			{/* Unenroll Confirmation — hanya untuk PASTA */}
			<ConfirmDialog
				open={isUnenrollOpen}
				onCancel={() => {
					setIsUnenrollOpen(false);
					setSelectedSeId(null);
				}}
				onConfirm={confirmUnenroll}
				title="Berhenti PASTA"
				variant="danger"
			>
				<p>
					Anda yakin ingin menghentikan siswa dari{" "}
					<strong>{selectedSeName}</strong>? Tagihan bulan ini ke depan yang
					belum dibayar akan otomatis dihapus.
				</p>
			</ConfirmDialog>

			{/* Dialog Kelola Bulan — skip tagihan bulanan PASTA */}
			<BillingMonthsDialog
				open={!!billingTarget}
				onClose={() => setBillingTarget(null)}
				title={
					billingTarget
						? `Kelola Bulan — ${billingTarget.name}`
						: "Kelola Bulan"
				}
				description="Bulan yang dicentang tetap ditagihkan untuk PASTA ini. Bulan yang tidak dicentang di-skip (tidak ditagih). Enrollment siswa tetap aktif."
				months={activeYearMonths}
				paidKeys={paidMonthKeys}
				loadExclusions={async () => {
					if (!billingTarget) return [];
					const res =
						await getV1StudentsIdExtracurricularsSeIdBillingExclusions(
							studentId,
							billingTarget.seId,
						);
					return res.data.data.months ?? [];
				}}
				saveExclusions={async (months) => {
					if (!billingTarget) return;
					await billingMutation.mutateAsync({
						id: studentId,
						seId: billingTarget.seId,
						data: { months },
					});
				}}
			/>
		</>
	);
}
