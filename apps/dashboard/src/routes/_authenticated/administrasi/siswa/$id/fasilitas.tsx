import { useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useAtom } from "jotai";
import { Bus, CalendarDays, Plus, X } from "lucide-react";
import { useMemo, useState } from "react";
import {
	getV1StudentsIdFacilitiesFacilityIdBillingExclusions,
	usePutV1StudentsIdFacilitiesFacilityIdBillingExclusions,
} from "#/api/endpoints/billing-exclusions/billing-exclusions";
import {
	getGetV1StudentsIdFacilitiesQueryKey,
	useDeleteV1StudentsIdFacilitiesFacilityId,
	useGetV1Facilities,
	useGetV1StudentsIdFacilities,
	usePostV1StudentsIdFacilities,
} from "#/api/endpoints/facilities/facilities";
import {
	useGetV1FeeConfigs,
	useGetV1FeeConfigsIdItems,
} from "#/api/endpoints/fee-configs/fee-configs";
import {
	getGetV1InvoicesQueryKey,
	useGetV1Invoices,
} from "#/api/endpoints/invoices/invoices";
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
import { academicYearAtom } from "../../../../../store/global";
import { formatDate } from "../../../../../utils/format";

export const Route = createFileRoute(
	"/_authenticated/administrasi/siswa/$id/fasilitas",
)({
	component: SiswaFasilitasPage,
});

function SiswaFasilitasPage() {
	const { id } = Route.useParams();
	const studentId = Number(id);
	const queryClient = useQueryClient();
	const { addToast } = useToast();
	const [activeAy] = useAtom(academicYearAtom);

	const [isFormOpen, setIsFormOpen] = useState(false);
	const [selectedFacilityId, setSelectedFacilityId] = useState("");
	const [selectedZoneId, setSelectedZoneId] = useState("");
	const [startDate, setStartDate] = useState(
		new Date().toISOString().split("T")[0],
	);
	const [deletingItem, setDeletingItem] = useState<any>(null);
	const [billingTarget, setBillingTarget] = useState<{
		sfId: number;
		name: string;
	} | null>(null);

	const { data: sfResp, isLoading } = useGetV1StudentsIdFacilities(
		studentId,
		{ academic_year_id: activeAy?.id },
		{ query: { enabled: !!activeAy?.id } } as any,
	);
	const studentFacilities: any[] = ((sfResp as any)?.data as any)?.data || [];

	// Bulan-bulan tahun ajaran aktif (untuk grid dialog "Kelola Bulan")
	const activeYearMonths = useMemo(
		() => buildAcademicYearMonths(activeAy?.start_date, activeAy?.end_date),
		[activeAy],
	);

	// Bulan yang invoice-nya sudah ada pembayaran → checkbox disabled
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

	const { data: masterResp } = useGetV1Facilities();
	const allFacilities: any[] = ((masterResp as any)?.data as any)?.data || [];

	// Fetch active fee config and its items for zone dropdown
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

	// Filter zone items for the selected facility
	const selectedFacility = allFacilities.find(
		(f: any) => String(f.id) === selectedFacilityId,
	);
	const zones = useMemo(() => {
		if (!selectedFacility) return [];
		const slug = selectedFacility.name.toLowerCase().replace(/\s+/g, "_");
		const prefix = `facility_${slug}_`;
		return allFeeItems.filter(
			(item: any) => item.item_key && String(item.item_key).startsWith(prefix),
		);
	}, [selectedFacility, allFeeItems]);

	// Reset zone when facility changes
	const handleFacilityChange = (facilityId: string) => {
		setSelectedFacilityId(facilityId);
		setSelectedZoneId("");
	};

	// Filter out already enrolled
	const enrolledIds = new Set(
		studentFacilities
			.filter((sf: any) => !sf.end_date)
			.map((sf: any) => sf.facility.id),
	);
	const availableFacilities = allFacilities.filter(
		(f: any) => f.is_active && !enrolledIds.has(f.id),
	);

	const invalidate = () =>
		queryClient.invalidateQueries({
			queryKey: getGetV1StudentsIdFacilitiesQueryKey(studentId, {
				academic_year_id: activeAy?.id,
			}),
		});

	const enrollMutation = usePostV1StudentsIdFacilities({
		mutation: {
			onSuccess: () => {
				addToast({
					variant: "success",
					title: "Berhasil",
					message: "Siswa berhasil didaftarkan ke fasilitas.",
				});
				invalidate();
				setIsFormOpen(false);
			},
			onError: (err: any) =>
				addToast({ variant: "error", title: "Gagal", message: err.message }),
		},
	});

	const unenrollMutation = useDeleteV1StudentsIdFacilitiesFacilityId({
		mutation: {
			onSuccess: () => {
				addToast({
					variant: "success",
					title: "Berhasil",
					message: "Siswa berhasil dilepas dari fasilitas.",
				});
				invalidate();
				setDeletingItem(null);
			},
			onError: (err: any) =>
				addToast({ variant: "error", title: "Gagal", message: err.message }),
		},
	});

	const billingMutation =
		usePutV1StudentsIdFacilitiesFacilityIdBillingExclusions({
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
				onError: (err: any) =>
					addToast({ variant: "error", title: "Gagal", message: err.message }),
			},
		});

	const handleEnroll = (e: React.FormEvent) => {
		e.preventDefault();
		if (!selectedFacilityId || !activeAy?.id) return;
		const payload: any = {
			facility_id: Number(selectedFacilityId),
			academic_year_id: activeAy.id,
			start_date: startDate,
		};
		if (selectedZoneId) {
			payload.fee_config_item_id = Number(selectedZoneId);
		}
		enrollMutation.mutate({
			id: studentId,
			data: payload,
		});
	};

	const formatPrice = (amount: number) =>
		new Intl.NumberFormat("id-ID", {
			style: "currency",
			currency: "IDR",
			minimumFractionDigits: 0,
		}).format(amount);

	return (
		<div className="space-y-6">
			<div className="flex items-center justify-between">
				<h3 className="text-lg font-semibold text-gray-900">
					Fasilitas Terdaftar
				</h3>
				<Button
					variant="primary"
					onClick={() => {
						setSelectedFacilityId("");
						setSelectedZoneId("");
						setIsFormOpen(true);
					}}
					disabled={availableFacilities.length === 0}
				>
					<Plus className="w-4 h-4 mr-2" /> Tambah Fasilitas
				</Button>
			</div>

			{isLoading ? (
				<div className="animate-pulse space-y-3">
					{[1, 2].map((n) => (
						<div key={n} className="h-14 bg-gray-200 rounded-lg" />
					))}
				</div>
			) : studentFacilities.length === 0 ? (
				<div className="text-center py-8 text-gray-500">
					<Bus className="w-10 h-10 text-gray-300 mx-auto mb-2" />
					<p className="text-sm">Siswa belum terdaftar di fasilitas apapun.</p>
				</div>
			) : (
				<div className="space-y-3">
					{studentFacilities.map((sf: any) => (
						<div
							key={sf.id}
							className={`flex items-center justify-between p-4 rounded-lg border ${sf.end_date ? "bg-gray-50 border-gray-200" : "bg-white border-indigo-200"}`}
						>
							<div className="flex items-center gap-3">
								<Bus
									className={`w-5 h-5 ${sf.end_date ? "text-gray-400" : "text-indigo-500"}`}
								/>
								<div>
									<p className="text-sm font-medium text-gray-900">
										{sf.facility.name}
									</p>
									<p className="text-xs text-gray-500">
										{sf.fee_config_item && (
											<>
												{sf.fee_config_item.name} (
												{formatPrice(sf.fee_config_item.amount)}) &bull;{" "}
											</>
										)}
										Mulai: {formatDate(sf.start_date)}
										{sf.end_date && (
											<> &bull; Berakhir: {formatDate(sf.end_date)}</>
										)}
									</p>
								</div>
							</div>
							<div className="flex items-center gap-2">
								{sf.end_date ? (
									<Badge variant="danger">Nonaktif</Badge>
								) : (
									<>
										<Badge variant="success">Aktif</Badge>
										<Button
											variant="ghost"
											size="sm"
											className="text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50"
											onClick={() =>
												setBillingTarget({
													sfId: sf.id,
													name: sf.facility?.name || "Fasilitas",
												})
											}
											title="Atur bulan yang tagihannya di-skip"
										>
											<CalendarDays className="w-4 h-4" />
											Kelola Bulan
										</Button>
										<button
											type="button"
											onClick={() => setDeletingItem(sf)}
											className="p-1 rounded text-gray-400 hover:text-rose-600 hover:bg-rose-50"
											title="Lepas dari fasilitas"
										>
											<X className="w-4 h-4" />
										</button>
									</>
								)}
							</div>
						</div>
					))}
				</div>
			)}

			{/* Enroll Form */}
			<SlideOver
				isOpen={isFormOpen}
				onClose={() => setIsFormOpen(false)}
				title="Tambah Fasilitas"
			>
				<form onSubmit={handleEnroll} className="flex h-full flex-col bg-white">
					<div className="flex-1 overflow-y-auto px-4 py-6 sm:px-6 space-y-6">
						<div>
							<label className="block text-sm font-medium text-gray-900 mb-2">
								Pilih Fasilitas
							</label>
							<select
								value={selectedFacilityId}
								onChange={(e) => handleFacilityChange(e.target.value)}
								className="block w-full rounded-md border-0 py-1.5 text-gray-900 ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-indigo-600 sm:text-sm sm:leading-6"
							>
								<option value="">— Pilih fasilitas —</option>
								{availableFacilities.map((f: any) => (
									<option key={f.id} value={f.id}>
										{f.name}
									</option>
								))}
							</select>
							{availableFacilities.length === 0 && (
								<p className="mt-1 text-xs text-amber-600">
									Semua fasilitas sudah terdaftar untuk siswa ini.
								</p>
							)}
						</div>

						{/* Zone selector — appears when facility is selected and has zones */}
						{zones.length > 0 && (
							<div>
								<label className="block text-sm font-medium text-gray-900 mb-2">
									Zona / Paket
								</label>
								<select
									value={selectedZoneId}
									onChange={(e) => setSelectedZoneId(e.target.value)}
									className="block w-full rounded-md border-0 py-1.5 text-gray-900 ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-indigo-600 sm:text-sm sm:leading-6"
								>
									<option value="">— Pilih zona (opsional) —</option>
									{zones.map((z: any) => (
										<option key={z.id} value={z.id}>
											{z.name} — {formatPrice(z.amount)}
											{z.unit === "per_day" ? " /hari" : ""}
										</option>
									))}
								</select>
							</div>
						)}

						{selectedFacilityId &&
							zones.length === 0 &&
							allFeeItems.length > 0 && (
								<p className="text-xs text-gray-400">
									Fasilitas ini belum memiliki opsi zona/paket. Zona dapat
									ditambahkan di halaman detail fasilitas.
								</p>
							)}

						<div>
							<label className="block text-sm font-medium text-gray-900 mb-2">
								Tanggal Mulai
							</label>
							<input
								type="date"
								value={startDate}
								onChange={(e) => setStartDate(e.target.value)}
								className="block w-full rounded-md border-0 py-1.5 px-3 text-gray-900 ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-indigo-600 sm:text-sm sm:leading-6"
								required
							/>
						</div>
					</div>
					<div className="flex-shrink-0 border-t border-gray-200 px-4 py-5 sm:px-6 flex justify-end gap-3">
						<Button
							type="button"
							variant="secondary"
							onClick={() => setIsFormOpen(false)}
						>
							Batal
						</Button>
						<Button
							type="submit"
							variant="primary"
							disabled={!selectedFacilityId || enrollMutation.isPending}
						>
							{enrollMutation.isPending ? "Menyimpan..." : "Daftarkan"}
						</Button>
					</div>
				</form>
			</SlideOver>

			{/* Confirm Unenroll */}
			<ConfirmDialog
				open={!!deletingItem}
				onCancel={() => setDeletingItem(null)}
				onConfirm={() =>
					deletingItem &&
					unenrollMutation.mutate({
						id: studentId,
						facilityId: deletingItem.id,
					})
				}
				title="Lepas Fasilitas"
				variant="danger"
				confirmLabel="Lepas"
			>
				Apakah Anda yakin ingin melepas siswa dari fasilitas{" "}
				<strong>{deletingItem?.facility?.name}</strong>? Item tagihan terkait
				yang belum dibayar akan dihapus dari tagihan bulan ini ke depan.
			</ConfirmDialog>

			{/* Dialog Kelola Bulan — skip tagihan bulanan fasilitas */}
			<BillingMonthsDialog
				open={!!billingTarget}
				onClose={() => setBillingTarget(null)}
				title={
					billingTarget
						? `Kelola Bulan — ${billingTarget.name}`
						: "Kelola Bulan"
				}
				description="Bulan yang dicentang tetap ditagihkan untuk fasilitas ini. Bulan yang tidak dicentang di-skip (tidak ditagih). Enrollment siswa tetap aktif."
				months={activeYearMonths}
				paidKeys={paidMonthKeys}
				loadExclusions={async () => {
					if (!billingTarget) return [];
					const res =
						await getV1StudentsIdFacilitiesFacilityIdBillingExclusions(
							studentId,
							billingTarget.sfId,
						);
					return res.data.data.months ?? [];
				}}
				saveExclusions={async (months) => {
					if (!billingTarget) return;
					await billingMutation.mutateAsync({
						id: studentId,
						facilityId: billingTarget.sfId,
						data: { months },
					});
				}}
			/>
		</div>
	);
}
