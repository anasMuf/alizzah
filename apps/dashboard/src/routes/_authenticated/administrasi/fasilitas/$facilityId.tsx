import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useAtom } from "jotai";
import {
	ArrowLeft,
	Bus,
	Edit2,
	Plus,
	Search,
	Trash2,
	UserX,
} from "lucide-react";
import { useMemo, useState } from "react";

import {
	getGetV1FacilitiesIdStudentsQueryKey,
	useDeleteV1StudentsIdFacilitiesFacilityId,
	useGetV1Facilities,
	useGetV1FacilitiesIdStudents,
	usePostV1StudentsIdFacilities,
} from "#/api/endpoints/facilities/facilities";
import {
	getGetV1FeeConfigsIdItemsQueryKey,
	useDeleteV1FeeConfigsIdItemsItemId,
	useGetV1FeeConfigs,
	useGetV1FeeConfigsIdItems,
	usePostV1FeeConfigsIdItems,
	usePutV1FeeConfigsIdItemsItemId,
} from "#/api/endpoints/fee-configs/fee-configs";
import { useGetV1Students } from "#/api/endpoints/students/students";
import type {
	DtoFacilityResponse,
	DtoFacilityStudentItemResponse,
} from "#/api/model";
import { customInstance } from "#/api/mutator/custom-instance";
import {
	Badge,
	Button,
	ConfirmDialog,
	CurrencyFormField,
	EmptyState,
	FormField,
	PageLoading,
	Pagination,
	SlideOver,
	useToast,
} from "#/components/ui";
import { academicYearAtom } from "#/store/global";

export const Route = createFileRoute(
	"/_authenticated/administrasi/fasilitas/$facilityId",
)({
	component: FacilityDetailPage,
	validateSearch: (params: Record<string, unknown>) => ({
		page:
			typeof params.page === "string"
				? Number(params.page) || undefined
				: undefined,
		search:
			typeof params.search === "string" && params.search
				? params.search
				: undefined,
	}),
});

function FacilityDetailPage() {
	const navigate = useNavigate();
	const queryClient = useQueryClient();
	const { addToast } = useToast();
	const [activeAy] = useAtom(academicYearAtom);

	const { facilityId } = Route.useParams();
	const { page: rawPage, search: searchParam } = Route.useSearch();
	const page = rawPage ?? 1;
	const search = searchParam ?? "";
	const [searchInput, setSearchInput] = useState(search);
	const [deletingItem, setDeletingItem] =
		useState<DtoFacilityStudentItemResponse | null>(null);

	const id = Number(facilityId);

	// Fetch facility detail
	const { data: facilityResp, isLoading: facilityLoading } =
		useGetV1Facilities();
	const facilities: DtoFacilityResponse[] =
		((facilityResp as any)?.data as any)?.data || [];
	const facility = facilities.find((f: DtoFacilityResponse) => f.id === id);

	// Fetch active fee config for zone management
	const { data: fcResp } = useGetV1FeeConfigs({
		query: { staleTime: 5 * 60 * 1000 },
	});
	const feeConfigs: any[] = (fcResp?.data as any)?.data || [];
	const activeFeeConfig = feeConfigs.find(
		(fc: any) => fc.academic_year?.id === activeAy?.id,
	);
	const feeConfigId = activeFeeConfig?.id;

	const { data: itemsResp } = useGetV1FeeConfigsIdItems(
		feeConfigId || 0,
		{ category: "facility" },
		{ query: { enabled: !!feeConfigId } },
	);
	const allFeeItems: any[] = (itemsResp?.data as any)?.data || [];

	// Filter zones for this facility
	const facilitySlug =
		(facility?.name || "").toLowerCase().replace(/\s+/g, "_") || "";
	const zonePrefix = `facility_${facilitySlug}_`;
	const zones = useMemo(
		() =>
			allFeeItems.filter(
				(item: any) =>
					item.item_key && String(item.item_key).startsWith(zonePrefix),
			),
		[allFeeItems, zonePrefix],
	);

	// Zone CRUD
	const [isZoneFormOpen, setIsZoneFormOpen] = useState(false);
	const [editingZone, setEditingZone] = useState<any>(null);
	const [deletingZone, setDeletingZone] = useState<any>(null);
	const [zoneName, setZoneName] = useState("");
	const [zoneAmount, setZoneAmount] = useState(0);

	const zoneCreateMutation = usePostV1FeeConfigsIdItems({
		mutation: {
			onSuccess: () => {
				addToast({
					variant: "success",
					title: "Berhasil",
					message: "Zona berhasil ditambahkan.",
				});
				queryClient.invalidateQueries({
					queryKey: getGetV1FeeConfigsIdItemsQueryKey(feeConfigId, {
						category: "facility",
					}),
				});
				closeZoneForm();
			},
			onError: (err: any) =>
				addToast({ variant: "error", title: "Gagal", message: err.message }),
		},
	});

	const zoneUpdateMutation = usePutV1FeeConfigsIdItemsItemId({
		mutation: {
			onSuccess: () => {
				addToast({
					variant: "success",
					title: "Berhasil",
					message: "Zona berhasil diperbarui.",
				});
				queryClient.invalidateQueries({
					queryKey: getGetV1FeeConfigsIdItemsQueryKey(feeConfigId, {
						category: "facility",
					}),
				});
				closeZoneForm();
			},
			onError: (err: any) =>
				addToast({ variant: "error", title: "Gagal", message: err.message }),
		},
	});

	const zoneDeleteMutation = useDeleteV1FeeConfigsIdItemsItemId({
		mutation: {
			onSuccess: () => {
				addToast({
					variant: "success",
					title: "Berhasil",
					message: "Zona berhasil dihapus.",
				});
				queryClient.invalidateQueries({
					queryKey: getGetV1FeeConfigsIdItemsQueryKey(feeConfigId, {
						category: "facility",
					}),
				});
				setDeletingZone(null);
			},
			onError: (err: any) =>
				addToast({ variant: "error", title: "Gagal", message: err.message }),
		},
	});

	// Edit enrollment zone
	const [editingEnrollmentId, setEditingEnrollmentId] = useState<number | null>(
		null,
	);
	const editEnrollmentMutation = useMutation({
		mutationFn: async ({
			studentId,
			sfId,
			feeConfigItemId,
		}: {
			studentId: number;
			sfId: number;
			feeConfigItemId: number | null;
		}) => {
			return customInstance(`/v1/students/${studentId}/facilities/${sfId}`, {
				method: "PUT",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ fee_config_item_id: feeConfigItemId }),
			});
		},
		onSuccess: () => {
			addToast({
				variant: "success",
				title: "Berhasil",
				message: "Zona berhasil diubah.",
			});
			queryClient.invalidateQueries({
				queryKey: getGetV1FacilitiesIdStudentsQueryKey(id, {
					academic_year_id: activeAy?.id,
				}),
			});
			setEditingEnrollmentId(null);
		},
		onError: (err: any) =>
			addToast({ variant: "error", title: "Gagal", message: err.message }),
	});

	// Override jumlah hari
	const [editingDaysSfId, setEditingDaysSfId] = useState<number | null>(null);
	const [editingDaysValue, setEditingDaysValue] = useState("");

	const saveDaysMutation = useMutation({
		mutationFn: async ({
			invoiceId,
			itemId,
			quantity,
		}: {
			invoiceId: number;
			itemId: number;
			quantity: number;
		}) => {
			return customInstance(
				`/v1/invoices/${invoiceId}/items/${itemId}/quantity`,
				{
					method: "PUT",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({ quantity }),
				},
			);
		},
		onSuccess: () => {
			addToast({
				variant: "success",
				title: "Berhasil",
				message: "Jumlah hari berhasil diubah.",
			});
			queryClient.invalidateQueries({
				queryKey: getGetV1FacilitiesIdStudentsQueryKey(id, {
					academic_year_id: activeAy?.id,
				}),
			});
			setEditingDaysSfId(null);
		},
		onError: (err: any) =>
			addToast({ variant: "error", title: "Gagal", message: err.message }),
	});

	// Enroll student from facility detail
	const [isEnrollOpen, setIsEnrollOpen] = useState(false);
	const [enrollStudentSearch, setEnrollStudentSearch] = useState("");
	const [selectedStudent, setSelectedStudent] = useState<any>(null);
	const [enrollZoneId, setEnrollZoneId] = useState(0);
	const [enrollStartDate, setEnrollStartDate] = useState(
		new Date().toISOString().split("T")[0],
	);

	const { data: studentsSearchResp, isLoading: isSearchLoading } =
		useGetV1Students(
			{ search: enrollStudentSearch || undefined, status: "active", limit: 5 },
			{
				query: { enabled: isEnrollOpen && enrollStudentSearch.length > 2 },
			},
		);
	const searchResults: any[] =
		((studentsSearchResp as any)?.data as any)?.data || [];

	const enrollMutation = usePostV1StudentsIdFacilities({
		mutation: {
			onSuccess: () => {
				addToast({
					variant: "success",
					title: "Berhasil",
					message: "Siswa berhasil didaftarkan.",
				});
				queryClient.invalidateQueries({
					queryKey: getGetV1FacilitiesIdStudentsQueryKey(id, {
						academic_year_id: activeAy?.id,
					}),
				});
				closeEnrollForm();
			},
			onError: (err: any) =>
				addToast({ variant: "error", title: "Gagal", message: err.message }),
		},
	});

	const openEnrollForm = () => {
		setEnrollStudentSearch("");
		setSelectedStudent(null);
		setEnrollZoneId(0);
		setEnrollStartDate(new Date().toISOString().split("T")[0]);
		setIsEnrollOpen(true);
	};
	const closeEnrollForm = () => setIsEnrollOpen(false);

	const handleEnrollSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		if (!selectedStudent || !activeAy?.id) return;
		enrollMutation.mutate({
			id: selectedStudent.id,
			data: {
				facility_id: id,
				academic_year_id: activeAy.id,
				fee_config_item_id: enrollZoneId || undefined,
				start_date: enrollStartDate,
			} as any,
		});
	};

	const openAddZone = () => {
		setZoneName("");
		setZoneAmount(0);
		setEditingZone(null);
		setIsZoneFormOpen(true);
	};
	const openEditZone = (z: any) => {
		setZoneName(z.name);
		setZoneAmount(z.amount);
		setEditingZone(z);
		setIsZoneFormOpen(true);
	};
	const closeZoneForm = () => {
		setIsZoneFormOpen(false);
		setEditingZone(null);
	};
	const handleZoneSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		if (!zoneName.trim() || zoneAmount <= 0) return;

		const itemKey = `${zonePrefix}${zoneName.toLowerCase().replace(/\s+/g, "_")}`;
		const payload: any = {
			name: zoneName.trim(),
			item_key: itemKey,
			category: "facility",
			amount: zoneAmount,
			unit: "per_day",
			level: "all",
			gender: "all",
			is_active: true,
		};

		if (editingZone) {
			zoneUpdateMutation.mutate({
				id: feeConfigId,
				itemId: editingZone.id,
				data: { ...payload, item_key: editingZone.item_key },
			});
		} else {
			zoneCreateMutation.mutate({ id: feeConfigId, data: payload });
		}
	};

	// Fetch students enrolled (using Orval-generated hook)
	const { data: studentsResp, isLoading: studentsLoading } =
		useGetV1FacilitiesIdStudents(
			id,
			{
				academic_year_id: activeAy?.id,
				page,
				limit: 15,
				search: search || undefined,
			},
			{ query: { enabled: !!activeAy?.id && !!id } },
		);

	const studentsData = ((studentsResp as any)?.data as any)?.data?.data as
		| DtoFacilityStudentItemResponse[]
		| undefined;
	const meta = ((studentsResp as any)?.data as any)?.data?.meta as
		| { page: number; limit: number; total: number }
		| undefined;

	const isLoading = facilityLoading || studentsLoading;

	const deleteMutation = useDeleteV1StudentsIdFacilitiesFacilityId({
		mutation: {
			onSuccess: () => {
				addToast({
					variant: "success",
					title: "Berhasil",
					message: "Siswa berhasil dilepas dari fasilitas.",
				});
				queryClient.invalidateQueries({
					queryKey: getGetV1FacilitiesIdStudentsQueryKey(id, {
						academic_year_id: activeAy?.id,
					}),
				});
				setDeletingItem(null);
			},
			onError: (err: any) =>
				addToast({ variant: "error", title: "Gagal", message: err.message }),
		},
	});

	const handleSearch = () => {
		navigate({
			from: Route.fullPath,
			search: { page: undefined, search: searchInput || undefined } as any,
			replace: true,
		});
	};

	const handlePageChange = (newPage: number) => {
		navigate({
			from: Route.fullPath,
			search: {
				page: newPage > 1 ? newPage : undefined,
				search: search || undefined,
			} as any,
			replace: true,
		});
	};

	const formatPrice = (amount: number) =>
		new Intl.NumberFormat("id-ID", {
			style: "currency",
			currency: "IDR",
			minimumFractionDigits: 0,
		}).format(amount);

	const formatDate = (dateStr: string) => {
		const d = new Date(dateStr);
		return d.toLocaleDateString("id-ID", {
			day: "2-digit",
			month: "short",
			year: "numeric",
		});
	};

	if (isLoading) {
		return <PageLoading />;
	}

	if (!facility) {
		return (
			<div className="space-y-6">
				<Link
					to="/administrasi/fasilitas"
					className="inline-flex items-center text-sm text-indigo-600 hover:text-indigo-800"
				>
					<ArrowLeft className="w-4 h-4 mr-1" /> Kembali ke daftar fasilitas
				</Link>
				<EmptyState
					title="Fasilitas tidak ditemukan"
					description="Fasilitas yang Anda cari tidak tersedia atau sudah dihapus."
				/>
			</div>
		);
	}

	return (
		<div className="space-y-6">
			{/* Header */}
			<div>
				<Link
					to="/administrasi/fasilitas"
					className="inline-flex items-center text-sm text-indigo-600 hover:text-indigo-800 mb-3"
				>
					<ArrowLeft className="w-4 h-4 mr-1" /> Kembali ke daftar fasilitas
				</Link>
				<div className="flex items-center gap-3">
					<div className="flex-shrink-0 w-10 h-10 rounded-lg bg-indigo-100 flex items-center justify-center">
						<Bus className="w-5 h-5 text-indigo-600" />
					</div>
					<div>
						<h1 className="text-2xl font-bold text-gray-900">
							{facility.name}
						</h1>
						{facility.description && (
							<p className="text-sm text-gray-500">{facility.description}</p>
						)}
					</div>
					<Badge variant={facility.is_active ? "success" : "secondary"}>
						{facility.is_active ? "Aktif" : "Nonaktif"}
					</Badge>
				</div>
			</div>

			{/* Zone / Package Management */}
			<div className="bg-white rounded-xl shadow-sm ring-1 ring-gray-900/5 p-4">
				<div className="flex items-center justify-between mb-4">
					<h3 className="text-base font-semibold text-gray-900">
						Zona / Paket Harga
					</h3>
					<Button
						variant="primary"
						onClick={openAddZone}
						disabled={!feeConfigId}
					>
						<Plus className="w-4 h-4 mr-2" /> Tambah Zona
					</Button>
				</div>

				{!feeConfigId ? (
					<p className="text-sm text-gray-400">
						Tidak ada konfigurasi tarif aktif. Zona tidak dapat dikelola.
					</p>
				) : zones.length === 0 ? (
					<p className="text-sm text-gray-500 py-3">
						Belum ada zona. Tambahkan zona untuk memberikan opsi harga saat
						mendaftarkan siswa ke fasilitas ini.
					</p>
				) : (
					<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
						{zones.map((z: any) => (
							<div
								key={z.id}
								className="flex items-center justify-between p-3 rounded-lg border border-gray-200 bg-gray-50"
							>
								<div>
									<p className="text-sm font-medium text-gray-900">{z.name}</p>
									<p className="text-xs text-gray-500">
										{formatPrice(z.amount)}
										{z.unit === "per_day" ? " /hari" : ""}
									</p>
								</div>
								<div className="flex gap-1">
									<button
										type="button"
										onClick={() => openEditZone(z)}
										className="p-1 text-gray-400 hover:text-indigo-600 rounded"
										title="Edit zona"
									>
										<Edit2 className="w-3.5 h-3.5" />
									</button>
									<button
										type="button"
										onClick={() => setDeletingZone(z)}
										className="p-1 text-gray-400 hover:text-rose-600 rounded"
										title="Hapus zona"
									>
										<Trash2 className="w-3.5 h-3.5" />
									</button>
								</div>
							</div>
						))}
					</div>
				)}
			</div>

			{/* Students section */}
			<div>
				<div className="flex items-center justify-between mb-3">
					<h3 className="text-base font-semibold text-gray-900">
						Siswa Terdaftar
					</h3>
					<div className="flex items-center gap-3">
						<span className="text-sm text-gray-500">
							Total:{" "}
							<span className="font-semibold text-gray-900">
								{meta?.total ?? 0}
							</span>
						</span>
						<Button variant="primary" onClick={openEnrollForm}>
							<Plus className="w-4 h-4 mr-2" /> Tambah Siswa
						</Button>
					</div>
				</div>

				{/* Filter bar */}
				<div className="bg-white p-4 rounded-xl shadow-sm ring-1 ring-gray-900/5 flex gap-4 mb-4">
					<div className="relative w-full sm:max-w-xs">
						<div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
							<Search className="h-5 w-5 text-gray-400" />
						</div>
						<input
							type="text"
							value={searchInput}
							onChange={(e) => setSearchInput(e.target.value)}
							onKeyDown={(e) => {
								if (e.key === "Enter") handleSearch();
							}}
							placeholder="Cari nama siswa..."
							className="block w-full rounded-md border-0 py-2 pl-10 text-gray-900 ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
						/>
					</div>
					<Button variant="secondary" onClick={handleSearch}>
						Cari
					</Button>
					{search && (
						<button
							type="button"
							onClick={() => {
								setSearchInput("");
								navigate({
									from: Route.fullPath,
									search: { page: undefined, search: undefined } as any,
									replace: true,
								});
							}}
							className="text-sm text-gray-500 hover:text-gray-700"
						>
							Reset
						</button>
					)}
				</div>

				{!studentsData || studentsData.length === 0 ? (
					<EmptyState
						title="Belum ada siswa terdaftar"
						description={
							search
								? `Tidak ada siswa dengan nama "${search}" di fasilitas ini.`
								: "Daftarkan siswa melalui halaman detail siswa."
						}
					/>
				) : (
					<div className="bg-white rounded-xl shadow-sm ring-1 ring-gray-900/5 overflow-x-auto">
						<table className="min-w-full divide-y divide-gray-200">
							<thead className="bg-gray-50">
								<tr>
									<th className="py-3 px-4 text-left text-xs font-semibold text-gray-900">
										Nama
									</th>
									<th className="py-3 px-4 text-left text-xs font-semibold text-gray-900">
										Zona / Paket
									</th>
									<th className="py-3 px-4 text-left text-xs font-semibold text-gray-900">
										Mulai
									</th>
									<th className="py-3 px-4 text-center text-xs font-semibold text-gray-900">
										Jumlah Hari
									</th>
									<th className="py-3 px-4 text-center text-xs font-semibold text-gray-900">
										Status
									</th>
									<th className="py-3 px-4 text-right text-xs font-semibold text-gray-900">
										Aksi
									</th>
								</tr>
							</thead>
							<tbody className="divide-y divide-gray-100">
								{studentsData.map((sf) => (
									<tr key={sf.id} className="hover:bg-gray-50">
										<td className="py-3 px-4">
											<div className="text-sm font-medium text-gray-900">
												{sf.student?.full_name}
											</div>
											<div className="text-xs text-gray-500">
												{sf.student?.gender === "L" ? "Laki-laki" : "Perempuan"}
											</div>
										</td>
										<td className="py-3 px-4 text-sm text-gray-500">
											{editingEnrollmentId === sf.id ? (
												<div className="flex items-center gap-1">
													<select
														value={sf.fee_config_item?.id ?? ""}
														onChange={(e) => {
															const val = e.target.value;
															editEnrollmentMutation.mutate({
																studentId: sf.student?.id ?? 0,
																sfId: sf.id ?? 0,
																feeConfigItemId: val ? Number(val) : null,
															});
														}}
														className="block w-full rounded border-0 py-0.5 text-xs ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-indigo-600"
													>
														<option value="">Tanpa zona</option>
														{zones.map((z: any) => (
															<option key={z.id} value={z.id}>
																{z.name} ({formatPrice(z.amount)})
															</option>
														))}
													</select>
													<button
														type="button"
														onClick={() => setEditingEnrollmentId(null)}
														className="text-xs text-gray-400 hover:text-gray-600"
													>
														Batal
													</button>
												</div>
											) : (
												<span className="inline-flex items-center gap-1">
													{sf.fee_config_item ? (
														<>
															<span>{sf.fee_config_item.name}</span>
															<span className="text-xs text-gray-400">
																({formatPrice(sf.fee_config_item.amount ?? 0)})
															</span>
														</>
													) : (
														"-"
													)}
													{!sf.end_date && (
														<button
															type="button"
															onClick={() =>
																setEditingEnrollmentId(sf.id ?? null)
															}
															className="p-0.5 text-gray-400 hover:text-indigo-600 rounded"
															title="Ubah zona"
														>
															<Edit2 className="w-3 h-3" />
														</button>
													)}
												</span>
											)}
										</td>
										<td className="py-3 px-4 text-sm text-gray-500">
											{sf.start_date ? formatDate(sf.start_date) : "-"}
										</td>
										<td className="py-3 px-4 text-sm text-center">
											{editingDaysSfId === sf.id ? (
												<div className="flex items-center justify-center gap-1">
													<input
														type="number"
														min={1}
														value={editingDaysValue}
														onChange={(e) =>
															setEditingDaysValue(e.target.value)
														}
														className="w-16 rounded border-0 py-0.5 text-center text-xs ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-indigo-600"
													/>
													<button
														type="button"
														onClick={async () => {
															const qty = Number(editingDaysValue);
															if (qty <= 0) return;
															const resp = await customInstance<{ data: any }>(
																`/v1/students/${sf.student?.id}/facilities/${sf.id}/current-month-days`,
															);
															const info = (resp as any).data?.data;
															if (info?.invoice_item_id && info?.invoice_id) {
																saveDaysMutation.mutate({
																	invoiceId: info.invoice_id,
																	itemId: info.invoice_item_id,
																	quantity: qty,
																});
															}
														}}
														className="text-xs text-indigo-600 hover:text-indigo-800"
													>
														Simpan
													</button>
													<button
														type="button"
														onClick={() => setEditingDaysSfId(null)}
														className="text-xs text-gray-400 hover:text-gray-600"
													>
														Batal
													</button>
												</div>
											) : (
												<span className="inline-flex items-center gap-1">
													{(sf as any).current_month_days != null
														? (sf as any).current_month_days
														: "—"}
													{!sf.end_date && (
														<button
															type="button"
															onClick={() => {
																setEditingDaysSfId(sf.id ?? null);
																setEditingDaysValue(
																	String((sf as any).current_month_days ?? 0),
																);
															}}
															className="p-0.5 text-gray-400 hover:text-indigo-600 rounded"
															title="Ubah jumlah hari"
														>
															<Edit2 className="w-3 h-3" />
														</button>
													)}
												</span>
											)}
										</td>
										<td className="py-3 px-4 text-sm text-center">
											<span
												className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
													sf.end_date
														? "bg-gray-100 text-gray-500"
														: "bg-green-100 text-green-700"
												}`}
											>
												{sf.end_date ? "Berhenti" : "Aktif"}
											</span>
										</td>
										<td className="py-3 px-4 text-right">
											{!sf.end_date && (
												<button
													type="button"
													onClick={() => setDeletingItem(sf)}
													className="inline-flex items-center gap-1 text-xs font-medium text-rose-600 hover:text-rose-800"
												>
													<UserX className="w-3.5 h-3.5" />
													Lepas
												</button>
											)}
										</td>
									</tr>
								))}
							</tbody>
						</table>

						{meta && (
							<Pagination
								page={meta.page}
								limit={meta.limit}
								total={meta.total}
								onPageChange={handlePageChange}
							/>
						)}
					</div>
				)}
			</div>

			{/* Zone form SlideOver */}
			<SlideOver
				isOpen={isZoneFormOpen}
				onClose={closeZoneForm}
				title={editingZone ? "Edit Zona" : "Tambah Zona"}
			>
				<form
					onSubmit={handleZoneSubmit}
					className="flex h-full flex-col bg-white"
				>
					<div className="flex-1 overflow-y-auto px-4 py-6 sm:px-6 space-y-6">
						<FormField
							id="zoneName"
							label="Nama Zona"
							value={zoneName}
							onChange={(e: any) => setZoneName(e.target.value)}
							required
							placeholder="Contoh: Zona 1"
						/>
						<CurrencyFormField
							id="zoneAmount"
							label="Biaya (Rp)"
							value={zoneAmount}
							onChange={setZoneAmount}
							showSymbol
							placeholder="Contoh: 10.000"
						/>
						<p className="text-xs text-gray-400 -mt-3">
							Biaya per hari. Unit otomatis <code>per_day</code>.
						</p>
					</div>
					<div className="flex-shrink-0 border-t border-gray-200 px-4 py-5 sm:px-6 flex justify-end gap-3">
						<Button type="button" variant="secondary" onClick={closeZoneForm}>
							Batal
						</Button>
						<Button
							type="submit"
							variant="primary"
							disabled={
								!zoneName.trim() ||
								zoneAmount <= 0 ||
								zoneCreateMutation.isPending ||
								zoneUpdateMutation.isPending
							}
						>
							{editingZone
								? zoneUpdateMutation.isPending
									? "Menyimpan..."
									: "Simpan"
								: zoneCreateMutation.isPending
									? "Menambah..."
									: "Tambah"}
						</Button>
					</div>
				</form>
			</SlideOver>

			{/* Confirm Unenroll Student */}
			<ConfirmDialog
				open={!!deletingItem}
				onCancel={() => setDeletingItem(null)}
				onConfirm={() => {
					if (!deletingItem) return;
					deleteMutation.mutate({
						id: deletingItem.student?.id ?? 0,
						facilityId: deletingItem.id ?? 0,
					});
				}}
				title="Lepas Siswa dari Fasilitas"
				variant="danger"
				confirmLabel="Lepas"
			>
				Apakah Anda yakin ingin melepas{" "}
				<strong>{deletingItem?.student?.full_name}</strong> dari fasilitas{" "}
				<strong>{facility.name}</strong>?
			</ConfirmDialog>

			{/* Confirm Delete Zone */}
			<ConfirmDialog
				open={!!deletingZone}
				onCancel={() => setDeletingZone(null)}
				onConfirm={() => {
					if (!deletingZone || !feeConfigId) return;
					zoneDeleteMutation.mutate({
						id: feeConfigId,
						itemId: deletingZone.id,
					});
				}}
				title="Hapus Zona"
				variant="danger"
				confirmLabel="Hapus"
			>
				Apakah Anda yakin ingin menghapus zona{" "}
				<strong>{deletingZone?.name}</strong>?
			</ConfirmDialog>

			{/* Enroll Student SlideOver */}
			<SlideOver
				isOpen={isEnrollOpen}
				onClose={closeEnrollForm}
				title={`Tambah Siswa ke ${facility?.name}`}
			>
				<form
					onSubmit={handleEnrollSubmit}
					className="flex h-full flex-col bg-white"
				>
					<div className="flex-1 overflow-y-auto px-4 py-6 sm:px-6 space-y-6">
						{/* Student search */}
						{!selectedStudent ? (
							<div className="relative">
								<label className="block text-sm font-medium text-gray-900 mb-2">
									Pilih Siswa
								</label>
								<div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 pt-7">
									<Search className="h-5 w-5 text-gray-400" />
								</div>
								<input
									type="text"
									className="block w-full rounded-md border-0 py-2 pl-10 text-gray-900 ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
									placeholder="Ketik minimal 3 huruf nama siswa..."
									value={enrollStudentSearch}
									onChange={(e) => setEnrollStudentSearch(e.target.value)}
								/>
								{enrollStudentSearch.length > 2 && (
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
													onClick={() => {
														setSelectedStudent(student);
														setEnrollStudentSearch(student.full_name);
													}}
												>
													<div className="flex items-center">
														<span className="ml-3 block truncate font-medium text-gray-900">
															{student.full_name}{" "}
															<span className="text-gray-500 font-normal">
																(
																{student.gender === "L"
																	? "Laki-laki"
																	: "Perempuan"}
																)
															</span>
														</span>
													</div>
													{student.active_enrollment && (
														<div className="ml-6 text-xs text-gray-400">
															{student.active_enrollment.class_group?.name ||
																""}
														</div>
													)}
												</div>
											))
										)}
									</div>
								)}
							</div>
						) : (
							<div className="flex items-center justify-between p-4 border border-indigo-200 bg-indigo-50 rounded-lg">
								<div>
									<p className="text-sm font-medium text-gray-900">
										{selectedStudent.full_name}
									</p>
									<p className="text-xs text-gray-500">
										{selectedStudent.gender === "L" ? "Laki-laki" : "Perempuan"}
										{selectedStudent.active_enrollment?.class_group?.name && (
											<>
												{" "}
												&bull;{" "}
												{selectedStudent.active_enrollment.class_group.name}
											</>
										)}
									</p>
								</div>
								<Button
									type="button"
									variant="secondary"
									onClick={() => {
										setSelectedStudent(null);
										setEnrollStudentSearch("");
									}}
								>
									Ganti
								</Button>
							</div>
						)}

						{/* Zone selector */}
						{zones.length > 0 && (
							<div>
								<label className="block text-sm font-medium text-gray-900 mb-2">
									Zona / Paket
								</label>
								<select
									value={enrollZoneId}
									onChange={(e) => setEnrollZoneId(Number(e.target.value))}
									className="block w-full rounded-md border-0 py-1.5 text-gray-900 ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-indigo-600 sm:text-sm sm:leading-6"
								>
									<option value={0}>— Tanpa zona —</option>
									{zones.map((z: any) => (
										<option key={z.id} value={z.id}>
											{z.name} — {formatPrice(z.amount)}
										</option>
									))}
								</select>
							</div>
						)}

						{/* Start date */}
						<div>
							<label className="block text-sm font-medium text-gray-900 mb-2">
								Tanggal Mulai
							</label>
							<input
								type="date"
								value={enrollStartDate}
								onChange={(e) => setEnrollStartDate(e.target.value)}
								className="block w-full rounded-md border-0 py-1.5 px-3 text-gray-900 ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-indigo-600 sm:text-sm sm:leading-6"
								required
							/>
						</div>
					</div>
					<div className="flex-shrink-0 border-t border-gray-200 px-4 py-5 sm:px-6 flex justify-end gap-3">
						<Button type="button" variant="secondary" onClick={closeEnrollForm}>
							Batal
						</Button>
						<Button
							type="submit"
							variant="primary"
							disabled={!selectedStudent || enrollMutation.isPending}
						>
							{enrollMutation.isPending ? "Mendaftarkan..." : "Daftarkan"}
						</Button>
					</div>
				</form>
			</SlideOver>
		</div>
	);
}
